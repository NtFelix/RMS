export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createDocumentationService } from "@/lib/documentation-service";

export async function GET() {
  try {
    const documentationService = createDocumentationService(true);
    const categories = await documentationService.getCategories();

    return NextResponse.json(categories, { status: 200 });
  } catch (error) {
    console.error('GET /api/documentation/categories error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Kategorien.' },
      { status: 500 }
    );
  }
}