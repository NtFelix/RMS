import { NextResponse } from 'next/server';
import { getDatabasePages } from '../../../../lib/notion-service';

export async function GET() {
  try {
    const pages = await getDatabasePages();
    return NextResponse.json(pages);
  } catch (error) {
    console.error('Failed to fetch database pages:', error);
    return NextResponse.json({ message: 'Failed to fetch database pages', error: (error as Error).message }, { status: 500 });
  }
}
