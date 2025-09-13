import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantStore {
  // State
  isOpen: boolean;
  currentMode: 'search' | 'ai';
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;

  // Actions
  openAI: () => void;
  closeAI: () => void;
  switchToSearch: () => void;
  switchToAI: () => void;
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  setSessionId: (sessionId: string | null) => void;
}

const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useAIAssistantStore = create<AIAssistantStore>((set, get) => ({
  // Initial state
  isOpen: false,
  currentMode: 'search',
  messages: [],
  isLoading: false,
  error: null,
  sessionId: null,

  // Actions
  openAI: () => {
    const sessionId = generateSessionId();
    set({ 
      isOpen: true, 
      currentMode: 'ai',
      sessionId,
      error: null 
    });
  },

  closeAI: () => {
    set({ 
      isOpen: false,
      error: null 
    });
  },

  switchToSearch: () => {
    set({ 
      currentMode: 'search',
      isOpen: false,
      error: null 
    });
  },

  switchToAI: () => {
    const state = get();
    const sessionId = state.sessionId || generateSessionId();
    set({ 
      currentMode: 'ai',
      isOpen: true,
      sessionId,
      error: null 
    });
  },

  addMessage: (message: ChatMessage) => {
    set(state => ({
      messages: [...state.messages, message]
    }));
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearMessages: () => {
    set({ 
      messages: [],
      error: null 
    });
  },

  setSessionId: (sessionId: string | null) => {
    set({ sessionId });
  }
}));