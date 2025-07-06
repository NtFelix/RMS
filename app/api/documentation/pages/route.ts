import { NextResponse } from 'next/server';
import { getDatabasePages } from '../../../../lib/notion-service'; // Adjust path as necessary

export async function GET() {
  try {
    const pages = await getDatabasePages();
    return NextResponse.json(pages);
  } catch (error) {
    console.error('API Error fetching database pages:', error);
    // Check if the error is an instance of Error to safely access message property
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: 'Failed to fetch documentation pages', details: errorMessage }, { status: 500 });
  }
}
