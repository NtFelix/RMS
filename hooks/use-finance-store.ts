import { create } from 'zustand';

import { Finanz, Totals } from '@/types';

type FinanceFilter = 'apartmentId' | 'year' | 'type' | 'searchQuery';

interface FinanceState {
  transactions: Finanz[];
  totalCount: number;
  totals: Totals;
  isLoading: boolean;
  isAppending: boolean;
  error: string | null;
  page: number;
  limit: number;
  hasMore: boolean;
  // Filters
  apartmentId: string;
  year: string;
  type: string;
  searchQuery: string;

  // Actions
  setFilter: (filter: Partial<Pick<FinanceState, FinanceFilter>>) => void;
  fetchTransactions: (options?: { force: boolean }) => Promise<void>;
  fetchNextPage: () => void;
  setLimit: (limit: number) => void;
  retry: () => void;
  initialize: (initialData: { transactions: Finanz[], totalCount: number, totals: Totals }) => void;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  // Initial State
  transactions: [],
  totalCount: 0,
  totals: { income: 0, expense: 0, balance: 0 },
  isLoading: false,
  isAppending: false,
  error: null,
  page: 1,
  limit: 25, // Default for desktop
  hasMore: true,
  // Filters
  apartmentId: 'Alle Wohnungen',
  year: 'Alle Jahre',
  type: 'Alle Transaktionen',
  searchQuery: '',

  // --- ACTIONS ---

  // Called from the page component to load initial server-rendered data
  initialize: (initialData) => {
    set({
      transactions: initialData.transactions,
      totalCount: initialData.totalCount,
      totals: initialData.totals,
      page: 1,
      hasMore: initialData.transactions.length < initialData.totalCount,
      isLoading: false,
    });
  },

  // Used to set the responsive page limit
  setLimit: (limit: number) => {
    set({ limit });
  },

  // Generic function to update a filter value
  setFilter: (filter: Partial<Pick<FinanceState, FinanceFilter>>) => {
    const currentState = get();
    // Check if the filter value has actually changed to prevent unnecessary re-fetching
    const hasChanged = Object.entries(filter).some(([key, value]) => currentState[key as FinanceFilter] !== value);

    if (hasChanged) {
        set({ ...filter, page: 1, error: null });
        get().fetchTransactions({ force: true });
    }
  },

  // Main data fetching function
  fetchTransactions: async (options?: { force?: boolean }) => {
    const { page, limit, apartmentId, year, type, searchQuery, isAppending, isLoading } = get();

    // Prevent concurrent fetches
    if (!options?.force && (isAppending || isLoading)) return;

    if (page === 1) {
      set({ isLoading: true, error: null });
    } else {
      set({ isAppending: true, error: null });
    }

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (apartmentId && apartmentId !== 'Alle Wohnungen') params.set('apartmentId', apartmentId);
      if (year && year !== 'Alle Jahre') params.set('year', year);
      if (type && type !== 'Alle Transaktionen') params.set('type', type);
      if (searchQuery) params.set('searchQuery', searchQuery);

      const response = await fetch(`/api/finanzen?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch transactions');
      }
      const data: { transactions: Finanz[], totalCount: number, totals: Totals } = await response.json();

      set(state => {
        const newTransactions = page === 1 ? data.transactions : [...state.transactions, ...data.transactions];
        return {
          transactions: newTransactions,
          totalCount: data.totalCount,
          totals: data.totals,
          hasMore: newTransactions.length < data.totalCount,
        };
      });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false, isAppending: false });
    }
  },

  // Fetches the next page if available
  fetchNextPage: () => {
    const { hasMore, isAppending, isLoading } = get();
    if (hasMore && !isAppending && !isLoading) {
      set(state => ({ page: state.page + 1 }));
      get().fetchTransactions({ force: true });
    }
  },

  // Allows retrying a failed fetch
  retry: () => {
    const { page } = get();
    // If the error was on page 1, we fetch from scratch.
    // If it was during append, we just re-run fetchTransactions for the current (failed) page.
    get().fetchTransactions({ force: true });
  },
}));
