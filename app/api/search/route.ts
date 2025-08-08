export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import type {
  TenantSearchResult,
  HouseSearchResult,
  ApartmentSearchResult,
  FinanceSearchResult,
  TaskSearchResult,
  SearchResponse
} from "@/types/search";

// Cache for storing compiled search patterns
const searchPatternCache = new Map<string, { pattern: string; exact: string; timestamp: number }>();
const PATTERN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to sanitize search query
function sanitizeQuery(query: string): string {
  return query.trim().replace(/[%_]/g, '\\$&');
}

// Helper function to create search patterns with caching
function getSearchPatterns(query: string): { pattern: string; exact: string } {
  const cacheKey = query.toLowerCase();
  const cached = searchPatternCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < PATTERN_CACHE_TTL) {
    return { pattern: cached.pattern, exact: cached.exact };
  }
  
  const sanitized = sanitizeQuery(query);
  const pattern = `%${sanitized}%`;
  const exact = sanitized;
  
  searchPatternCache.set(cacheKey, {
    pattern,
    exact,
    timestamp: Date.now()
  });
  
  return { pattern, exact };
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
    const aName = (a.name || (a as any).title || '').toLowerCase();
    const bName = (b.name || (b as any).title || '').toLowerCase();
    
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
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const categories = searchParams.get('categories')?.split(',') || ['tenants', 'houses', 'apartments', 'finances', 'tasks'];
    
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
    
    const supabase = await createClient();
    const { pattern: searchPattern, exact: exactPattern } = getSearchPatterns(query);
    
    const results: SearchResponse['results'] = {
      tenants: [],
      houses: [],
      apartments: [],
      finances: [],
      tasks: []
    };
    
    // Use Promise.allSettled for parallel execution with error isolation
    const searchPromises = [];
    
    // Search tenants (Mieter) - Optimized query with proper JOINs
    if (categories.includes('tenants')) {
      searchPromises.push(
        supabase
          .from('Mieter')
          .select(`
            id, name, email, telefonnummer, einzug, auszug,
            Wohnungen!left(name, Haeuser!left(name))
          `)
          .or(`name.ilike.${searchPattern},email.ilike.${searchPattern},telefonnummer.ilike.${searchPattern}`)
          .order('name')
          .limit(limit)
          .then(({ data, error }) => {
            if (error) {
              console.error('Tenant search error:', error);
              return { type: 'tenants', data: [] };
            }
            
            if (!data) return { type: 'tenants', data: [] };
            
            const sortedTenants = sortByRelevance(data, query);
            
            const tenantResults = sortedTenants.map(tenant => ({
              id: tenant.id,
              name: tenant.name,
              email: tenant.email || undefined,
              phone: tenant.telefonnummer || undefined,
              apartment: tenant.Wohnungen ? {
                name: tenant.Wohnungen.name,
                house_name: tenant.Wohnungen.Haeuser?.name || ''
              } : undefined,
              status: tenant.auszug ? 'moved_out' : 'active',
              move_in_date: tenant.einzug || undefined,
              move_out_date: tenant.auszug || undefined
            }));
            
            return { type: 'tenants', data: tenantResults };
          })
          .catch(error => {
            console.error('Error searching tenants:', error);
            return { type: 'tenants', data: [] };
          })
      );
    }
    
    // Search houses (Haeuser) - Optimized with aggregated apartment data
    if (categories.includes('houses')) {
      searchPromises.push(
        supabase
          .from('Haeuser')
          .select(`
            id, name, strasse, ort,
            Wohnungen!left(id, miete, Mieter!left(id, auszug))
          `)
          .or(`name.ilike.${searchPattern},strasse.ilike.${searchPattern},ort.ilike.${searchPattern}`)
          .order('name')
          .limit(limit)
          .then(({ data, error }) => {
            if (error) {
              console.error('House search error:', error);
              return { type: 'houses', data: [] };
            }
            
            if (!data) return { type: 'houses', data: [] };
            
            const sortedHouses = sortByRelevance(data, query);
            
            const houseResults = sortedHouses.map(house => {
              const apartments = Array.isArray(house.Wohnungen) ? house.Wohnungen : [];
              const totalRent = apartments.reduce((sum, apt) => sum + (apt.miete || 0), 0);
              const freeApartments = apartments.filter(apt => 
                !apt.Mieter || (Array.isArray(apt.Mieter) && apt.Mieter.length === 0) || 
                (Array.isArray(apt.Mieter) && apt.Mieter.some(m => m.auszug))
              ).length;
              
              return {
                id: house.id,
                name: house.name,
                address: [house.strasse, house.ort].filter(Boolean).join(', '),
                apartment_count: apartments.length,
                total_rent: totalRent,
                free_apartments: freeApartments
              };
            });
            
            return { type: 'houses', data: houseResults };
          })
          .catch(error => {
            console.error('Error searching houses:', error);
            return { type: 'houses', data: [] };
          })
      );
    }
    
    // Search apartments (Wohnungen) - Optimized with single query
    if (categories.includes('apartments')) {
      searchPromises.push(
        supabase
          .from('Wohnungen')
          .select(`
            id, name, groesse, miete,
            Haeuser!left(name),
            Mieter!left(name, einzug, auszug)
          `)
          .ilike('name', searchPattern)
          .order('name')
          .limit(limit)
          .then(({ data, error }) => {
            if (error) {
              console.error('Apartment search error:', error);
              return { type: 'apartments', data: [] };
            }
            
            if (!data) return { type: 'apartments', data: [] };
            
            const sortedApartments = sortByRelevance(data, query);
            
            const apartmentResults = sortedApartments.map(apartment => {
              const mieterArray = Array.isArray(apartment.Mieter) ? apartment.Mieter : [];
              const currentTenant = mieterArray.find(m => !m.auszug);
              
              return {
                id: apartment.id,
                name: apartment.name,
                house_name: apartment.Haeuser?.name || '',
                size: apartment.groesse,
                rent: apartment.miete,
                status: currentTenant ? 'rented' : 'free',
                current_tenant: currentTenant ? {
                  name: currentTenant.name,
                  move_in_date: currentTenant.einzug || ''
                } : undefined
              };
            });
            
            return { type: 'apartments', data: apartmentResults };
          })
          .catch(error => {
            console.error('Error searching apartments:', error);
            return { type: 'apartments', data: [] };
          })
      );
    }
    
    // Search finances (Finanzen) - Optimized with conditional numeric search
    if (categories.includes('finances')) {
      const isNumericQuery = !isNaN(parseFloat(query));
      
      let financeQueryBuilder = supabase
        .from('Finanzen')
        .select(`
          id, name, betrag, datum, ist_einnahmen, notiz,
          Wohnungen!left(name, Haeuser!left(name))
        `)
        .order('datum', { ascending: false })
        .limit(limit);
        
      if (isNumericQuery) {
        const amount = parseFloat(query);
        financeQueryBuilder = financeQueryBuilder.or(`name.ilike.${searchPattern},notiz.ilike.${searchPattern},betrag.eq.${amount}`);
      } else {
        financeQueryBuilder = financeQueryBuilder.or(`name.ilike.${searchPattern},notiz.ilike.${searchPattern}`);
      }
      
      searchPromises.push(
        financeQueryBuilder
          .then(({ data, error }) => {
            if (error) {
              console.error('Finance search error:', error);
              return { type: 'finances', data: [] };
            }
            
            if (!data) return { type: 'finances', data: [] };
            
            // Custom sorting for finances: relevance first, then by date
            const sortedFinances = data.sort((a, b) => {
              const aExact = a.name.toLowerCase() === query.toLowerCase();
              const bExact = b.name.toLowerCase() === query.toLowerCase();
              if (aExact && !bExact) return -1;
              if (!aExact && bExact) return 1;
              // Then by date (most recent first)
              return new Date(b.datum).getTime() - new Date(a.datum).getTime();
            });
            
            const financeResults = sortedFinances.map(finance => ({
              id: finance.id,
              name: finance.name,
              amount: finance.betrag,
              date: finance.datum,
              type: finance.ist_einnahmen ? 'income' : 'expense',
              apartment: finance.Wohnungen ? {
                name: finance.Wohnungen.name,
                house_name: finance.Wohnungen.Haeuser?.name || ''
              } : undefined,
              notes: finance.notiz || undefined
            }));
            
            return { type: 'finances', data: financeResults };
          })
          .catch(error => {
            console.error('Error searching finances:', error);
            return { type: 'finances', data: [] };
          })
      );
    }
    
    // Search tasks (Aufgaben) - Optimized with completion status ordering
    if (categories.includes('tasks')) {
      searchPromises.push(
        supabase
          .from('Aufgaben')
          .select('id, name, beschreibung, ist_erledigt, erstellungsdatum')
          .or(`name.ilike.${searchPattern},beschreibung.ilike.${searchPattern}`)
          .order('ist_erledigt', { ascending: true }) // Incomplete tasks first
          .order('erstellungsdatum', { ascending: false })
          .limit(limit)
          .then(({ data, error }) => {
            if (error) {
              console.error('Task search error:', error);
              return { type: 'tasks', data: [] };
            }
            
            if (!data) return { type: 'tasks', data: [] };
            
            const sortedTasks = sortByRelevance(data, query);
            
            const taskResults = sortedTasks.map(task => ({
              id: task.id,
              name: task.name,
              description: task.beschreibung,
              completed: task.ist_erledigt,
              created_date: task.erstellungsdatum
            }));
            
            return { type: 'tasks', data: taskResults };
          })
          .catch(error => {
            console.error('Error searching tasks:', error);
            return { type: 'tasks', data: [] };
          })
      );
    }
    
    // Execute all searches in parallel
    const searchResults = await Promise.allSettled(searchPromises);
    
    // Process results
    searchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        const { type, data } = result.value;
        (results as any)[type] = data;
      }
    });
    
    const totalCount = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
    const executionTime = Date.now() - startTime;
    
    const response: SearchResponse = {
      results,
      totalCount,
      executionTime
    };
    
    // Add response compression headers
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60', // Cache for 1 minute
    });
    
    // Add compression hint for larger responses
    if (totalCount > 10) {
      headers.set('Content-Encoding', 'gzip');
    }
    
    return new NextResponse(JSON.stringify(response), { 
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ 
      error: 'Serverfehler bei der Suche.' 
    }, { status: 500 });
  }
}