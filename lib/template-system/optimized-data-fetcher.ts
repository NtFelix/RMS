/**
 * Optimized Data Fetcher for Template System
 * Provides lazy loading, pagination, and caching for entity data
 */

import { templateCacheManager } from './cache-manager';
import { createClient } from '@/utils/supabase/client';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EntityFetchOptions extends PaginationOptions {
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Optimized data fetcher with caching and lazy loading
 */
export class OptimizedDataFetcher {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Fetch templates with pagination and caching
   */
  async fetchTemplates(
    userId: string, 
    options: EntityFetchOptions = {}
  ): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'erstellungsdatum',
      sortOrder = 'desc',
      search,
      filters = {}
    } = options;

    // Generate cache key
    const cacheKey = `templates:${userId}:${JSON.stringify(options)}`;
    const cached = templateCacheManager.entityCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      let query = this.supabase
        .from('Vorlagen')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply search filter
      if (search) {
        query = query.or(`titel.ilike.%${search}%,inhalt.ilike.%${search}%`);
      }

      // Apply additional filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const result: PaginatedResult<any> = {
        data: data || [],
        total: count || 0,
        page,
        limit,
        hasMore: (count || 0) > page * limit
      };

      // Cache the result
      templateCacheManager.entityCache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes

      return result;
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  }

  /**
   * Fetch single template by ID with caching
   */
  async fetchTemplate(userId: string, templateId: string): Promise<any | null> {
    const cacheKey = templateCacheManager.generateEntityKey('template', templateId);
    const cached = templateCacheManager.entityCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await this.supabase
        .from('Vorlagen')
        .select('*')
        .eq('id', templateId)
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      // Cache the result
      templateCacheManager.entityCache.set(cacheKey, data, 10 * 60 * 1000); // 10 minutes

      return data;
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  /**
   * Fetch tenants with lazy loading and caching
   */
  async fetchTenants(
    userId: string, 
    options: EntityFetchOptions = {}
  ): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortOrder = 'asc',
      search
    } = options;

    const cacheKey = `tenants:${userId}:${JSON.stringify(options)}`;
    const cached = templateCacheManager.entityCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      let query = this.supabase
        .from('Mieter')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const result: PaginatedResult<any> = {
        data: data || [],
        total: count || 0,
        page,
        limit,
        hasMore: (count || 0) > page * limit
      };

      // Cache the result
      templateCacheManager.entityCache.set(cacheKey, result, 3 * 60 * 1000); // 3 minutes

      return result;
    } catch (error) {
      console.error('Error fetching tenants:', error);
      throw error;
    }
  }

  /**
   * Fetch apartments with lazy loading and caching
   */
  async fetchApartments(
    userId: string, 
    options: EntityFetchOptions = {}
  ): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortOrder = 'asc',
      search,
      filters = {}
    } = options;

    const cacheKey = `apartments:${userId}:${JSON.stringify(options)}`;
    const cached = templateCacheManager.entityCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      let query = this.supabase
        .from('Wohnungen')
        .select('*, Haeuser(name, ort)', { count: 'exact' })
        .eq('user_id', userId);

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      // Apply house filter if provided
      if (filters.haus_id) {
        query = query.eq('haus_id', filters.haus_id);
      }

      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const result: PaginatedResult<any> = {
        data: data || [],
        total: count || 0,
        page,
        limit,
        hasMore: (count || 0) > page * limit
      };

      // Cache the result
      templateCacheManager.entityCache.set(cacheKey, result, 3 * 60 * 1000); // 3 minutes

      return result;
    } catch (error) {
      console.error('Error fetching apartments:', error);
      throw error;
    }
  }

  /**
   * Fetch houses with lazy loading and caching
   */
  async fetchHouses(
    userId: string, 
    options: EntityFetchOptions = {}
  ): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortOrder = 'asc',
      search
    } = options;

    const cacheKey = `houses:${userId}:${JSON.stringify(options)}`;
    const cached = templateCacheManager.entityCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      let query = this.supabase
        .from('Haeuser')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (search) {
        query = query.or(`name.ilike.%${search}%,ort.ilike.%${search}%`);
      }

      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const result: PaginatedResult<any> = {
        data: data || [],
        total: count || 0,
        page,
        limit,
        hasMore: (count || 0) > page * limit
      };

      // Cache the result
      templateCacheManager.entityCache.set(cacheKey, result, 3 * 60 * 1000); // 3 minutes

      return result;
    } catch (error) {
      console.error('Error fetching houses:', error);
      throw error;
    }
  }

  /**
   * Fetch single entity by ID with caching
   */
  async fetchEntity(
    table: 'Mieter' | 'Wohnungen' | 'Haeuser',
    userId: string,
    entityId: string
  ): Promise<any | null> {
    const cacheKey = templateCacheManager.generateEntityKey(table.toLowerCase(), entityId);
    const cached = templateCacheManager.entityCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await this.supabase
        .from(table)
        .select('*')
        .eq('id', entityId)
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      // Cache the result
      templateCacheManager.entityCache.set(cacheKey, data, 5 * 60 * 1000); // 5 minutes

      return data;
    } catch (error) {
      console.error(`Error fetching ${table} entity:`, error);
      return null;
    }
  }

  /**
   * Preload commonly used entities
   */
  async preloadEntities(userId: string): Promise<void> {
    try {
      // Preload recent templates
      await this.fetchTemplates(userId, { limit: 10 });

      // Preload active tenants
      await this.fetchTenants(userId, { limit: 20 });

      // Preload apartments
      await this.fetchApartments(userId, { limit: 20 });

      // Preload houses
      await this.fetchHouses(userId, { limit: 10 });
    } catch (error) {
      console.error('Error preloading entities:', error);
    }
  }

  /**
   * Invalidate cache for specific entity type
   */
  invalidateEntityCache(entityType: string, userId?: string): void {
    const stats = templateCacheManager.getAllStats();
    
    // Clear all entity cache entries that match the pattern
    Object.keys(stats.entity).forEach(key => {
      if (key.includes(entityType) && (!userId || key.includes(userId))) {
        templateCacheManager.entityCache.delete(key);
      }
    });
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return templateCacheManager.getAllStats();
  }
}

// Export singleton instance
export const optimizedDataFetcher = new OptimizedDataFetcher();