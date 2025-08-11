import { create } from 'zustand';

interface SearchState {
  query: string;
  setQuery: (query: string) => void;
}

const useSearchStore = create<SearchState>((set) => ({
  query: '',
  setQuery: (query: string) => set({ query }),
}));

export { useSearchStore };
