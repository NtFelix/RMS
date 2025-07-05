import { NextResponse } from 'next/server';
import { getDatabasePages } from '../../../../lib/notion-service'; // Adjust path as needed

export async function GET() {
  try {
    const pages = await getDatabasePages();
    return NextResponse.json(pages);
  } catch (error) {
    console.error('Failed to fetch documentation pages:', error);
    // It's important to check the type of error if you want to return specific details
    // For now, a generic error message.
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch documentation pages', details: errorMessage }, { status: 500 });
  }
}
