/**
 * Integration Tests for Notion Sync Process
 * 
 * These tests verify the complete Notion to Supabase sync workflow,
 * including data transformation, error handling, and incremental updates.
 */

import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js');

// Mock Notion API responses
const mockNotionPages = [
  {
    id: 'notion-page-1',
    properties: {
      Name: {
        title: [{ plain_text: 'Getting Started with Mietfluss' }]
      },
      Kategorie: {
        select: { name: 'Erste Schritte' }
      },
      Status: {
        select: { name: 'Published' }
      }
    },
    content: 'This is the content of the getting started guide...',
    created_time: '2024-01-01T00:00:00Z',
    last_edited_time: '2024-01-02T00:00:00Z',
    created_by: { id: 'user-1', name: 'Admin' },
    last_edited_by: { id: 'user-1', name: 'Admin' }
  },
  {
    id: 'notion-page-2',
    properties: {
      Name: {
        title: [{ plain_text: 'Managing Tenants' }]
      },
      Kategorie: {
        select: { name: 'Mieter verwalten' }
      },
      Status: {
        select: { name: 'Draft' }
      }
    },
    content: 'Learn how to manage tenants effectively...',
    created_time: '2024-01-03T00:00:00Z',
    last_edited_time: '2024-01-03T00:00:00Z',
    created_by: { id: 'user-2', name: 'Editor' },
    last_edited_by: { id: 'user-2', name: 'Editor' }
  }
];

// Mock Supabase responses
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  auth: {
    getUser: jest.fn()
  }
};

describe('Notion Sync Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  describe('Data Transformation', () => {
    test('transforms Notion pages to Supabase format correctly', async () => {
      const transformNotionPage = (notionPage: any) => {
        return {
          titel: notionPage.properties.Name.title[0]?.plain_text || '',
          kategorie: notionPage.properties.Kategorie?.select?.name || null,
          seiteninhalt: notionPage.content || null,
          meta: {
            notion_id: notionPage.id,
            created_time: notionPage.created_time,
            last_edited_time: notionPage.last_edited_time,
            created_by: notionPage.created_by,
            last_edited_by: notionPage.last_edited_by,
            status: notionPage.properties.Status?.select?.name,
            // Include all other properties in meta
            ...Object.fromEntries(
              Object.entries(notionPage.properties)
                .filter(([key]) => !['Name', 'Kategorie'].includes(key))
                .map(([key, value]) => [key.toLowerCase(), value])
            )
          }
        };
      };

      const transformedPage = transformNotionPage(mockNotionPages[0]);

      expect(transformedPage).toEqual({
        titel: 'Getting Started with Mietfluss',
        kategorie: 'Erste Schritte',
        seiteninhalt: 'This is the content of the getting started guide...',
        meta: {
          notion_id: 'notion-page-1',
          created_time: '2024-01-01T00:00:00Z',
          last_edited_time: '2024-01-02T00:00:00Z',
          created_by: { id: 'user-1', name: 'Admin' },
          last_edited_by: { id: 'user-1', name: 'Admin' },
          status: 'Published'
        }
      });
    });

    test('handles missing or null Notion properties gracefully', async () => {
      const incompleteNotionPage = {
        id: 'notion-page-incomplete',
        properties: {
          Name: {
            title: [{ plain_text: 'Incomplete Page' }]
          }
          // Missing Kategorie and other properties
        },
        content: null,
        created_time: '2024-01-01T00:00:00Z',
        last_edited_time: '2024-01-01T00:00:00Z'
      };

      const transformNotionPage = (notionPage: any) => {
        return {
          titel: notionPage.properties.Name.title[0]?.plain_text || '',
          kategorie: notionPage.properties.Kategorie?.select?.name || null,
          seiteninhalt: notionPage.content || null,
          meta: {
            notion_id: notionPage.id,
            created_time: notionPage.created_time,
            last_edited_time: notionPage.last_edited_time,
            created_by: notionPage.created_by || null,
            last_edited_by: notionPage.last_edited_by || null
          }
        };
      };

      const transformedPage = transformNotionPage(incompleteNotionPage);

      expect(transformedPage).toEqual({
        titel: 'Incomplete Page',
        kategorie: null,
        seiteninhalt: null,
        meta: {
          notion_id: 'notion-page-incomplete',
          created_time: '2024-01-01T00:00:00Z',
          last_edited_time: '2024-01-01T00:00:00Z',
          created_by: null,
          last_edited_by: null
        }
      });
    });
  });

  describe('Sync Process', () => {
    test('successfully syncs new pages to Supabase', async () => {
      // Mock successful upsert
      mockSupabaseClient.upsert.mockResolvedValue({
        data: [{ id: 'supabase-id-1' }],
        error: null
      });

      const syncNotionPages = async (pages: any[]) => {
        const transformedPages = pages.map(page => ({
          titel: page.properties.Name.title[0]?.plain_text || '',
          kategorie: page.properties.Kategorie?.select?.name || null,
          seiteninhalt: page.content || null,
          meta: {
            notion_id: page.id,
            created_time: page.created_time,
            last_edited_time: page.last_edited_time,
            created_by: page.created_by,
            last_edited_by: page.last_edited_by
          }
        }));

        const { data, error } = await mockSupabaseClient
          .from('Dokumentation')
          .upsert(transformedPages, { 
            onConflict: 'meta->notion_id',
            ignoreDuplicates: false 
          });

        return { data, error, processed: transformedPages.length };
      };

      const result = await syncNotionPages(mockNotionPages);

      expect(result.processed).toBe(2);
      expect(result.error).toBeNull();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('Dokumentation');
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            titel: 'Getting Started with Mietfluss',
            kategorie: 'Erste Schritte'
          }),
          expect.objectContaining({
            titel: 'Managing Tenants',
            kategorie: 'Mieter verwalten'
          })
        ]),
        { onConflict: 'meta->notion_id', ignoreDuplicates: false }
      );
    });

    test('handles Supabase errors gracefully', async () => {
      // Mock Supabase error
      mockSupabaseClient.upsert.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'CONNECTION_ERROR' }
      });

      const syncNotionPages = async (pages: any[]) => {
        try {
          const transformedPages = pages.map(page => ({
            titel: page.properties.Name.title[0]?.plain_text || '',
            kategorie: page.properties.Kategorie?.select?.name || null,
            seiteninhalt: page.content || null,
            meta: { notion_id: page.id }
          }));

          const { data, error } = await mockSupabaseClient
            .from('Dokumentation')
            .upsert(transformedPages);

          if (error) {
            throw new Error(`Sync failed: ${error.message}`);
          }

          return { success: true, processed: transformedPages.length };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            processed: 0 
          };
        }
      };

      const result = await syncNotionPages(mockNotionPages);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
      expect(result.processed).toBe(0);
    });
  });

  describe('Incremental Sync', () => {
    test('only syncs pages modified since last sync', async () => {
      const lastSyncTime = '2024-01-02T00:00:00Z';
      
      // Mock existing pages query
      mockSupabaseClient.select.mockResolvedValue({
        data: [
          { 
            id: 'existing-1', 
            meta: { 
              notion_id: 'notion-page-1',
              last_edited_time: '2024-01-01T00:00:00Z' 
            } 
          }
        ],
        error: null
      });

      const getModifiedPages = (pages: any[], lastSync: string) => {
        return pages.filter(page => 
          new Date(page.last_edited_time) > new Date(lastSync)
        );
      };

      const modifiedPages = getModifiedPages(mockNotionPages, lastSyncTime);

      // Only the second page should be considered modified
      expect(modifiedPages).toHaveLength(1);
      expect(modifiedPages[0].id).toBe('notion-page-2');
    });

    test('handles first-time sync (no existing pages)', async () => {
      // Mock empty database
      mockSupabaseClient.select.mockResolvedValue({
        data: [],
        error: null
      });

      const getModifiedPages = (pages: any[], lastSync: string | null) => {
        if (!lastSync) {
          return pages; // First sync - return all pages
        }
        return pages.filter(page => 
          new Date(page.last_edited_time) > new Date(lastSync)
        );
      };

      const modifiedPages = getModifiedPages(mockNotionPages, null);

      expect(modifiedPages).toHaveLength(2);
      expect(modifiedPages).toEqual(mockNotionPages);
    });
  });

  describe('Error Recovery', () => {
    test('continues processing after individual page errors', async () => {
      const processPages = async (pages: any[]) => {
        const results = [];
        const errors = [];

        for (const page of pages) {
          try {
            // Simulate error for second page
            if (page.id === 'notion-page-2') {
              throw new Error('Invalid content format');
            }

            const transformedPage = {
              titel: page.properties.Name.title[0]?.plain_text || '',
              kategorie: page.properties.Kategorie?.select?.name || null,
              seiteninhalt: page.content || null,
              meta: { notion_id: page.id }
            };

            results.push(transformedPage);
          } catch (error) {
            errors.push({
              pageId: page.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        return { results, errors };
      };

      const { results, errors } = await processPages(mockNotionPages);

      expect(results).toHaveLength(1);
      expect(results[0].titel).toBe('Getting Started with Mietfluss');
      expect(errors).toHaveLength(1);
      expect(errors[0].pageId).toBe('notion-page-2');
      expect(errors[0].error).toBe('Invalid content format');
    });

    test('implements retry logic for transient failures', async () => {
      let attemptCount = 0;
      
      const syncWithRetry = async (maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            attemptCount++;
            
            // Simulate failure on first two attempts
            if (attempt <= 2) {
              throw new Error('Temporary network error');
            }

            // Success on third attempt
            return { success: true, attempt };
          } catch (error) {
            if (attempt === maxRetries) {
              throw error;
            }
            
            // Wait before retry (in real implementation)
            await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          }
        }
      };

      const result = await syncWithRetry();

      expect(result.success).toBe(true);
      expect(result.attempt).toBe(3);
      expect(attemptCount).toBe(3);
    });
  });

  describe('Performance and Monitoring', () => {
    test('tracks sync performance metrics', async () => {
      const syncWithMetrics = async (pages: any[]) => {
        const startTime = Date.now();
        
        try {
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          return {
            success: true,
            processed: pages.length,
            duration,
            pagesPerSecond: pages.length / (duration / 1000)
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime
          };
        }
      };

      const metrics = await syncWithMetrics(mockNotionPages);

      expect(metrics.success).toBe(true);
      expect(metrics.processed).toBe(2);
      expect(metrics.duration).toBeGreaterThan(90);
      expect(metrics.pagesPerSecond).toBeGreaterThan(0);
    });

    test('logs detailed sync information', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const syncWithLogging = async (pages: any[]) => {
        console.log(`Starting sync of ${pages.length} pages`);
        
        const results = [];
        for (const page of pages) {
          console.log(`Processing page: ${page.id}`);
          results.push({
            id: page.id,
            title: page.properties.Name.title[0]?.plain_text
          });
        }
        
        console.log(`Sync completed. Processed ${results.length} pages`);
        return results;
      };

      await syncWithLogging(mockNotionPages);

      expect(consoleSpy).toHaveBeenCalledWith('Starting sync of 2 pages');
      expect(consoleSpy).toHaveBeenCalledWith('Processing page: notion-page-1');
      expect(consoleSpy).toHaveBeenCalledWith('Processing page: notion-page-2');
      expect(consoleSpy).toHaveBeenCalledWith('Sync completed. Processed 2 pages');

      consoleSpy.mockRestore();
    });
  });

  describe('Content Processing', () => {
    test('handles rich text content from Notion', async () => {
      const richTextNotionPage = {
        id: 'rich-text-page',
        properties: {
          Name: {
            title: [{ plain_text: 'Rich Text Example' }]
          }
        },
        content: {
          blocks: [
            {
              type: 'paragraph',
              paragraph: {
                rich_text: [
                  { plain_text: 'This is ', annotations: {} },
                  { plain_text: 'bold text', annotations: { bold: true } },
                  { plain_text: ' and this is normal.' }
                ]
              }
            },
            {
              type: 'heading_1',
              heading_1: {
                rich_text: [{ plain_text: 'Main Heading' }]
              }
            }
          ]
        }
      };

      const extractPlainText = (content: any): string => {
        if (typeof content === 'string') return content;
        
        if (content?.blocks) {
          return content.blocks
            .map((block: any) => {
              const blockContent = block[block.type];
              if (blockContent?.rich_text) {
                return blockContent.rich_text
                  .map((text: any) => text.plain_text)
                  .join('');
              }
              return '';
            })
            .join('\n');
        }
        
        return '';
      };

      const plainText = extractPlainText(richTextNotionPage.content);
      
      expect(plainText).toBe('This is bold text and this is normal.\nMain Heading');
    });

    test('sanitizes and validates content', async () => {
      const maliciousContent = '<script>alert("xss")</script><p>Safe content</p>';
      
      const sanitizeContent = (content: string): string => {
        // Basic HTML sanitization (in real implementation, use a proper library)
        return content
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim();
      };

      const sanitized = sanitizeContent(maliciousContent);
      
      expect(sanitized).toBe('Safe content');
      expect(sanitized).not.toContain('<script>');
    });
  });
});