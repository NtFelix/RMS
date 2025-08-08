// Search functionality type definitions

// Core search interfaces
export interface SearchResultAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  variant?: 'default' | 'destructive';
}

export interface SearchResult {
  id: string;
  type: 'tenant' | 'house' | 'apartment' | 'finance' | 'task';
  title: string;
  subtitle?: string;
  context?: string;
  metadata?: Record<string, any>;
  actions?: SearchResultAction[];
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
}

// Entity-specific search result interfaces
export interface TenantSearchResult {
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

export interface HouseSearchResult {
  id: string;
  name: string;
  address: string;
  apartment_count: number;
  total_rent: number;
  free_apartments: number;
}

export interface ApartmentSearchResult {
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

export interface FinanceSearchResult {
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

export interface TaskSearchResult {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  created_date: string;
  due_date?: string;
}

// API response interface
export interface SearchResponse {
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

// Search categories type for filtering
export type SearchCategory = 'tenant' | 'house' | 'apartment' | 'finance' | 'task';

// Search parameters interface for API requests
export interface SearchParams {
  q: string;
  limit?: number;
  categories?: SearchCategory[];
}