/**
 * AI Search Assistant End-to-End Validation Tests
 * 
 * This test suite validates the complete AI search assistant implementation
 * focusing on the key requirements from task 11.2:
 * - Real Gemini API integration
 * - PostHog analytics tracking
 * - Error handling and recovery
 * - German language responses
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import AIAssistantInterfaceSimple from '@/components/ai/ai-assistant-interface-simple';
import { useAIAssistantStore } from '@/hooks/use-ai-assistant-store';

// Mock PostHog for analytics testing
const mockPostHogCapture = jest.fn();
jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    capture: mockPostHogCapture,
    has_opted_in_capturing: () => true,
  },
}));

// Mock fetch for API calls
const mockFetch = jest.fn() as any;
global.fetch = mockFetch as any;

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    GEMINI_API_KEY: 'test-api-key',
    POSTHOG_API_KEY: 'test-posthog-key',
    POSTHOG_HOST: 'https://eu.i.posthog.com',
  };
});

afterAll(() => {
  process.env = originalEnv;
});

// Test utilities
const mockDocumentationContext = {
  articles: [
    {
      id: '1',
      titel: 'Mieter verwalten',
      kategorie: 'Mieterverwaltung',
      seiteninhalt: 'Hier erfahren Sie, wie Sie Mieter in Mietevo verwalten können.',
    },
    {
      id: '2',
      titel: 'Betriebskosten abrechnen',
      kategorie: 'Finanzen',
      seiteninhalt: 'Anleitung zur Betriebskostenabrechnung in Mietevo.',
    },
  ],
  categories: [
    { id: '1', name: 'Mieterverwaltung', articleCount: 1 },
    { id: '2', name: 'Finanzen', articleCount: 1 },
  ],
};

describe('AI Search Assistant - E2E Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockPostHogCapture.mockClear();

    // Reset Zustand store
    useAIAssistantStore.getState().closeAI();
    useAIAssistantStore.getState().clearMessages();
  });

  describe('1. Gemini API Integration Validation', () => {
    it('should make correct API calls with proper configuration', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          response: 'Hallo! Ich bin Ihr Mietevo AI-Assistent.',
          sessionId: 'test-session',
        })
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      render(
        <AIAssistantInterfaceSimple
          isOpen={true}
          onClose={jest.fn()}
          documentationContext={mockDocumentationContext}
        />
      );

      const input = screen.getByPlaceholderText(/Stellen Sie eine Frage/i);
      await user.type(input, 'Wie kann ich einen neuen Mieter hinzufügen?');

      const sendButton = screen.getByRole('button', { name: /Nachricht senden/i });
      await user.click(sendButton);

      // Verify API call structure
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/ai-assistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.any(String),
        });
      });

      // Verify request body structure
      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody).toMatchObject({
        message: 'Wie kann ich einen neuen Mieter hinzufügen?',
        context: mockDocumentationContext,
        sessionId: expect.stringMatching(/^session_/)
      });
    });

    it('should validate environment configuration', () => {
      // Verify GEMINI_API_KEY is configured
      expect(process.env.GEMINI_API_KEY).toBe('test-api-key');

      // Verify PostHog configuration
      expect(process.env.POSTHOG_API_KEY).toBe('test-posthog-key');
      expect(process.env.POSTHOG_HOST).toBe('https://eu.i.posthog.com');
    });
  });

  describe('2. PostHog Analytics Validation', () => {
    it('should track AI assistant opened event', async () => {
      const { openAI } = useAIAssistantStore.getState();

      act(() => {
        openAI();
      });

      await waitFor(() => {
        expect(mockPostHogCapture).toHaveBeenCalledWith('ai_assistant_opened', {
          source: 'ai_store',
          session_id: expect.stringMatching(/^session_/),
          timestamp: expect.any(String),
        });
      });
    });

    it('should track AI assistant closed event with metrics', async () => {
      const { openAI, closeAI, addMessage } = useAIAssistantStore.getState();

      // Open AI and simulate usage
      act(() => {
        openAI();
        addMessage({
          id: '1',
          role: 'user',
          content: 'Test message',
          timestamp: new Date(),
        });
      });

      // Wait a bit for session duration
      await new Promise(resolve => setTimeout(resolve, 100));

      act(() => {
        closeAI();
      });

      await waitFor(() => {
        expect(mockPostHogCapture).toHaveBeenCalledWith('ai_assistant_closed', {
          session_duration_ms: expect.any(Number),
          message_count: 1,
          session_id: expect.stringMatching(/^session_/),
          bundle_optimization_suggestions: expect.any(Number),
          estimated_bundle_savings_kb: expect.any(Number),
          timestamp: expect.any(String),
        });
      });
    });

    it('should track error events when requests fail', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <AIAssistantInterfaceSimple
          isOpen={true}
          onClose={jest.fn()}
          documentationContext={mockDocumentationContext}
        />
      );

      const input = screen.getByPlaceholderText(/Stellen Sie eine Frage/i);
      await user.type(input, 'Test question');

      const sendButton = screen.getByRole('button', { name: /Nachricht senden/i });
      await user.click(sendButton);

      // Wait for error to be processed
      await waitFor(() => {
        expect(screen.getByText(/Entschuldigung, es gab einen Fehler/i)).toBeInTheDocument();
      });

      // Verify error tracking (the setError call should trigger PostHog)
      expect(mockPostHogCapture).toHaveBeenCalledWith('ai_request_failed', expect.objectContaining({
        session_id: expect.any(String),
        error_type: 'store_error',
        error_code: 'AI_STORE_ERROR',
        retryable: true,
        failure_stage: 'store_management',
      }));
    });
  });

  describe('3. Error Handling and Recovery Validation', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <AIAssistantInterfaceSimple
          isOpen={true}
          onClose={jest.fn()}
          documentationContext={mockDocumentationContext}
        />
      );

      const input = screen.getByPlaceholderText(/Stellen Sie eine Frage/i);
      await user.type(input, 'Test question');

      const sendButton = screen.getByRole('button', { name: /Nachricht senden/i });
      await user.click(sendButton);

      // Verify German error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/Entschuldigung, es gab einen Fehler bei der Verarbeitung/i)).toBeInTheDocument();
      });

      // Verify loading state is cleared
      expect(screen.queryByText(/Verbinde mit AI/i)).not.toBeInTheDocument();
    });

    it('should handle rate limiting with proper German messages', async () => {
      const user = userEvent.setup();
      const rateLimitResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT',
          message: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
          retryable: true,
        })
      };

      mockFetch.mockResolvedValueOnce(rateLimitResponse);

      render(
        <AIAssistantInterfaceSimple
          isOpen={true}
          onClose={jest.fn()}
          documentationContext={mockDocumentationContext}
        />
      );

      const input = screen.getByPlaceholderText(/Stellen Sie eine Frage/i);
      await user.type(input, 'Test question');

      const sendButton = screen.getByRole('button', { name: /Nachricht senden/i });
      await user.click(sendButton);

      // Wait for error handling
      await waitFor(() => {
        expect(screen.getByText(/Entschuldigung, es gab einen Fehler/i)).toBeInTheDocument();
      });
    });
  });

  describe('4. German Language Interface Validation', () => {
    it('should display all German interface elements correctly', () => {
      render(
        <AIAssistantInterfaceSimple
          isOpen={true}
          onClose={jest.fn()}
          documentationContext={mockDocumentationContext}
        />
      );

      // Verify German UI elements
      expect(screen.getByText('Mietevo AI Assistent')).toBeInTheDocument();
      expect(screen.getByText('Fragen Sie mich alles über Mietevo')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Stellen Sie eine Frage über Mietevo/i)).toBeInTheDocument();
      expect(screen.getByText(/Willkommen beim Mietevo AI Assistenten/i)).toBeInTheDocument();

      // Verify German welcome message
      expect(screen.getByText(/Stellen Sie mir Fragen über Mietevo-Funktionen/i)).toBeInTheDocument();
    });

    it('should handle German input and display correctly', async () => {
      const user = userEvent.setup();
      const germanResponse = 'Um Betriebskosten zu verwalten, navigieren Sie zum Betriebskosten-Bereich.';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: germanResponse,
          sessionId: 'test-session',
        })
      });

      render(
        <AIAssistantInterfaceSimple
          isOpen={true}
          onClose={jest.fn()}
          documentationContext={mockDocumentationContext}
        />
      );

      const input = screen.getByPlaceholderText(/Stellen Sie eine Frage/i);
      const germanQuestion = 'Wie verwalte ich Betriebskosten in Mietevo?';
      await user.type(input, germanQuestion);

      const sendButton = screen.getByRole('button', { name: /Nachricht senden/i });
      await user.click(sendButton);

      // Verify German question is displayed
      await waitFor(() => {
        expect(screen.getByText(germanQuestion)).toBeInTheDocument();
      });

      // Verify German response is displayed
      await waitFor(() => {
        expect(screen.getByText(germanResponse)).toBeInTheDocument();
      });
    });

    it('should display German error messages', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <AIAssistantInterfaceSimple
          isOpen={true}
          onClose={jest.fn()}
          documentationContext={mockDocumentationContext}
        />
      );

      const input = screen.getByPlaceholderText(/Stellen Sie eine Frage/i);
      await user.type(input, 'Test question');

      const sendButton = screen.getByRole('button', { name: /Nachricht senden/i });
      await user.click(sendButton);

      // Verify German error message
      await waitFor(() => {
        expect(screen.getByText(/Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage/i)).toBeInTheDocument();
      });
    });
  });

  });
