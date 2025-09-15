export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createDocumentationService } from "@/lib/documentation-service";

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // Lower limit for search to prevent abuse
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

// Helper function to sanitize search query
function sanitizeQuery(query: string): string {
  // Remove potentially harmful patterns
  return query
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/[%_]/g, '\\$&'); // Escape SQL wildcards
}

// Validate query for suspicious patterns
function isValidQuery(query: string): boolean {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /eval\s*\(/i,
    /expression\s*\(/i,
  ];
  
  return !suspiciousPatterns.some(pattern => pattern.test(query));
}
export a
sync function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { 
          error: 'Zu viele Suchanfragen. Bitte versuchen Sie es später erneut.',
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
    const query = searchParams.get('q');

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: 'Suchbegriff ist erforderlich' },
        { status: 400 }
      );
    }

    if (query.length > 100) {
      return NextResponse.json(
        { error: 'Suchbegriff ist zu lang. Maximal 100 Zeichen erlaubt.' },
        { status: 400 }
      );
    }

    // Validate query for suspicious patterns
    if (!isValidQuery(query)) {
      return NextResponse.json(
        { error: 'Ungültiger Suchbegriff. Bitte verwenden Sie nur Text ohne spezielle Zeichen.' },
        { status: 400 }
      );
    }

    // Sanitize the query
    const sanitizedQuery = sanitizeQuery(query);

    const documentationService = createDocumentationService(true);
    const results = await documentationService.searchArticles(sanitizedQuery);

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      results, 
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
    console.error('GET /api/dokumentation/search error:', {
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
            error: 'Such-Timeout. Bitte versuchen Sie es erneut.',
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
        error: 'Fehler bei der Suche. Bitte versuchen Sie es erneut.',
        retryable: true 
      },
      { status: 500 }
    );
  }
}