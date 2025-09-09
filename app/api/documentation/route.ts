export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createDocumentationService } from "@/lib/documentation-service";
import type { DocumentationFilters } from "@/types/documentation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const filters: DocumentationFilters = {
      kategorie: searchParams.get('kategorie') || undefined,
      searchQuery: searchParams.get('q') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const documentationService = createDocumentationService(true);
    const articles = await documentationService.getAllArticles(filters);

    return NextResponse.json(articles, { status: 200 });
  } catch (error) {
    console.error('GET /api/documentation error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Dokumentation.' },
      { status: 500 }
    );
  }
}