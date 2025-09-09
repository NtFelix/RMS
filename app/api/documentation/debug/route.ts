import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check table existence and basic info
    const { data: tableInfo, error: tableError } = await supabase
      .from('Dokumentation')
      .select('count', { count: 'exact', head: true });

    if (tableError) {
      return NextResponse.json({
        status: 'error',
        message: 'Table access failed',
        error: tableError.message,
        code: tableError.code
      });
    }

    // Get sample of articles
    const { data: articles, error: articlesError } = await supabase
      .from('Dokumentation')
      .select('id, titel, kategorie')
      .limit(5);

    if (articlesError) {
      return NextResponse.json({
        status: 'error',
        message: 'Failed to fetch articles',
        error: articlesError.message,
        code: articlesError.code
      });
    }

    // Get categories
    const { data: categories, error: categoriesError } = await supabase
      .from('Dokumentation')
      .select('kategorie')
      .not('kategorie', 'is', null);

    const uniqueCategories = categories 
      ? [...new Set(categories.map(c => c.kategorie))]
      : [];

    return NextResponse.json({
      status: 'success',
      tableExists: true,
      articleCount: tableInfo?.length || 0,
      sampleArticles: articles || [],
      categories: uniqueCategories,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}