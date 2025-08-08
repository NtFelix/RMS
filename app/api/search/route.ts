export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// Search result interfaces
interface TenantSearchResult {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  apartment?: {
    name: string;
    house_name: string;
  };
  status: 'active' | 'moved_out';
  move_in_date?: string;
  move_out_date?: string;
}

interface HouseSearchResult {
  id: string;
  name: string;
  address: string;
  apartment_count: number;
  total_rent: number;
  free_apartments: number;
}

interface ApartmentSearchResult {
  id: string;
  name: string;
  house_name: string;
  size: number;
  rent: number;
  status: 'free' | 'rented';
  current_tenant?: {
    name: string;
    move_in_date: string;
  };
}

interface FinanceSearchResult {
  id: string;
  name: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
  apartment?: {
    name: string;
    house_name: string;
  };
  notes?: string;
}

interface TaskSearchResult {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  created_date: string;
  due_date?: string;
}

interface SearchResponse {
  results: {
    tenants: TenantSearchResult[];
    houses: HouseSearchResult[];
    apartments: ApartmentSearchResult[];
    finances: FinanceSearchResult[];
    tasks: TaskSearchResult[];
  };
  totalCount: number;
  executionTime: number;
}

// Helper function to sanitize search query
function sanitizeQuery(query: string): string {
  return query.trim().replace(/[%_]/g, '\\$&');
}

// Helper function to create search pattern
function createSearchPattern(query: string): string {
  const sanitized = sanitizeQuery(query);
  return `%${sanitized}%`;
}

// Helper function to create exact match pattern
function createExactPattern(query: string): string {
  return sanitizeQuery(query);
}

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
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
    const searchPattern = createSearchPattern(query);
    
    const results: SearchResponse['results'] = {
      tenants: [],
      houses: [],
      apartments: [],
      finances: [],
      tasks: []
    };
    
    // Search tenants (Mieter)
    if (categories.includes('tenants')) {
      try {
        const { data: tenantData, error: tenantError } = await supabase
          .from('Mieter')
          .select(`
            id, name, email, telefonnummer, einzug, auszug,
            Wohnungen(name, Haeuser(name))
          `)
          .or(`name.ilike.${searchPattern},email.ilike.${searchPattern},telefonnummer.ilike.${searchPattern}`)
          .order('name')
          .limit(limit);
          
        if (tenantError) {
          console.error('Tenant search error:', tenantError);
        } else if (tenantData) {
          // Sort by relevance: exact matches first, then partial matches
          const sortedTenants = tenantData.sort((a, b) => {
            const aExact = a.name.toLowerCase() === query.toLowerCase();
            const bExact = b.name.toLowerCase() === query.toLowerCase();
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return a.name.localeCompare(b.name);
          });
          
          results.tenants = sortedTenants.map(tenant => ({
            id: tenant.id,
            name: tenant.name,
            email: tenant.email || undefined,
            phone: tenant.telefonnummer || undefined,
            apartment: tenant.Wohnungen && Array.isArray(tenant.Wohnungen) && tenant.Wohnungen.length > 0 ? {
              name: tenant.Wohnungen[0].name,
              house_name: tenant.Wohnungen[0].Haeuser && Array.isArray(tenant.Wohnungen[0].Haeuser) && tenant.Wohnungen[0].Haeuser.length > 0 
                ? tenant.Wohnungen[0].Haeuser[0].name 
                : ''
            } : undefined,
            status: tenant.auszug ? 'moved_out' : 'active',
            move_in_date: tenant.einzug || undefined,
            move_out_date: tenant.auszug || undefined
          }));
        }
      } catch (error) {
        console.error('Error searching tenants:', error);
      }
    }
    
    // Search houses (Haeuser)
    if (categories.includes('houses')) {
      try {
        const { data: houseData, error: houseError } = await supabase
          .from('Haeuser')
          .select(`
            id, name, strasse, ort, groesse,
            Wohnungen(id, miete, Mieter(id, auszug))
          `)
          .or(`name.ilike.${searchPattern},strasse.ilike.${searchPattern},ort.ilike.${searchPattern}`)
          .order('name')
          .limit(limit);
          
        if (houseError) {
          console.error('House search error:', houseError);
        } else if (houseData) {
          // Sort by relevance
          const sortedHouses = houseData.sort((a, b) => {
            const aExact = a.name.toLowerCase() === query.toLowerCase();
            const bExact = b.name.toLowerCase() === query.toLowerCase();
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return a.name.localeCompare(b.name);
          });
          
          results.houses = sortedHouses.map(house => {
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
        }
      } catch (error) {
        console.error('Error searching houses:', error);
      }
    }
    
    // Search apartments (Wohnungen)
    if (categories.includes('apartments')) {
      try {
        const { data: apartmentData, error: apartmentError } = await supabase
          .from('Wohnungen')
          .select(`
            id, name, groesse, miete,
            Haeuser(name),
            Mieter(name, einzug, auszug)
          `)
          .ilike('name', searchPattern)
          .order('name')
          .limit(limit);
          
        if (apartmentError) {
          console.error('Apartment search error:', apartmentError);
        } else if (apartmentData) {
          // Sort by relevance
          const sortedApartments = apartmentData.sort((a, b) => {
            const aExact = a.name.toLowerCase() === query.toLowerCase();
            const bExact = b.name.toLowerCase() === query.toLowerCase();
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return a.name.localeCompare(b.name);
          });
          
          results.apartments = sortedApartments.map(apartment => {
            const mieterArray = Array.isArray(apartment.Mieter) ? apartment.Mieter : [];
            const currentTenant = mieterArray.find(m => !m.auszug);
            const haeuser = Array.isArray(apartment.Haeuser) ? apartment.Haeuser[0] : apartment.Haeuser;
            
            return {
              id: apartment.id,
              name: apartment.name,
              house_name: haeuser?.name || '',
              size: apartment.groesse,
              rent: apartment.miete,
              status: currentTenant ? 'rented' : 'free',
              current_tenant: currentTenant ? {
                name: currentTenant.name,
                move_in_date: currentTenant.einzug || ''
              } : undefined
            };
          });
        }
      } catch (error) {
        console.error('Error searching apartments:', error);
      }
    }
    
    // Search finances (Finanzen)
    if (categories.includes('finances')) {
      try {
        // Handle numeric search for amount
        const isNumericQuery = !isNaN(parseFloat(query));
        let financeQuery = supabase
          .from('Finanzen')
          .select(`
            id, name, betrag, datum, ist_einnahmen, notiz,
            Wohnungen(name, Haeuser(name))
          `)
          .order('datum', { ascending: false })
          .limit(limit);
          
        if (isNumericQuery) {
          const amount = parseFloat(query);
          financeQuery = financeQuery.or(`name.ilike.${searchPattern},notiz.ilike.${searchPattern},betrag.eq.${amount}`);
        } else {
          financeQuery = financeQuery.or(`name.ilike.${searchPattern},notiz.ilike.${searchPattern}`);
        }
        
        const { data: financeData, error: financeError } = await financeQuery;
          
        if (financeError) {
          console.error('Finance search error:', financeError);
        } else if (financeData) {
          // Sort by relevance
          const sortedFinances = financeData.sort((a, b) => {
            const aExact = a.name.toLowerCase() === query.toLowerCase();
            const bExact = b.name.toLowerCase() === query.toLowerCase();
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            // Then by date (most recent first)
            return new Date(b.datum).getTime() - new Date(a.datum).getTime();
          });
          
          results.finances = sortedFinances.map(finance => {
            const wohnung = Array.isArray(finance.Wohnungen) ? finance.Wohnungen[0] : finance.Wohnungen;
            const haus = wohnung?.Haeuser ? (Array.isArray(wohnung.Haeuser) ? wohnung.Haeuser[0] : wohnung.Haeuser) : null;
            
            return {
              id: finance.id,
              name: finance.name,
              amount: finance.betrag,
              date: finance.datum,
              type: finance.ist_einnahmen ? 'income' : 'expense',
              apartment: wohnung ? {
                name: wohnung.name,
                house_name: haus?.name || ''
              } : undefined,
              notes: finance.notiz || undefined
            };
          });
        }
      } catch (error) {
        console.error('Error searching finances:', error);
      }
    }
    
    // Search tasks (Aufgaben)
    if (categories.includes('tasks')) {
      try {
        const { data: taskData, error: taskError } = await supabase
          .from('Aufgaben')
          .select('id, name, beschreibung, ist_erledigt, erstellungsdatum')
          .or(`name.ilike.${searchPattern},beschreibung.ilike.${searchPattern}`)
          .order('erstellungsdatum', { ascending: false })
          .limit(limit);
          
        if (taskError) {
          console.error('Task search error:', taskError);
        } else if (taskData) {
          // Sort by relevance
          const sortedTasks = taskData.sort((a, b) => {
            const aExact = a.name.toLowerCase() === query.toLowerCase();
            const bExact = b.name.toLowerCase() === query.toLowerCase();
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            // Then by completion status (incomplete first) and date
            if (a.ist_erledigt !== b.ist_erledigt) {
              return a.ist_erledigt ? 1 : -1;
            }
            return new Date(b.erstellungsdatum).getTime() - new Date(a.erstellungsdatum).getTime();
          });
          
          results.tasks = sortedTasks.map(task => ({
            id: task.id,
            name: task.name,
            description: task.beschreibung,
            completed: task.ist_erledigt,
            created_date: task.erstellungsdatum
          }));
        }
      } catch (error) {
        console.error('Error searching tasks:', error);
      }
    }
    
    const totalCount = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
    const executionTime = Date.now() - startTime;
    
    const response: SearchResponse = {
      results,
      totalCount,
      executionTime
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ 
      error: 'Serverfehler bei der Suche.' 
    }, { status: 500 });
  }
}