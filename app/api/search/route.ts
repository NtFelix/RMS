export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import type {
  SearchResponse
} from "@/types/search";

export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Search query is required' 
      }, { status: 400 });
    }
    
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('search_all', {
      search_term: query
    });

    if (error) {
      console.error('Search RPC error:', error);
      throw new Error('Search failed');
    }

    const results: SearchResponse['results'] = {
      tenants: [],
      houses: [],
      apartments: [],
      finances: [],
      tasks: []
    };

    if (data) {
      data.forEach((item: any) => {
        switch (item.entity_type) {
          case 'tenant':
            results.tenants.push({
              id: item.id,
              name: item.name,
              email: item.email,
              phone: item.phone,
              status: item.status,
              move_in_date: item.move_in_date,
              move_out_date: item.move_out_date,
              apartment: item.apartment,
            });
            break;
          case 'house':
            results.houses.push({
              id: item.id,
              name: item.name,
              address: item.address,
              apartment_count: item.apartment_count,
              total_rent: item.total_rent,
              free_apartments: item.free_apartments,
            });
            break;
          case 'apartment':
            results.apartments.push({
              id: item.id,
              name: item.name,
              house_name: item.house_name,
              size: item.size,
              rent: item.rent,
              status: item.status,
              current_tenant: item.current_tenant,
            });
            break;
          case 'finance':
            results.finances.push({
              id: item.id,
              name: item.name,
              amount: item.amount,
              date: item.date,
              type: item.type,
              apartment: item.apartment,
              notes: item.notes,
            });
            break;
          case 'task':
            results.tasks.push({
              id: item.id,
              name: item.name,
              description: item.description,
              completed: item.completed,
              created_date: item.created_date,
            });
            break;
        }
      });
    }
    
    const totalCount = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
    const executionTime = Date.now() - startTime;
    
    const response: SearchResponse = {
      results,
      totalCount,
      executionTime
    };

    return new NextResponse(JSON.stringify(response), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
  } catch (error) {
    console.error('Search API error:', error);
    
    return NextResponse.json({ 
      error: 'Serverfehler bei der Suche.',
    }, { 
      status: 500,
    });
  }
}