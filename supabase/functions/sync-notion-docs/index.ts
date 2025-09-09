import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SyncMonitor, performHealthCheck } from './monitoring.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotionPage {
  id: string;
  properties: {
    Name: { title: Array<{ plain_text: string }> };
    Kategorie: { select: { name: string } | null };
    [key: string]: any;
  };
  content: string;
}

interface SyncResult {
  success: boolean;
  processed: number;
  errors: string[];
  message: string;
}

interface NotionDatabase {
  results: Array<{
    id: string;
    properties: Record<string, any>;
    created_time: string;
    last_edited_time: string;
    created_by: any;
    last_edited_by: any;
  }>;
}

interface NotionBlocksResponse {
  results: Array<{
    type: string;
    [key: string]: any;
  }>;
}

class NotionSyncService {
  private notionToken: string;
  private databaseId: string;
  private supabase: any;
  private monitor: SyncMonitor;

  constructor(notionToken: string, databaseId: string, supabaseUrl: string, supabaseKey: string) {
    this.notionToken = notionToken;
    this.databaseId = databaseId;
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Initialize monitoring with alert configuration
    const alertConfig = {
      enableAlerts: true,
      webhookUrl: Deno.env.get('SYNC_ALERT_WEBHOOK_URL'),
      slackChannel: Deno.env.get('SYNC_ALERT_SLACK_CHANNEL')
    };
    this.monitor = new SyncMonitor(supabaseUrl, supabaseKey, alertConfig);
  }

  private async fetchNotionDatabase(): Promise<NotionDatabase> {
    const response = await fetch(`https://api.notion.com/v1/databases/${this.databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Notion database: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async fetchPageContent(pageId: string): Promise<string> {
    try {
      const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
        headers: {
          'Authorization': `Bearer ${this.notionToken}`,
          'Notion-Version': '2022-06-28',
        },
      });

      if (!response.ok) {
        console.warn(`Failed to fetch content for page ${pageId}: ${response.status}`);
        return '';
      }

      const blocks: NotionBlocksResponse = await response.json();
      return this.extractTextFromBlocks(blocks.results);
    } catch (error) {
      console.warn(`Error fetching content for page ${pageId}:`, error);
      return '';
    }
  }

  private extractTextFromBlocks(blocks: any[]): string {
    let content = '';
    
    for (const block of blocks) {
      switch (block.type) {
        case 'paragraph':
          if (block.paragraph?.rich_text) {
            content += this.extractRichText(block.paragraph.rich_text) + '\n\n';
          }
          break;
        case 'heading_1':
          if (block.heading_1?.rich_text) {
            content += '# ' + this.extractRichText(block.heading_1.rich_text) + '\n\n';
          }
          break;
        case 'heading_2':
          if (block.heading_2?.rich_text) {
            content += '## ' + this.extractRichText(block.heading_2.rich_text) + '\n\n';
          }
          break;
        case 'heading_3':
          if (block.heading_3?.rich_text) {
            content += '### ' + this.extractRichText(block.heading_3.rich_text) + '\n\n';
          }
          break;
        case 'bulleted_list_item':
          if (block.bulleted_list_item?.rich_text) {
            content += '- ' + this.extractRichText(block.bulleted_list_item.rich_text) + '\n';
          }
          break;
        case 'numbered_list_item':
          if (block.numbered_list_item?.rich_text) {
            content += '1. ' + this.extractRichText(block.numbered_list_item.rich_text) + '\n';
          }
          break;
        case 'code':
          if (block.code?.rich_text) {
            const language = block.code.language || '';
            content += '```' + language + '\n' + this.extractRichText(block.code.rich_text) + '\n```\n\n';
          }
          break;
        case 'quote':
          if (block.quote?.rich_text) {
            content += '> ' + this.extractRichText(block.quote.rich_text) + '\n\n';
          }
          break;
        default:
          // Handle other block types as plain text if they have rich_text
          if (block[block.type]?.rich_text) {
            content += this.extractRichText(block[block.type].rich_text) + '\n';
          }
      }
    }
    
    return content.trim();
  }

  private extractRichText(richText: any[]): string {
    return richText
      .map((text: any) => {
        let content = text.plain_text || '';
        
        // Apply formatting
        if (text.annotations?.bold) content = `**${content}**`;
        if (text.annotations?.italic) content = `*${content}*`;
        if (text.annotations?.code) content = `\`${content}\``;
        if (text.annotations?.strikethrough) content = `~~${content}~~`;
        
        // Handle links
        if (text.href) content = `[${content}](${text.href})`;
        
        return content;
      })
      .join('');
  }

  private extractPropertyValue(property: any): any {
    if (!property) return null;

    switch (property.type) {
      case 'title':
        return property.title?.map((t: any) => t.plain_text).join('') || '';
      case 'rich_text':
        return property.rich_text?.map((t: any) => t.plain_text).join('') || '';
      case 'select':
        return property.select?.name || null;
      case 'multi_select':
        return property.multi_select?.map((s: any) => s.name) || [];
      case 'date':
        return property.date?.start || null;
      case 'number':
        return property.number;
      case 'checkbox':
        return property.checkbox;
      case 'url':
        return property.url;
      case 'email':
        return property.email;
      case 'phone_number':
        return property.phone_number;
      case 'people':
        return property.people?.map((p: any) => ({ id: p.id, name: p.name })) || [];
      case 'files':
        return property.files?.map((f: any) => ({ name: f.name, url: f.file?.url || f.external?.url })) || [];
      case 'relation':
        return property.relation?.map((r: any) => r.id) || [];
      case 'formula':
        return this.extractPropertyValue(property.formula);
      case 'rollup':
        return property.rollup?.array?.map((item: any) => this.extractPropertyValue(item)) || [];
      default:
        return property;
    }
  }

  private transformNotionPageToSupabase(page: any, content: string) {
    // Extract title from Name property
    const titel = this.extractPropertyValue(page.properties.Name) || 'Untitled';
    
    // Extract category from Kategorie property
    const kategorie = this.extractPropertyValue(page.properties.Kategorie);
    
    // Build meta object with all other properties
    const meta: Record<string, any> = {
      notion_id: page.id,
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      created_by: page.created_by,
      last_edited_by: page.last_edited_by,
    };

    // Add all other properties to meta (excluding Name and Kategorie)
    for (const [key, value] of Object.entries(page.properties)) {
      if (key !== 'Name' && key !== 'Kategorie') {
        meta[key] = this.extractPropertyValue(value);
      }
    }

    return {
      titel,
      kategorie,
      seiteninhalt: content,
      meta,
    };
  }

  async syncPages(syncType: 'manual' | 'scheduled' = 'manual'): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      processed: 0,
      errors: [],
      message: '',
    };

    let syncId: string | null = null;

    try {
      console.log('Starting Notion sync...');
      
      // Start monitoring
      syncId = await this.monitor.startSync(syncType);
      
      // Fetch all pages from Notion database
      const database = await this.fetchNotionDatabase();
      console.log(`Found ${database.results.length} pages in Notion database`);

      if (database.results.length === 0) {
        result.success = true;
        result.message = 'No pages found in Notion database';
        return result;
      }

      // Get existing pages from Supabase to implement incremental sync
      const { data: existingPages, error: fetchError } = await this.supabase
        .from('Dokumentation')
        .select('meta')
        .not('meta', 'is', null);

      if (fetchError) {
        console.warn('Could not fetch existing pages for incremental sync:', fetchError);
      }

      const existingNotionIds = new Set(
        existingPages?.map((page: any) => page.meta?.notion_id).filter(Boolean) || []
      );

      // Process pages in batches
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < database.results.length; i += batchSize) {
        batches.push(database.results.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (page) => {
          try {
            // Skip if page hasn't been modified (incremental sync)
            if (existingNotionIds.has(page.id)) {
              const { data: existingPage } = await this.supabase
                .from('Dokumentation')
                .select('meta')
                .eq('meta->>notion_id', page.id)
                .single();

              if (existingPage?.meta?.last_edited_time === page.last_edited_time) {
                console.log(`Skipping unchanged page: ${page.id}`);
                return { success: true, skipped: true };
              }
            }

            // Fetch page content
            const content = await this.fetchPageContent(page.id);
            
            // Transform to Supabase format
            const transformedPage = this.transformNotionPageToSupabase(page, content);
            
            // Upsert to Supabase (update if exists, insert if new)
            const { error } = await this.supabase
              .from('Dokumentation')
              .upsert(
                transformedPage,
                { 
                  onConflict: 'meta->notion_id',
                  ignoreDuplicates: false 
                }
              );

            if (error) {
              console.error(`Error upserting page ${page.id}:`, error);
              return { success: false, error: error.message };
            }

            console.log(`Successfully processed page: ${transformedPage.titel}`);
            return { success: true, skipped: false };
          } catch (error) {
            const errorMessage = `Error processing page ${page.id}: ${error.message}`;
            console.error(errorMessage);
            return { success: false, error: errorMessage };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        // Process batch results
        for (const batchResult of batchResults) {
          if (batchResult.success && !batchResult.skipped) {
            result.processed++;
          } else if (!batchResult.success) {
            result.errors.push(batchResult.error);
          }
        }

        // Add delay between batches to respect rate limits
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Clean up deleted pages (pages that exist in Supabase but not in Notion)
      if (existingPages && existingPages.length > 0) {
        const currentNotionIds = database.results.map(page => page.id);
        const deletedNotionIds = existingPages
          .map((page: any) => page.meta?.notion_id)
          .filter((id: string) => id && !currentNotionIds.includes(id));

        if (deletedNotionIds.length > 0) {
          const { error: deleteError } = await this.supabase
            .from('Dokumentation')
            .delete()
            .in('meta->>notion_id', deletedNotionIds);

          if (deleteError) {
            console.warn('Error cleaning up deleted pages:', deleteError);
            result.errors.push(`Failed to clean up ${deletedNotionIds.length} deleted pages`);
          } else {
            console.log(`Cleaned up ${deletedNotionIds.length} deleted pages`);
          }
        }
      }

      result.success = result.errors.length === 0;
      result.message = result.success 
        ? `Successfully synced ${result.processed} pages`
        : `Synced ${result.processed} pages with ${result.errors.length} errors`;

      console.log('Sync completed:', result);
      
      // Complete monitoring
      if (syncId) {
        await this.monitor.completeSync(syncId, result.success, result.processed, result.errors, result.message);
      }
      
      return result;

    } catch (error) {
      const errorMessage = `Sync failed: ${error.message}`;
      console.error(errorMessage);
      result.errors.push(errorMessage);
      result.message = errorMessage;
      
      // Complete monitoring with error
      if (syncId) {
        await this.monitor.completeSync(syncId, false, result.processed, result.errors, errorMessage);
      }
      
      return result;
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // Get environment variables
    const notionToken = Deno.env.get('NOTION_TOKEN');
    const notionDatabaseId = Deno.env.get('NOTION_DATABASE_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Handle health check endpoint
    if (path.endsWith('/health')) {
      const healthResult = await performHealthCheck(supabaseUrl, supabaseServiceKey);
      return new Response(
        JSON.stringify(healthResult),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: healthResult.healthy ? 200 : 503,
        }
      );
    }

    // Handle sync history endpoint
    if (path.endsWith('/history')) {
      const monitor = new SyncMonitor(supabaseUrl, supabaseServiceKey);
      const history = await monitor.getSyncHistory(20);
      return new Response(
        JSON.stringify({ history }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Handle sync stats endpoint
    if (path.endsWith('/stats')) {
      const monitor = new SyncMonitor(supabaseUrl, supabaseServiceKey);
      const stats = await monitor.getSyncStats(30);
      return new Response(
        JSON.stringify({ stats }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Handle main sync endpoint
    if (!notionToken || !notionDatabaseId) {
      throw new Error('Missing Notion configuration for sync operation');
    }

    // Determine sync type from request
    const requestBody = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const syncType = requestBody.syncType || 'manual';

    // Initialize sync service
    const syncService = new NotionSyncService(
      notionToken,
      notionDatabaseId,
      supabaseUrl,
      supabaseServiceKey
    );

    // Perform sync
    const result = await syncService.syncPages(syncType);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500,
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        processed: 0,
        errors: [error.message],
        message: `Edge function error: ${error.message}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})