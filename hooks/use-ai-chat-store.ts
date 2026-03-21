import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DisplayMode = 'overlay' | 'push';

interface AIChatStore {
  isOpen: boolean;
  displayMode: DisplayMode;
  setIsOpen: (isOpen: boolean) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleOpen: () => void;
  toggleDisplayMode: () => void;
}

export const useAIChatStore = create<AIChatStore>()(
  persist(
    (set) => ({
      isOpen: false,
      displayMode: 'overlay',
      setIsOpen: (isOpen) => set({ isOpen }),
      setDisplayMode: (displayMode) => set({ displayMode }),
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      toggleDisplayMode: () => set((state) => ({ 
        displayMode: state.displayMode === 'overlay' ? 'push' : 'overlay' 
      })),
    }),
    {
      name: 'ai-chat-display-settings',
    }
  )
);
