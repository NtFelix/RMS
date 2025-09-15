export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createDocumentationService } from "@/lib/documentation-service";

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
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

    const documentationService = createDocumentationService(true);
    const results = await documentationService.searchArticles(query.trim());

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