import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DisplayMode = 'overlay' | 'push';

export type AIToolId = 'get_houses' | 'get_apartments' | 'get_tenants' | 'get_finances' | 'get_tasks' | 'get_nebenkosten';

export const ALL_TOOL_IDS: AIToolId[] = [
  'get_houses',
  'get_apartments',
  'get_tenants',
  'get_finances',
  'get_tasks',
  'get_nebenkosten'
];

interface AIChatStore {
  isOpen: boolean;
  displayMode: DisplayMode;
  enabledToolIds: AIToolId[];
  setIsOpen: (isOpen: boolean) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleOpen: () => void;
  toggleDisplayMode: () => void;
  toggleTool: (toolId: AIToolId) => void;
  setAllTools: (enabled: boolean) => void;
}

export const useAIChatStore = create<AIChatStore>()(
  persist(
    (set) => ({
      isOpen: false,
      displayMode: 'overlay',
      enabledToolIds: ALL_TOOL_IDS,
      setIsOpen: (isOpen) => set({ isOpen }),
      setDisplayMode: (displayMode) => set({ displayMode }),
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      toggleDisplayMode: () => set((state) => ({ 
        displayMode: state.displayMode === 'overlay' ? 'push' : 'overlay' 
      })),
      toggleTool: (toolId) => set((state) => ({
        enabledToolIds: state.enabledToolIds.includes(toolId)
          ? state.enabledToolIds.filter(id => id !== toolId)
          : [...state.enabledToolIds, toolId]
      })),
      setAllTools: (enabled) => set({ enabledToolIds: enabled ? ALL_TOOL_IDS : [] }),
    }),
    {
      name: 'ai-chat-display-settings-v2', // Updated version name to avoid state mismatch with old store if fields added
    }
  )
);
