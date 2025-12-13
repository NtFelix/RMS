import { createClient } from '@/utils/supabase/client';
import { createSupabaseServerClient as createServerClient } from "@/lib/supabase-server";
import type { DokumentationRecord } from '@/types/documentation';

/**
 * Client-side Supabase client for documentation queries
 */
export function getDocumentationClient() {
  return createClient();
}

/**
 * Server-side Supabase client for documentation queries
 */
export async function getDocumentationServerClient() {
  return await createServerClient();
}

/**
 * Type-safe query builder for Dokumentation table
 */
export class DocumentationQueryBuilder {
  private client: ReturnType<typeof createClient>;

  constructor(client: ReturnType<typeof createClient>) {
    this.client = client;
  }

  /**
   * Get all documentation records
   */
  getAll() {
    return this.client
      .from('Dokumentation')
      .select('*')
      .returns<DokumentationRecord[]>();
  }

  /**
   * Get documentation by ID
   */
  getById(id: string) {
    return this.client
      .from('Dokumentation')
      .select('*')
      .eq('id', id)
      .single()
      .returns<DokumentationRecord>();
  }

  /**
   * Get documentation by category
   */
  getByCategory(kategorie: string) {
    return this.client
      .from('Dokumentation')
      .select('*')
      .eq('kategorie', kategorie)
      .order('titel', { ascending: true })
      .returns<DokumentationRecord[]>();
  }

  /**
   * Get all unique categories with counts
   */
  getCategories() {
    return this.client
      .from('Dokumentation')
      .select('kategorie')
      .not('kategorie', 'is', null)
      .returns<{ kategorie: string }[]>();
  }

  /**
   * Full-text search across titel and seiteninhalt
   */
  search(query: string) {
    return this.client
      .from('Dokumentation')
      .select('*')
      .textSearch('titel,seiteninhalt', query, {
        type: 'websearch',
        config: 'german'
      })
      .returns<DokumentationRecord[]>();
  }

  /**
   * Search with PostgreSQL full-text search using custom query
   */
  searchWithRanking(query: string) {
    return this.client.rpc('search_documentation', {
      search_query: query
    }).returns<(DokumentationRecord & { relevance_score: number })[]>();
  }
}

/**
 * Create a new documentation query builder
 */
export function createDocumentationQueryBuilder(client?: ReturnType<typeof createClient>) {
  const supabaseClient = client || getDocumentationClient();
  return new DocumentationQueryBuilder(supabaseClient);
}