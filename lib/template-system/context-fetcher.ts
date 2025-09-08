/**
 * Context Data Fetcher
 * Handles fetching entity data from Supabase for template processing
 */

import { createClient } from '@/utils/supabase/server';
import type { TemplateContext } from '@/types/template-system';
import type { Tenant } from '@/types/Tenant';
import type { Apartment } from '@/components/apartment-table';
import type { House } from '@/components/house-table';

/**
 * Context Fetcher Class
 * Handles fetching entity data for template processing
 */
export class ContextFetcher {
  private supabase;
  
  constructor() {
    this.supabase = createClient();
  }
  
  private async getSupabase() {
    return await this.supabase;
  }
  
  /**
   * Fetch complete context data for template processing
   */
  async fetchTemplateContext(
    mieterId?: string,
    wohnungId?: string,
    hausId?: string,
    userId?: string
  ): Promise<TemplateContext> {
    const context: TemplateContext = {
      datum: new Date()
    };
    
    try {
      // Fetch tenant data if ID provided
      if (mieterId) {
        const tenant = await this.fetchTenant(mieterId);
        if (tenant) {
          context.mieter = {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            telefonnummer: tenant.telefonnummer,
            einzug: tenant.einzug,
            auszug: tenant.auszug,
            notiz: tenant.notiz,
            nebenkosten: Array.isArray(tenant.nebenkosten) ? tenant.nebenkosten.length : undefined,
            wohnung_id: tenant.wohnung_id
          };
          
          // If tenant has a wohnung_id and no wohnungId was provided, use it
          if (!wohnungId && context.mieter.wohnung_id) {
            wohnungId = context.mieter.wohnung_id;
          }
        }
      }
      
      // Fetch apartment data if ID provided
      if (wohnungId) {
        context.wohnung = await this.fetchApartment(wohnungId);
        
        // If apartment has a haus_id and no hausId was provided, use it
        if (!hausId && context.wohnung?.haus_id) {
          hausId = context.wohnung.haus_id;
        }
      }
      
      // Fetch house data if ID provided
      if (hausId) {
        context.haus = await this.fetchHouse(hausId);
      }
      
      // Fetch landlord data if user ID provided
      if (userId) {
        context.vermieter = await this.fetchLandlord(userId);
      }
      
      return context;
    } catch (error) {
      console.error('Error fetching template context:', error);
      return context; // Return partial context even if some fetches fail
    }
  }
  
  /**
   * Fetch tenant data by ID
   */
  async fetchTenant(mieterId: string): Promise<Tenant | undefined> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from('Mieter')
        .select('*')
        .eq('id', mieterId)
        .single();
      
      if (error) {
        console.error('Error fetching tenant:', error);
        return undefined;
      }
      
      return data as Tenant;
    } catch (error) {
      console.error('Error fetching tenant:', error);
      return undefined;
    }
  }
  
  /**
   * Fetch apartment data by ID with house information
   */
  async fetchApartment(wohnungId: string): Promise<Apartment | undefined> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from('Wohnungen')
        .select(`
          *,
          Haeuser (
            name
          ),
          Mieter (
            id,
            name,
            einzug,
            auszug
          )
        `)
        .eq('id', wohnungId)
        .single();
      
      if (error) {
        console.error('Error fetching apartment:', error);
        return undefined;
      }
      
      // Transform data to match Apartment interface
      const apartment: Apartment = {
        id: data.id,
        name: data.name,
        groesse: data.groesse,
        miete: data.miete,
        haus_id: data.haus_id,
        Haeuser: data.Haeuser,
        status: data.Mieter && data.Mieter.length > 0 ? 'vermietet' : 'frei',
        tenant: data.Mieter && data.Mieter.length > 0 ? {
          id: data.Mieter[0].id,
          name: data.Mieter[0].name,
          einzug: data.Mieter[0].einzug,
          auszug: data.Mieter[0].auszug
        } : null
      };
      
      return apartment;
    } catch (error) {
      console.error('Error fetching apartment:', error);
      return undefined;
    }
  }
  
  /**
   * Fetch house data by ID
   */
  async fetchHouse(hausId: string): Promise<House | undefined> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from('Haeuser')
        .select('*')
        .eq('id', hausId)
        .single();
      
      if (error) {
        console.error('Error fetching house:', error);
        return undefined;
      }
      
      // Transform data to match House interface
      const house: House = {
        id: data.id,
        name: data.name,
        strasse: data.strasse,
        ort: data.ort,
        size: data.groesse?.toString(),
        rent: data.miete?.toString(),
        pricePerSqm: data.groesse && data.miete ? 
          (data.miete / data.groesse).toFixed(2) : undefined
      };
      
      return house;
    } catch (error) {
      console.error('Error fetching house:', error);
      return undefined;
    }
  }
  
  /**
   * Fetch landlord/user data by ID
   */
  async fetchLandlord(userId: string): Promise<{ id: string; name?: string; email?: string } | undefined> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase.auth.getUser();
      
      if (error || !data.user) {
        console.error('Error fetching user:', error);
        return undefined;
      }
      
      return {
        id: data.user.id,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
        email: data.user.email
      };
    } catch (error) {
      console.error('Error fetching landlord:', error);
      return undefined;
    }
  }
  
  /**
   * Fetch available entities for context selection
   */
  async fetchAvailableEntities(userId: string) {
    try {
      const supabase = await this.getSupabase();
      const [mieterResult, wohnungenResult, haeuserResult] = await Promise.all([
        supabase
          .from('Mieter')
          .select('id, name, wohnung_id')
          .eq('user_id', userId)
          .order('name'),
        
        supabase
          .from('Wohnungen')
          .select('id, name, haus_id')
          .eq('user_id', userId)
          .order('name'),
        
        supabase
          .from('Haeuser')
          .select('id, name')
          .eq('user_id', userId)
          .order('name')
      ]);
      
      return {
        mieter: mieterResult.data || [],
        wohnungen: wohnungenResult.data || [],
        haeuser: haeuserResult.data || []
      };
    } catch (error) {
      console.error('Error fetching available entities:', error);
      return {
        mieter: [],
        wohnungen: [],
        haeuser: []
      };
    }
  }
  
  /**
   * Fetch related entities based on selection
   * For example, if a tenant is selected, fetch their apartment and house
   */
  async fetchRelatedEntities(
    mieterId?: string,
    wohnungId?: string,
    hausId?: string
  ): Promise<{
    relatedWohnung?: { id: string; name: string; haus_id?: string };
    relatedHaus?: { id: string; name: string };
    relatedMieter?: { id: string; name: string; wohnung_id?: string }[];
  }> {
    const result: {
      relatedWohnung?: { id: string; name: string; haus_id?: string };
      relatedHaus?: { id: string; name: string };
      relatedMieter?: { id: string; name: string; wohnung_id?: string }[];
    } = {};
    
    try {
      const supabase = await this.getSupabase();
      
      // If tenant is selected, fetch their apartment
      if (mieterId) {
        const { data: mieter } = await supabase
          .from('Mieter')
          .select('wohnung_id')
          .eq('id', mieterId)
          .single();
        
        if (mieter?.wohnung_id) {
          const { data: wohnung } = await supabase
            .from('Wohnungen')
            .select('id, name, haus_id')
            .eq('id', mieter.wohnung_id)
            .single();
          
          if (wohnung) {
            result.relatedWohnung = wohnung;
            wohnungId = wohnung.id;
          }
        }
      }
      
      // If apartment is selected, fetch its house and tenants
      if (wohnungId) {
        const [wohnungResult, mieterResult] = await Promise.all([
          supabase
            .from('Wohnungen')
            .select('haus_id')
            .eq('id', wohnungId)
            .single(),
          
          supabase
            .from('Mieter')
            .select('id, name, wohnung_id')
            .eq('wohnung_id', wohnungId)
        ]);
        
        if (wohnungResult.data?.haus_id) {
          hausId = wohnungResult.data.haus_id;
        }
        
        if (mieterResult.data) {
          result.relatedMieter = mieterResult.data;
        }
      }
      
      // If house is selected or determined, fetch house data
      if (hausId) {
        const { data: haus } = await supabase
          .from('Haeuser')
          .select('id, name')
          .eq('id', hausId)
          .single();
        
        if (haus) {
          result.relatedHaus = haus;
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching related entities:', error);
      return result;
    }
  }
}

// Export singleton instance
export const contextFetcher = new ContextFetcher();

// Export utility functions
export async function fetchTemplateContext(
  mieterId?: string,
  wohnungId?: string,
  hausId?: string,
  userId?: string
): Promise<TemplateContext> {
  return contextFetcher.fetchTemplateContext(mieterId, wohnungId, hausId, userId);
}

export async function fetchAvailableEntities(userId: string) {
  return contextFetcher.fetchAvailableEntities(userId);
}

export async function fetchRelatedEntities(
  mieterId?: string,
  wohnungId?: string,
  hausId?: string
) {
  return contextFetcher.fetchRelatedEntities(mieterId, wohnungId, hausId);
}