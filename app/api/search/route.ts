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
    
    const results: SearchResponse['results'] = {
      tenants: [],
      houses: [],
      apartments: [],
      finances: [],
      tasks: []
    };
    
    console.log("Searching for tenants with query:", query);

    const { data, error } = await supabase
      .from('Mieter')
      .select('id, name, email, telefonnummer, einzug, auszug')
      .ilike('name', `%${query}%`);

    console.log("Supabase query data:", data);
    console.log("Supabase query error:", error);

    if (data) {
      results.tenants = data.map((tenant: any) => ({
        id: tenant.id,
        name: tenant.name,
        email: tenant.email || undefined,
        phone: tenant.telefonnummer || undefined,
        apartment: undefined,
        status: tenant.auszug ? 'moved_out' : 'active',
        move_in_date: tenant.einzug || undefined,
        move_out_date: tenant.auszug || undefined
      }));
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