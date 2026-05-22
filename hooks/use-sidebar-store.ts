import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SidebarPreference = 'expanded' | 'collapsed' | 'automatic';

interface SidebarState {
  preference: SidebarPreference;
  isHovered: boolean;
  setPreference: (preference: SidebarPreference) => void;
  setIsHovered: (isHovered: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      preference: 'expanded',
      isHovered: false,
      setPreference: (preference) => set({ preference }),
      setIsHovered: (isHovered) => set({ isHovered }),
    }),
    {
      name: 'sidebar-preference-storage',
      partialize: (state) => ({ preference: state.preference }), // Only persist preference, not the dynamic hover state
    }
  )
);
