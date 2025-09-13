import { create } from 'zustand';
import posthog from 'posthog-js';

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
  sessionStartTime: Date | null;

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
  sessionStartTime: null,

  // Actions
  openAI: () => {
    const sessionId = generateSessionId();
    const sessionStartTime = new Date();
    
    // Track AI assistant opened event
    if (typeof window !== 'undefined' && posthog && posthog.has_opted_in_capturing?.()) {
      posthog.capture('ai_assistant_opened', {
        source: 'ai_store',
        session_id: sessionId,
        timestamp: sessionStartTime.toISOString()
      });
    }
    
    set({ 
      isOpen: true, 
      currentMode: 'ai',
      sessionId,
      sessionStartTime,
      error: null 
    });
  },

  closeAI: () => {
    const state = get();
    
    // Track AI assistant closed event
    if (typeof window !== 'undefined' && posthog && posthog.has_opted_in_capturing?.() && state.sessionStartTime) {
      const sessionDuration = Date.now() - state.sessionStartTime.getTime();
      posthog.capture('ai_assistant_closed', {
        session_duration_ms: sessionDuration,
        message_count: state.messages.length,
        session_id: state.sessionId,
        timestamp: new Date().toISOString()
      });
    }
    
    set({ 
      isOpen: false,
      error: null,
      sessionStartTime: null
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
    const sessionStartTime = state.sessionStartTime || new Date();
    
    // Track AI assistant opened event if not already open
    if (!state.isOpen && typeof window !== 'undefined' && posthog && posthog.has_opted_in_capturing?.()) {
      posthog.capture('ai_assistant_opened', {
        source: 'mode_switch',
        session_id: sessionId,
        timestamp: sessionStartTime.toISOString()
      });
    }
    
    set({ 
      currentMode: 'ai',
      isOpen: true,
      sessionId,
      sessionStartTime,
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