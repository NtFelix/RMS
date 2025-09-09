export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createDocumentationService } from "@/lib/documentation-service";

export async function GET() {
  const startTime = Date.now();
  
  try {
    const documentationService = createDocumentationService(true);
    const categories = await documentationService.getCategories();

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      categories, 
      { 
        status: 200,
        headers: {
          'X-Response-Time': responseTime.toString(),
          'Cache-Control': 'public, max-age=600, stale-while-revalidate=1200', // 10 min cache, 20 min stale
        }
      }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('GET /api/documentation/categories error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      responseTime,
    });

    // Determine error type and appropriate response
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        return NextResponse.json(
          { 
            error: 'Timeout beim Laden der Kategorien. Bitte versuchen Sie es erneut.',
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
        error: 'Fehler beim Abrufen der Kategorien. Bitte versuchen Sie es erneut.',
        retryable: true 
      },
      { status: 500 }
    );
  }
}