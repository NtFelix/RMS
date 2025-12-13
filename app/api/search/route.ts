export const runtime = 'edge';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import type {
  SearchResponse,
  SearchResult as FrontendSearchResult
} from "@/types/search"

// Database record interfaces
interface DbTenant {
  id: string;
  name: string;
  email: string | null;
  telefonnummer: string | null;
  einzug: string | null;
  auszug: string | null;
  Wohnungen?: {
    name: string;
    Haeuser?: {
      name: string;
      [key: string]: any;
    }[];
    [key: string]: any;
  }[];
}

interface DbApartment {
  id: string;
  name: string;
  Haeuser?: DbHouse | null;
  [key: string]: any; // For other properties we might not need to type explicitly
}

interface DbHouse {
  id: string;
  name: string;
  [key: string]: any; // For other properties we might not need to type explicitly
}

interface SearchResult<T> {
  type: 'tenant' | 'house' | 'apartment' | 'finance' | 'task';
  data: T[];
}

// In-memory cache for search patterns with expiration
const searchPatternCache = new Map<string, { pattern: string; exact: string; fuzzy?: string; words?: string[]; timestamp: number }>();
const PATTERN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to sanitize search query
function sanitizeQuery(query: string): string {
  return query.trim().replace(/[%_]/g, '\\$&');
}

// Helper function to create search patterns with caching and fuzzy matching
function getSearchPatterns(query: string): { pattern: string; exact: string; fuzzy: string; words: string[] } {
  const cacheKey = query.toLowerCase();
  const cached = searchPatternCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < PATTERN_CACHE_TTL) {
    return { 
      pattern: cached.pattern, 
      exact: cached.exact,
      fuzzy: cached.fuzzy || cached.pattern,
      words: cached.words || [cached.exact]
    };
  }
  
  const sanitized = sanitizeQuery(query);
  const pattern = `%${sanitized}%`;
  const exact = sanitized;
  
  // Create fuzzy pattern for better matching
  const fuzzy = sanitized.split('').join('%');
  
  // Split into words for multi-word search
  const words = sanitized.split(/\s+/).filter(word => word.length > 0);
  
  const patterns = {
    pattern,
    exact,
    fuzzy: `%${fuzzy}%`,
    words
  };
  
  searchPatternCache.set(cacheKey, {
    ...patterns,
    timestamp: Date.now()
  });
  
  return patterns;
}

// Helper function to clean up expired cache entries
function cleanupPatternCache(): void {
  const now = Date.now();
  for (const [key, value] of searchPatternCache.entries()) {
    if (now - value.timestamp > PATTERN_CACHE_TTL) {
      searchPatternCache.delete(key);
    }
  }
}

// Helper function to sort results by relevance
function sortByRelevance<T extends { name?: string; title?: string }>(
  results: T[], 
  query: string
): T[] {
  const queryLower = query.toLowerCase();
  
  return results.sort((a, b) => {
    const aName = (a.name || a.title || '').toLowerCase();
    const bName = (b.name || b.title || '').toLowerCase();
    
    // Exact matches first
    const aExact = aName === queryLower;
    const bExact = bName === queryLower;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    // Starts with query second
    const aStarts = aName.startsWith(queryLower);
    const bStarts = bName.startsWith(queryLower);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    
    // Alphabetical order for the rest
    return aName.localeCompare(bName);
  });
}

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    // Clean up expired cache entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      cleanupPatternCache();
    }

    // Add request timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 15000); // 15 second timeout
    });
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const categories = searchParams.get('categories')?.split(',') || ['tenant', 'house', 'apartment', 'finance', 'task'];
    
    // Validate query parameter
    if (!query || query.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Search query is required' 
      }, { status: 400 });
    }
    
    if (query.length > 100) {
      return NextResponse.json({ 
        error: 'Search query too long' 
      }, { status: 400 });
    }
    
    // Validate limit
    if (limit < 1 || limit > 20) {
      return NextResponse.json({ 
        error: 'Limit must be between 1 and 20' 
      }, { status: 400 });
    }
    
    const supabase = await createSupabaseServerClient();
    
    // Handle special "*" query for showing all results
    const isShowAllQuery = query.trim() === '*';
    const { pattern: searchPattern, fuzzy: fuzzyPattern, words } = isShowAllQuery ? 
      { pattern: '%', fuzzy: '%', words: [] } : 
      getSearchPatterns(query);
    
    const results: SearchResponse['results'] = {
      tenant: [],
      house: [],
      apartment: [],
      finance: [],
      task: []
    };
    
    // Use Promise.allSettled for parallel execution with error isolation
    const searchPromises = [];
    
    // Search tenants (Mieter) - Enhanced with fuzzy matching and multi-word search
    if (categories.includes('tenant')) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Adding tenant search promise');
      }
      searchPromises.push(
        (async () => {
          try {
            let queryBuilder = supabase
              .from('Mieter')
              .select(`
                id, name, email, telefonnummer, einzug, auszug,
                Wohnungen!left(name, Haeuser!left(name))
              `);

            // Build search conditions for better matching
            let queryBuilderWithConditions;
            let searchConditions: string[] = [];
            
            if (isShowAllQuery) {
              // Show all tenants when using "*" query
              queryBuilderWithConditions = queryBuilder;
            } else {
              searchConditions = [
                `name.ilike.${searchPattern}`
              ];

              // Add email search (always)
              searchConditions.push(`email.ilike.${searchPattern}`);
              
              // Add phone number search only for non-email patterns
              if (!searchPattern.includes('@')) {
                searchConditions.push(`telefonnummer.ilike.${searchPattern}`);
              }
              
              queryBuilderWithConditions = queryBuilder.or(searchConditions.join(','));
            }

            // Debug logging in development only
            if (process.env.NODE_ENV === 'development') {
              // Test if we can get any tenants at all (development only)
              const { data: allTenants, error: countError } = await supabase
                .from('Mieter')
                .select('id, name')
                .limit(1);
                
              console.log('Total tenants in database:', allTenants?.length || 0);
              if (countError) {
                console.error('Count error:', countError);
              }
            }

            const { data, error } = await queryBuilderWithConditions
              .order('name')
              .limit(limit);

            if (error) {
              console.error('Tenant search error:', error);
              if (!isShowAllQuery) {
                console.error('Tenant search query conditions:', searchConditions);
              }
              return { type: 'tenant' as const, data: [] };
            }
            
            if (!data) return { type: 'tenant', data: [] };
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`Tenant search found ${data.length} results for query "${query}"`);
              if (data.length > 0) {
                console.log('Sample tenant result:', {
                  id: data[0].id,
                  name: data[0].name,
                  email: data[0].email,
                  telefonnummer: data[0].telefonnummer
                });
              }
            }
            
            const sortedTenants = sortByRelevance(data, query);
            
            const tenantResults = sortedTenants.map((tenant: DbTenant) => {
              // Get the first apartment if available
              const apartment = tenant.Wohnungen?.[0] ? {
                name: tenant.Wohnungen[0].name || '',
                house_name: tenant.Wohnungen[0].Haeuser?.[0]?.name || ''
              } : undefined;

              return {
                id: tenant.id,
                name: tenant.name,
                email: tenant.email || undefined,
                phone: tenant.telefonnummer || undefined,
                apartment,
                status: tenant.auszug ? 'moved_out' : 'active',
                move_in_date: tenant.einzug || undefined,
                move_out_date: tenant.auszug || undefined
              };
            });
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`Returning ${tenantResults.length} tenant results:`, tenantResults.map(t => ({ id: t.id, name: t.name, email: t.email })));
            }
            
            return { type: 'tenant' as const, data: tenantResults };
          } catch (error) {
            console.error('Error searching tenants:', error);
            return { type: 'tenant' as const, data: [] };
          }
        })()
      );
    }
    
    // Search houses (Haeuser) - Enhanced with better address matching
    if (categories.includes('house')) {
      searchPromises.push(
        (async () => {
          try {
            let queryBuilder = supabase
              .from('Haeuser')
              .select(`
                id, name, strasse, ort,
                Wohnungen!left(id, miete, Mieter!left(id, auszug))
              `);

            // Enhanced search conditions for houses
            let queryBuilderWithConditions;
            
            if (isShowAllQuery) {
              // Show all houses when using "*" query
              queryBuilderWithConditions = queryBuilder;
            } else {
              const searchConditions = [
                `name.ilike.${searchPattern}`,
                `strasse.ilike.${searchPattern}`,
                `ort.ilike.${searchPattern}`
              ];

              // Add fuzzy matching for better results
              if (query.length > 2) {
                searchConditions.push(`name.ilike.${fuzzyPattern}`);
                searchConditions.push(`strasse.ilike.${fuzzyPattern}`);
              }

              // Multi-word search for addresses
              if (words.length > 1) {
                words.forEach(word => {
                  if (word.length > 1) {
                    searchConditions.push(`name.ilike.%${word}%`);
                    searchConditions.push(`strasse.ilike.%${word}%`);
                    searchConditions.push(`ort.ilike.%${word}%`);
                  }
                });
              }
              
              queryBuilderWithConditions = queryBuilder.or(searchConditions.join(','));
            }

            const { data, error } = await queryBuilderWithConditions
              .order('name')
              .limit(limit);

            if (error) {
              console.error('House search error:', error);
              return { type: 'house', data: [] };
            }
            
            if (!data) return { type: 'house', data: [] };
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`House search found ${data.length} results for query "${query}"`);
              if (data.length > 0) {
                console.log('Sample house result:', {
                  id: data[0].id,
                  name: data[0].name,
                  strasse: data[0].strasse,
                  ort: data[0].ort
                });
              }
            }
            
            const sortedHouses = sortByRelevance(data, query);
            
            const houseResults = sortedHouses.map((house: any) => {
              const apartments = Array.isArray(house.Wohnungen) ? house.Wohnungen : (house.Wohnungen ? [house.Wohnungen] : []);
              const totalRent = apartments.reduce((sum: number, apt: any) => sum + (apt.miete || 0), 0);
              const freeApartments = apartments.filter((apt: any) => {
                const tenants = Array.isArray(apt.Mieter) ? apt.Mieter : (apt.Mieter ? [apt.Mieter] : []);
                const hasActiveTenant = tenants.some((m: any) => !m.auszug);
                return !hasActiveTenant;
              }).length;
              
              return {
                id: house.id,
                name: house.name,
                address: [house.strasse, house.ort].filter(Boolean).join(', '),
                apartment_count: apartments.length,
                total_rent: totalRent,
                free_apartments: freeApartments
              };
            });
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`Returning ${houseResults.length} house results:`, houseResults.map(h => ({ id: h.id, name: h.name, address: h.address })));
            }
            
            return { type: 'house', data: houseResults };
          } catch (error) {
            console.error('Error searching houses:', error);
            return { type: 'house', data: [] };
          }
        })()
      );
    }
    
    // Search apartments (Wohnungen) - Enhanced with house name search
    if (categories.includes('apartment')) {
      searchPromises.push(
        (async () => {
          try {
            let queryBuilder = supabase
              .from('Wohnungen')
              .select(`
                id, name, groesse, miete,
                Haeuser!left(name),
                Mieter!left(name, einzug, auszug)
              `);

            // Enhanced search for apartments including house names
            let queryBuilderWithConditions;
            
            if (isShowAllQuery) {
              // Show all apartments when using "*" query
              queryBuilderWithConditions = queryBuilder;
            } else {
              const searchConditions = [
                `name.ilike.${searchPattern}`
              ];

              // Add fuzzy matching
              if (query.length > 2) {
                searchConditions.push(`name.ilike.${fuzzyPattern}`);
              }

              // Multi-word search
              if (words.length > 1) {
                words.forEach(word => {
                  if (word.length > 1) {
                    searchConditions.push(`name.ilike.%${word}%`);
                  }
                });
              }
              
              queryBuilderWithConditions = queryBuilder.or(searchConditions.join(','));
            }

            const { data, error } = await queryBuilderWithConditions
              .order('name')
              .limit(limit);

            if (error) {
              console.error('Apartment search error:', error);
              return { type: 'apartment', data: [] };
            }
            
            if (!data) return { type: 'apartment', data: [] };
            
            // Also search by house name if no direct apartment matches (skip for show-all query)
            let houseSearchResults: any[] = [];
            if (!isShowAllQuery && data.length < limit) {
              try {
                const { data: houseData, error: houseError } = await supabase
                  .from('Wohnungen')
                  .select(`
                    id, name, groesse, miete,
                    Haeuser!left(name),
                    Mieter!left(name, einzug, auszug)
                  `)
                  .not('id', 'in', `(${data.map(d => d.id).join(',') || 'null'})`)
                  .or(`Haeuser.name.ilike.${searchPattern}`)
                  .order('name')
                  .limit(limit - data.length);

                if (!houseError && houseData) {
                  houseSearchResults = houseData;
                }
              } catch (houseSearchError) {
                console.warn('House name search for apartments failed:', houseSearchError);
              }
            }

            const allResults = [...data, ...houseSearchResults];
            const sortedApartments = sortByRelevance(allResults, query);
            
            const apartmentResults = sortedApartments.map((apartment: any) => {
              const mieterArray = Array.isArray(apartment.Mieter) ? apartment.Mieter : (apartment.Mieter ? [apartment.Mieter] : []);
              const currentTenant = mieterArray.find((m: any) => !m.auszug);
              
              return {
                id: apartment.id,
                name: apartment.name,
                house_name: apartment.Haeuser && typeof apartment.Haeuser === 'object' && !Array.isArray(apartment.Haeuser) ? apartment.Haeuser.name : '',
                size: apartment.groesse,
                rent: apartment.miete,
                status: currentTenant ? 'rented' : 'free',
                current_tenant: currentTenant ? {
                  name: currentTenant.name,
                  move_in_date: currentTenant.einzug || ''
                } : undefined
              };
            });
            
            return { type: 'apartment', data: apartmentResults };
          } catch (error) {
            console.error('Error searching apartments:', error);
            return { type: 'apartment', data: [] };
          }
        })()
      );
    }
    
    // Search finances (Finanzen) - Optimized with conditional numeric search
    if (categories.includes('finance')) {
      const isNumericQuery = !isShowAllQuery && !isNaN(parseFloat(query));
      
      let financeQueryBuilder = supabase
        .from('Finanzen')
        .select(`
          id, name, betrag, datum, ist_einnahmen, notiz,
          Wohnungen!left(name, Haeuser!left(name))
        `)
        .order('datum', { ascending: false })
        .limit(limit);
        
      if (!isShowAllQuery) {
        if (isNumericQuery) {
          const amount = parseFloat(query);
          financeQueryBuilder = financeQueryBuilder.or(`name.ilike.${searchPattern},notiz.ilike.${searchPattern},betrag.eq.${amount}`);
        } else {
          financeQueryBuilder = financeQueryBuilder.or(`name.ilike.${searchPattern},notiz.ilike.${searchPattern}`);
        }
      }
      
      searchPromises.push(
        (async () => {
          try {
            const { data, error } = await financeQueryBuilder;

            if (error) {
              console.error('Finance search error:', error);
              return { type: 'finance', data: [] };
            }
            
            if (!data) return { type: 'finance', data: [] };
            
            // Custom sorting for finances: relevance first, then by date
            const sortedFinances = data.sort((a, b) => {
              const aExact = a.name.toLowerCase() === query.toLowerCase();
              const bExact = b.name.toLowerCase() === query.toLowerCase();
              if (aExact && !bExact) return -1;
              if (!aExact && bExact) return 1;
              // Then by date (most recent first)
              return new Date(b.datum).getTime() - new Date(a.datum).getTime();
            });
            
            const financeResults = sortedFinances.map((finance: any) => ({
              id: finance.id,
              name: finance.name,
              amount: finance.betrag,
              date: finance.datum,
              type: finance.ist_einnahmen ? 'income' : 'expense',
              apartment: finance.Wohnungen && typeof finance.Wohnungen === 'object' && !Array.isArray(finance.Wohnungen) ? {
                name: finance.Wohnungen.name,
                house_name: finance.Wohnungen.Haeuser && typeof finance.Wohnungen.Haeuser === 'object' && !Array.isArray(finance.Wohnungen.Haeuser) ? finance.Wohnungen.Haeuser.name : ''
              } : undefined,
              notes: finance.notiz || undefined
            }));
            
            return { type: 'finance', data: financeResults };
          } catch (error) {
            console.error('Error searching finances:', error);
            return { type: 'finance', data: [] };
          }
        })()
      );
    }
    
    // Search tasks (Aufgaben) - Optimized with completion status ordering
    if (categories.includes('task')) {
      searchPromises.push(
        (async () => {
          try {
            let taskQueryBuilder = supabase
              .from('Aufgaben')
              .select('id, name, beschreibung, ist_erledigt, erstellungsdatum');
              
            if (!isShowAllQuery) {
              taskQueryBuilder = taskQueryBuilder.or(`name.ilike.${searchPattern},beschreibung.ilike.${searchPattern}`);
            }
            
            const { data, error } = await taskQueryBuilder
              .order('ist_erledigt', { ascending: true }) // Incomplete tasks first
              .order('erstellungsdatum', { ascending: false })
              .limit(limit);

            if (error) {
              console.error('Task search error:', error);
              return { type: 'task', data: [] };
            }
            
            if (!data) return { type: 'task', data: [] };
            
            const sortedTasks = sortByRelevance(data, query);
            
            const taskResults = sortedTasks.map((task: any) => ({
              id: task.id,
              name: task.name,
              description: task.beschreibung,
              completed: task.ist_erledigt,
              created_date: task.erstellungsdatum
            }));
            
            return { type: 'task', data: taskResults };
          } catch (error) {
            console.error('Error searching tasks:', error);
            return { type: 'task', data: [] };
          }
        })()
      );
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`About to execute ${searchPromises.length} search promises`);
    }

    // Execute all searches in parallel with timeout
    const searchResults = await Promise.race([
      Promise.allSettled(searchPromises),
      timeoutPromise
    ]) as PromiseSettledResult<any>[];
    
    // Process results with graceful degradation
    let successfulSearches = 0;
    let failedSearches = 0;
    
    searchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        const { type, data } = result.value;
        (results as any)[type] = data;
        successfulSearches++;
      } else {
        failedSearches++;
        console.warn('Search failed for category:', result.status === 'rejected' ? result.reason : 'Unknown error');
      }
    });

    // Log performance metrics
    if (process.env.NODE_ENV === 'development') {
      console.log(`Search completed: ${successfulSearches} successful, ${failedSearches} failed`);
      console.log(`Total promises created: ${searchPromises.length}`);
      console.log(`Categories: ${categories.join(', ')}`);
      console.log(`Query: "${query}"`);
      console.log('Final results summary:', {
        tenant: results.tenant.length,
        house: results.house.length,
        apartment: results.apartment.length,
        finance: results.finance.length,
        task: results.task.length
      });
      if (Object.values(results).some(arr => arr.length > 0)) {
        console.log('Sample results:', {
          tenant: results.tenant[0] || null,
          house: results.house[0] || null,
          apartment: results.apartment[0] || null,
          finance: results.finance[0] || null,
          task: results.task[0] || null
        });
      }
    }
    
    const totalCount = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
    const executionTime = Date.now() - startTime;
    
    const response: SearchResponse = {
      results,
      totalCount,
      executionTime
    };

    // Add warning header if some searches failed but we have partial results
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60', // Cache for 1 minute
    });
    
    if (failedSearches > 0 && successfulSearches > 0) {
      headers.set('X-Partial-Results', 'true');
      headers.set('X-Failed-Categories', failedSearches.toString());
    }
    
    // Compression is handled automatically by the hosting platform based on the client's Accept-Encoding header

    // Set error headers if any searches failed
    if (successfulSearches === 0) {
      // All searches failed
      headers.set('X-Error', 'All search operations failed');
      return new NextResponse(JSON.stringify({ 
        error: 'Service unavailable',
        details: 'All search operations failed'
      }), { 
        status: 503, // Service Unavailable
        headers
      });
    } else if (failedSearches > 0) {
      // Some searches failed but we have partial results
      headers.set('X-Partial-Results', 'true');
      headers.set('X-Failed-Categories', failedSearches.toString());
    }
    
    return new NextResponse(JSON.stringify(response), { 
      status: 200, // Always return 200 for successful responses
      headers
    });
    
  } catch (error) {
    console.error('Search API error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Serverfehler bei der Suche.';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Die Suche dauert zu lange. Bitte versuchen Sie es mit einem anderen Suchbegriff.';
        statusCode = 408; // Request Timeout
      } else if (error.message.includes('database') || error.message.includes('connection')) {
        errorMessage = 'Datenbankverbindung nicht verfügbar. Bitte versuchen Sie es später erneut.';
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('memory') || error.message.includes('resource')) {
        errorMessage = 'Server überlastet. Bitte versuchen Sie es in wenigen Sekunden erneut.';
        statusCode = 503; // Service Unavailable
      }
    }
    
    const responseHeaders: Record<string, string> = {};
    if (statusCode === 503) {
      responseHeaders['Retry-After'] = '30'; // Suggest retry after 30 seconds for service unavailable
    }

    return NextResponse.json({ 
      error: errorMessage,
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(7) // Simple request ID for debugging
    }, { 
      status: statusCode,
      headers: responseHeaders
    });
  }
}