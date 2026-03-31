import { create } from 'zustand';
import posthog from 'posthog-js';
import { createAIPerformanceMonitor } from '@/lib/ai-performance-monitor';
import { createBundleSizeMonitor } from '@/lib/bundle-size-monitor';
import { type ChatMessage } from '@/types/ai';

interface AIAssistantStore {
  // State
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  sessionStartTime: Date | null;

  // Actions
  openAI: () => void;
  closeAI: () => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, content: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
  setSessionId: (sessionId: string | null) => void;
}

const generateSessionId = () => `session_${crypto.randomUUID()}`;

// Initialize performance monitors
const performanceMonitor = createAIPerformanceMonitor(posthog);
const bundleMonitor = createBundleSizeMonitor(posthog);

export const useAIAssistantStore = create<AIAssistantStore>((set, get) => ({
  // Initial state
  isOpen: false,
  messages: [],
  isLoading: false,
  error: null,
  sessionId: null,
  sessionStartTime: null,

  // Actions
  openAI: () => {
    const sessionId = generateSessionId();
    const sessionStartTime = new Date();
    
    // Track component mount performance
    bundleMonitor.trackComponentMount('AIAssistant', () => {
      // Component mounting logic here
    });
    
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
      sessionId,
      sessionStartTime,
      error: null 
    });
  },

  closeAI: () => {
    const state = get();
    
    // Track bundle performance metrics before closing
    bundleMonitor.trackBundleMetrics();
    
    // Analyze bundle optimization opportunities
    const optimizationSuggestions = bundleMonitor.analyzeBundleImpact();
    
    // Track AI assistant closed event
    if (typeof window !== 'undefined' && posthog && posthog.has_opted_in_capturing?.() && state.sessionStartTime) {
      const sessionDuration = Date.now() - state.sessionStartTime.getTime();
      posthog.capture('ai_assistant_closed', {
        session_duration_ms: sessionDuration,
        message_count: state.messages.length,
        session_id: state.sessionId,
        bundle_optimization_suggestions: optimizationSuggestions.recommendations.length,
        estimated_bundle_savings_kb: optimizationSuggestions.estimatedSavings,
        timestamp: new Date().toISOString()
      });
    }
    
    set({ 
      isOpen: false,
      error: null,
      sessionStartTime: null
    });
  },

  addMessage: (message: ChatMessage) => {
    set(state => {
      // Check if message already exists and update it, otherwise add new
      const existingIndex = state.messages.findIndex(m => m.id === message.id);
      if (existingIndex >= 0) {
        const updatedMessages = [...state.messages];
        updatedMessages[existingIndex] = message;
        return { messages: updatedMessages };
      } else {
        return { messages: [...state.messages, message] };
      }
    });
  },

  updateMessage: (messageId: string, content: string) => {
    set(state => ({
      messages: state.messages.map(message =>
        message.id === messageId
          ? { ...message, content }
          : message
      )
    }));
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    const state = get();
    
    // Track error in store if error is being set
    if (error && typeof window !== 'undefined' && posthog && posthog.has_opted_in_capturing?.()) {
      posthog.capture('ai_request_failed', {
        session_id: state.sessionId,
        error_type: 'store_error',
        error_code: 'AI_STORE_ERROR',
        error_message: error,
        retryable: true,
        failure_stage: 'store_management',
        message_count: state.messages.length,
        timestamp: new Date().toISOString()
      });
    }
    
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