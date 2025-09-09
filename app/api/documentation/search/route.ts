export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createDocumentationService } from "@/lib/documentation-service";

// Rate limiting for search (more restrictive)
const SEARCH_RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const SEARCH_RATE_LIMIT_MAX_REQUESTS = 30;
const searchRequestCounts = new Map<string, { count: number; resetTime: number }>();

function checkSearchRateLimit(clientId: string): boolean {
  const now = Date.now();
  const clientData = searchRequestCounts.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    searchRequestCounts.set(clientId, {
      count: 1,
      resetTime: now + SEARCH_RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (clientData.count >= SEARCH_RATE_LIMIT_MAX_REQUESTS) {
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
    if (!checkSearchRateLimit(clientId)) {
      return NextResponse.json(
        { 
          error: 'Zu viele Suchanfragen. Bitte warten Sie einen Moment.',
          retryAfter: 60 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': SEARCH_RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
          }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Validate search query
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Suchbegriff ist erforderlich.' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();

    // Validate query length
    if (trimmedQuery.length < 2) {
      return NextResponse.json(
        { error: 'Suchbegriff muss mindestens 2 Zeichen lang sein.' },
        { status: 400 }
      );
    }

    if (trimmedQuery.length > 100) {
      return NextResponse.json(
        { error: 'Suchbegriff ist zu lang. Maximal 100 Zeichen erlaubt.' },
        { status: 400 }
      );
    }

    // Check for potentially harmful patterns
    const harmfulPatterns = [
      /[<>]/g, // HTML tags
      /javascript:/gi, // JavaScript protocol
      /data:/gi, // Data protocol
      /vbscript:/gi, // VBScript protocol
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(trimmedQuery)) {
        return NextResponse.json(
          { error: 'Ungültiger Suchbegriff.' },
          { status: 400 }
        );
      }
    }

    const documentationService = createDocumentationService(true);
    const searchResults = await documentationService.searchArticles(trimmedQuery);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      searchResults, 
      { 
        status: 200,
        headers: {
          'X-Response-Time': responseTime.toString(),
          'Cache-Control': 'public, max-age=120, stale-while-revalidate=300', // 2 min cache, 5 min stale
        }
      }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('GET /api/documentation/search error:', {
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
            error: 'Such-Timeout. Bitte versuchen Sie es mit einem kürzeren Suchbegriff.',
            retryable: true 
          },
          { status: 504 }
        );
      }
      
      if (error.message.includes('connection') || error.message.includes('network')) {
        return NextResponse.json(
          { 
            error: 'Verbindungsfehler bei der Suche. Bitte versuchen Sie es erneut.',
            retryable: true 
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Fehler bei der Suche. Bitte versuchen Sie es erneut.',
        retryable: true 
      },
      { status: 500 }
    );
  }
}