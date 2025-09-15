export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createDocumentationService } from "@/lib/documentation-service";
import type { DocumentationFilters } from "@/types/documentation";

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientData = requestCounts.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  clientData.count++;
  return true;
}

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { 
          error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
          retryAfter: 60 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil((Date.now() + RATE_LIMIT_WINDOW) / 1000).toString(),
          }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Validate and parse query parameters
    const filters: DocumentationFilters = {};
    
    const kategorie = searchParams.get('kategorie');
    if (kategorie && kategorie.trim()) {
      filters.kategorie = kategorie.trim();
    }
    
    const searchQuery = searchParams.get('q');
    if (searchQuery && searchQuery.trim()) {
      if (searchQuery.length > 100) {
        return NextResponse.json(
          { error: 'Suchbegriff ist zu lang. Maximal 100 Zeichen erlaubt.' },
          { status: 400 }
        );
      }
      filters.searchQuery = searchQuery.trim();
    }
    
    const limit = searchParams.get('limit');
    if (limit) {
      const parsedLimit = parseInt(limit);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return NextResponse.json(
          { error: 'Ungültiger Limit-Parameter. Muss zwischen 1 und 100 liegen.' },
          { status: 400 }
        );
      }
      filters.limit = parsedLimit;
    }
    
    const offset = searchParams.get('offset');
    if (offset) {
      const parsedOffset = parseInt(offset);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return NextResponse.json(
          { error: 'Ungültiger Offset-Parameter. Muss >= 0 sein.' },
          { status: 400 }
        );
      }
      filters.offset = parsedOffset;
    }

    const documentationService = createDocumentationService(true);
    const articles = await documentationService.getAllArticles(filters);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      articles, 
      { 
        status: 200,
        headers: {
          'X-Response-Time': responseTime.toString(),
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600', // 5 min cache, 10 min stale
        }
      }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('GET /api/dokumentation error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      responseTime,
      url: request.url,
    });

    // Determine error type and appropriate response
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        return NextResponse.json(
          { 
            error: 'Anfrage-Timeout. Bitte versuchen Sie es erneut.',
            retryable: true 
          },
          { status: 504 }
        );
      }
      
      if (error.message.includes('connection') || error.message.includes('network')) {
        return NextResponse.json(
          { 
            error: 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
            retryable: true 
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Fehler beim Abrufen der Dokumentation. Bitte versuchen Sie es erneut.',
        retryable: true 
      },
      { status: 500 }
    );
  }
}