import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const { articleId } = await params;

    if (!articleId) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // First check if the table exists and has data
    const { data: tableCheck, error: tableError } = await supabase
      .from('Dokumentation')
      .select('count', { count: 'exact', head: true });

    if (tableError) {
      console.error('Table access error:', tableError);
      return NextResponse.json(
        { error: 'Documentation system is not available' },
        { status: 503 }
      );
    }

    const { data: article, error } = await supabase
      .from('Dokumentation')
      .select('id, titel, kategorie, seiteninhalt, meta')
      .eq('id', articleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 }
        );
      }
      
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch article' },
        { status: 500 }
      );
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}