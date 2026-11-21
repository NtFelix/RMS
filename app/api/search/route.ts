import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";
import { getAccessibleHaeuserIds, getAccessibleWohnungIds } from "@/lib/object-scope";
import { formatPlzOrt } from "@/lib/address";
import { BEWERBER_PERSON_EMBED, MIETER_PERSON_EMBED, mitPersonenfeldern, type Person } from "@/lib/personen";
import { apiPermissionErrorResponse } from "@/lib/api-permission-response";
import type { Modul } from "@/lib/permissions-core";
import type {
  SearchResponse,
  SearchResult as FrontendSearchResult
} from "@/types/search"

// Database record interfaces

/** Zeile aus "Mieter" bzw. "Bewerber" für die Personensuche (GH-30): Name, E-Mail und Telefon stehen in der Person. */
interface TenantSuchZeile {
  id: string;
  einzug?: string | null;
  auszug?: string | null;
  person?: Person | Person[] | null;
  Wohnungen?: SuchWohnung | SuchWohnung[] | null;
}

interface SuchWohnung {
  name: string;
  Haeuser?: { name: string } | { name: string }[] | null;
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

// Module whose `ansehen` right a search category requires
const SEARCH_CATEGORY_MODULE: Record<string, Modul> = {
  tenant: 'mieter',
  house: 'haeuser',
  apartment: 'wohnungen',
  finance: 'finanzen',
  task: 'aufgaben',
};

// Obergrenzen der Personensuche (GH-30): Treffer an "Personen" und Kandidaten an Mieter/Bewerber vor der Sortierung
const PERSONEN_TREFFER_LIMIT = 200;
const SUCHE_KANDIDATEN_LIMIT = 100;

/**
 * Suchbedingungen für "Personen" (PostgREST-or). Vorname, Nachname, E-Mail und (ohne "@") Telefon werden per ILIKE
 * geprüft; bei genau zwei Wörtern zusätzlich "Vorname Nachname" und "Nachname Vorname".
 * Kommas und Klammern werden aus den Wörtern entfernt, weil sie die or-Syntax zerlegen würden.
 */
function personenSuchBedingungen(pattern: string, words: string[], mitTelefon: boolean): string[] {
  const bedingungen = [
    `vorname.ilike.${pattern}`,
    `nachname.ilike.${pattern}`,
    `email.ilike.${pattern}`,
  ];
  if (mitTelefon) bedingungen.push(`telefon.ilike.${pattern}`);
  if (words.length === 2) {
    const [erstes, zweites] = words.map((wort) => wort.replace(/[(),]/g, ''));
    bedingungen.push(
      `and(vorname.ilike.%${erstes}%,nachname.ilike.%${zweites}%)`,
      `and(nachname.ilike.%${erstes}%,vorname.ilike.%${zweites}%)`
    );
  }
  return bedingungen;
}

/**
 * Ergebnis-Eintrag für einen Mieter oder Bewerber; Name, E-Mail und Telefon stammen aus der Person.
 * `is_applicant` kennzeichnet Bewerber: Die Oberfläche öffnet sie nicht als Mieter (es gibt keine Mieter-Route dafür).
 */
function zuTenantSucheintrag(zeile: TenantSuchZeile, istBewerber: boolean) {
  const person = mitPersonenfeldern(zeile);
  const wohnung = Array.isArray(zeile.Wohnungen) ? zeile.Wohnungen[0] : zeile.Wohnungen;
  const haus = wohnung ? (Array.isArray(wohnung.Haeuser) ? wohnung.Haeuser[0] : wohnung.Haeuser) : undefined;
  return {
    id: zeile.id,
    name: person.name,
    email: person.email || undefined,
    phone: person.telefonnummer || undefined,
    apartment: wohnung ? {
      name: wohnung.name || '',
      house_name: haus?.name || ''
    } : undefined,
    status: zeile.auszug ? 'moved_out' as const : 'active' as const,
    move_in_date: zeile.einzug || undefined,
    move_out_date: zeile.auszug || undefined,
    is_applicant: istBewerber
  };
}

// In-memory cache for search patterns with expiration
const searchPatternCache = new Map<string, { pattern: string; exact: string; fuzzy?: string; words?: string[]; timestamp: number }>();
const PATTERN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to sanitize search query for SQL LIKE/ILIKE
function sanitizeQuery(query: string): string {
  // Escape backslash first, then % and _
  return query.trim().replace(/[\\%_]/g, '\\$&');
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
  
  const trimmed = query.trim();
  const sanitized = sanitizeQuery(trimmed);
  const pattern = `%${sanitized}%`;
  const exact = sanitized;
  
  // Create fuzzy pattern for better matching
  // We split the original query and sanitize each character to avoid breaking escape sequences
  const fuzzy = trimmed.split('').map(char => sanitizeQuery(char)).join('%');
  
  // Split into words for multi-word search
  const words = trimmed.split(/\s+/).filter(word => word.length > 0).map(word => sanitizeQuery(word));
  
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
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    
    if (query.length > 100) {
      return NextResponse.json({ 
        error: 'Search query too long' 
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    
    // Validate limit
    if (limit < 1 || limit > 20) {
      return NextResponse.json({ 
        error: 'Limit must be between 1 and 20' 
      }, { status: 400, headers: NO_CACHE_HEADERS });
    }
    
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    // Every requested category needs the `ansehen` right of its module; without it the category is skipped (empty
    // result, no error). mieter:ansehen also decides whether the apartment category delivers `current_tenant`, so it
    // is checked for `apartment` as well. Only the requested categories are checked. The checks run together with the
    // scope lookups (no extra round-trip); a failed check throws PermissionCheckError (503, see the catch) instead of
    // being shown as "no access".
    const { hasApiPermission } = await import("@/lib/api-permissions");
    const requestedCategories = new Set(categories);
    const modulesToCheck = new Set<Modul>();
    for (const [category, modul] of Object.entries(SEARCH_CATEGORY_MODULE)) {
      if (requestedCategories.has(category)) modulesToCheck.add(modul);
    }
    if (requestedCategories.has('apartment')) modulesToCheck.add('mieter');
    const modules = Array.from(modulesToCheck);
    const [accessibleHaeuserIds, accessibleWohnungIds, ...grants] = await Promise.all([
      getAccessibleHaeuserIds(),
      getAccessibleWohnungIds(),
      ...modules.map((modul) => hasApiPermission(modul, 'ansehen')),
    ]);
    const grantedModules = new Set(modules.filter((_, i) => grants[i]));
    const canSearchCategory = (category: string) => grantedModules.has(SEARCH_CATEGORY_MODULE[category]);
    const canViewTenantsOfApartments = grantedModules.has('mieter');
    // Without mieter:ansehen only `auszug` (for the status rented / free) is read from Mieter: no name, no move-in
    // date of a tenant is even loaded for the apartment results
    // GH-30: der Name steht in der eingebetteten Person von "Mieter" (nicht mehr in der Spalte name).
    const apartmentMieterColumns = canViewTenantsOfApartments ? `einzug, auszug, ${MIETER_PERSON_EMBED}` : 'auszug';
    
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
    
    // Search tenants (Mieter) und Bewerber (GH-30): Name, E-Mail und Telefon stehen in "Personen". Die Suche findet
    // passende Personen und ordnet sie über Mieter.person_id bzw. Bewerber.person_id den Mietern und Bewerbern zu.
    if (categories.includes('tenant')) {
      if (!canSearchCategory('tenant') || (accessibleWohnungIds !== null && accessibleWohnungIds.length === 0)) {
        searchPromises.push(Promise.resolve({ type: 'tenant' as const, data: [] }));
      } else {
        searchPromises.push(
          (async () => {
            try {
              // 1. Personen-Treffer (bei "*" entfällt die Einschränkung auf Personen)
              let personIds: string[] | null = null;
              if (!isShowAllQuery) {
                const { data: personen, error: personenError } = await supabase
                  .from('Personen')
                  .select('id')
                  .or(personenSuchBedingungen(searchPattern, words, !searchPattern.includes('@')).join(','))
                  .order('nachname')
                  .order('vorname')
                  .limit(PERSONEN_TREFFER_LIMIT);

                if (personenError) {
                  console.error('Tenant search (Personen) error:', personenError);
                  return { type: 'tenant' as const, data: [] };
                }

                personIds = (personen ?? []).map((person: { id: string }) => person.id);
                if (personIds.length === 0) {
                  return { type: 'tenant' as const, data: [] };
                }
              }

              // 2. Mieter und Bewerber zu den Personen; Bewerber, die bereits angenommen sind, sind als Mieter erfasst
              let mieterQuery = supabase
                .from('Mieter')
                .select(`
                  id, wohnung_id, einzug, auszug, ${MIETER_PERSON_EMBED},
                  Wohnungen!left(name, Haeuser!left(name))
                `);
              let bewerberQuery = supabase
                .from('Bewerber')
                .select(`
                  id, wohnung_id, ${BEWERBER_PERSON_EMBED},
                  Wohnungen!left(name, Haeuser!left(name))
                `)
                .neq('status', 'angenommen');

              if (personIds !== null) {
                mieterQuery = mieterQuery.in('person_id', personIds);
                bewerberQuery = bewerberQuery.in('person_id', personIds);
              }
              if (accessibleWohnungIds !== null) {
                mieterQuery = mieterQuery.in('wohnung_id', accessibleWohnungIds);
                // Bewerber dürfen ohne Wohnung sein (RLS erlaubt das), deshalb auch "wohnung_id is null" zulassen.
                bewerberQuery = bewerberQuery.or(`wohnung_id.is.null,wohnung_id.in.(${accessibleWohnungIds.join(',')})`);
              }

              const [mieterErgebnis, bewerberErgebnis] = await Promise.all([
                mieterQuery.limit(SUCHE_KANDIDATEN_LIMIT),
                bewerberQuery.limit(SUCHE_KANDIDATEN_LIMIT),
              ]);

              if (mieterErgebnis.error) {
                console.error('Tenant search error:', mieterErgebnis.error);
                return { type: 'tenant' as const, data: [] };
              }
              if (bewerberErgebnis.error) {
                console.error('Applicant search error:', bewerberErgebnis.error);
              }

              const mieterZeilen = (mieterErgebnis.data ?? []) as TenantSuchZeile[];
              const bewerberZeilen = bewerberErgebnis.error ? [] : ((bewerberErgebnis.data ?? []) as TenantSuchZeile[]);

              // Keine Personennamen in Logs: nur Anzahlen
              if (process.env.NODE_ENV === 'development') {
                console.log(`Tenant search found ${mieterZeilen.length} tenants and ${bewerberZeilen.length} applicants`);
              }

              const eintraege = [
                ...mieterZeilen.map((zeile) => zuTenantSucheintrag(zeile, false)),
                ...bewerberZeilen.map((zeile) => zuTenantSucheintrag(zeile, true)),
              ];
              const sortierteEintraege = sortByRelevance(eintraege, query).slice(0, limit);

              return { type: 'tenant' as const, data: sortierteEintraege };
            } catch (error) {
              console.error('Error searching tenants:', error);
              return { type: 'tenant' as const, data: [] };
            }
          })()
        );
      }
    }

    // Search houses (Haeuser) - Enhanced with better address matching
    if (categories.includes('house')) {
      if (!canSearchCategory('house') || (accessibleHaeuserIds !== null && accessibleHaeuserIds.length === 0)) {
        searchPromises.push(Promise.resolve({ type: 'house' as const, data: [] }));
      } else {
        searchPromises.push(
          (async () => {
            try {
              let queryBuilder = supabase
                .from('Haeuser')
                .select(`
                  id, name, strasse, plz, ort,
                  Wohnungen!left(id, miete, Mieter!left(id, auszug))
                `);

              if (accessibleHaeuserIds !== null) {
                queryBuilder = queryBuilder.in('id', accessibleHaeuserIds);
              }

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
                address: [house.strasse, formatPlzOrt(house.plz, house.ort)].filter(Boolean).join(', '),
                apartment_count: apartments.length,
                total_rent: totalRent,
                free_apartments: freeApartments
              };
            });
            
            if (process.env.NODE_ENV === 'development') {
              console.log('Returning %d house results:', houseResults.length, houseResults.map(h => ({ id: h.id, name: h.name, address: h.address })));
            }
            
            return { type: 'house', data: houseResults };
          } catch (error) {
            console.error('Error searching houses:', error);
            return { type: 'house', data: [] };
          }
        })()
      );
    }
  }
    
    // Search apartments (Wohnungen) - Enhanced with house name search
    if (categories.includes('apartment')) {
      if (!canSearchCategory('apartment') || (accessibleHaeuserIds !== null && accessibleHaeuserIds.length === 0)) {
        searchPromises.push(Promise.resolve({ type: 'apartment' as const, data: [] }));
      } else {
        searchPromises.push(
          (async () => {
            try {
              let queryBuilder = supabase
                .from('Wohnungen')
                .select(`
                  id, name, groesse, miete,
                  Haeuser!left(name),
                  Mieter!left(${apartmentMieterColumns})
                `);

              if (accessibleHaeuserIds !== null) {
                queryBuilder = queryBuilder.in('haus_id', accessibleHaeuserIds);
              }

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
                  let houseQueryBuilder = supabase
                    .from('Wohnungen')
                    .select(`
                      id, name, groesse, miete,
                      Haeuser!left(name),
                      Mieter!left(${apartmentMieterColumns})
                    `)
                    .not('id', 'in', `(${data.map(d => d.id).join(',') || 'null'})`)
                    .or(`Haeuser.name.ilike.${searchPattern}`);

                  if (accessibleHaeuserIds !== null) {
                    houseQueryBuilder = houseQueryBuilder.in('haus_id', accessibleHaeuserIds);
                  }

                  const { data: houseData, error: houseError } = await houseQueryBuilder
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
                const currentTenantPerson = currentTenant ? mitPersonenfeldern(currentTenant) : undefined;
                
                return {
                  id: apartment.id,
                  name: apartment.name,
                  house_name: apartment.Haeuser && typeof apartment.Haeuser === 'object' && !Array.isArray(apartment.Haeuser) ? apartment.Haeuser.name : '',
                  size: apartment.groesse,
                  rent: apartment.miete,
                  status: currentTenant ? 'rented' : 'free',
                  // Without mieter:ansehen: no `current_tenant` (the status stays); `tenant_access: false` marks
                  // "no access" (not "no tenant")
                  ...(canViewTenantsOfApartments ? {} : { tenant_access: false as const }),
                  current_tenant: canViewTenantsOfApartments && currentTenant ? {
                    name: currentTenantPerson?.name ?? '',
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
    }
    
    // Search finances (Finanzen) - Optimized with conditional numeric search
    if (categories.includes('finance')) {
      if (!canSearchCategory('finance') || (accessibleWohnungIds !== null && accessibleWohnungIds.length === 0)) {
        searchPromises.push(Promise.resolve({ type: 'finance' as const, data: [] }));
      } else {
        const isNumericQuery = !isShowAllQuery && !isNaN(parseFloat(query));
        
        let financeQueryBuilder = supabase
          .from('Finanzen')
          .select(`
            id, name, betrag, datum, ist_einnahmen, notiz,
            Wohnungen!left(name, Haeuser!left(name))
          `);
          
        if (accessibleWohnungIds !== null) {
          financeQueryBuilder = financeQueryBuilder.in('wohnung_id', accessibleWohnungIds);
        }
        
        if (!isShowAllQuery) {
          if (isNumericQuery) {
            const amount = parseFloat(query);
            financeQueryBuilder = financeQueryBuilder.or(`name.ilike.${searchPattern},notiz.ilike.${searchPattern},betrag.eq.${amount}`);
          } else {
            financeQueryBuilder = financeQueryBuilder.or(`name.ilike.${searchPattern},notiz.ilike.${searchPattern}`);
          }
        }
        
        financeQueryBuilder = financeQueryBuilder
          .order('datum', { ascending: false })
          .limit(limit);
        
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
  }
    
    // Search tasks (Aufgaben) - Optimized with completion status ordering
    if (categories.includes('task') && !canSearchCategory('task')) {
      searchPromises.push(Promise.resolve({ type: 'task' as const, data: [] }));
    } else if (categories.includes('task')) {
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
      ...NO_CACHE_HEADERS,
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
    unstable_rethrow(error);
    console.error('Search API error:', error);

    // 503 PERMISSION_CHECK_FAILED if a module right could not be checked
    const permissionResponse = apiPermissionErrorResponse(error);
    if (permissionResponse) return permissionResponse;
    
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
    
    const responseHeaders: Record<string, string> = { ...NO_CACHE_HEADERS };
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