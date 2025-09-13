import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook } from '@testing-library/react';
import AIAssistantInterface from '@/app/modern/components/ai-assistant-interface';
import { useAIAssistantStore } from '@/hooks/use-ai-assistant-store';
import { useEnhancedAIAssistant } from '@/hooks/use-enhanced-ai-assistant';

// Mock dependencies
jest.mock('@/hooks/use-enhanced-ai-assistant');
jest.mock('posthog-js/react', () => ({
  usePostHog: () => ({
    capture: jest.fn(),
    has_opted_in_capturing: () => true
  })
}));

// Mock network status hook
jest.mock('@/hooks/use-network-status', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    isOffline: false,
    checkConnectivity: jest.fn().mockResolvedValue(true),
    lastOnlineTime: new Date(),
    lastOfflineTime: null,
    connectionType: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50
  })
}));

// Mock retry hook
jest.mock('@/hooks/use-retry', () => ({
  useRetry: () => ({
    retry: jest.fn(),
    state: {
      isRetrying: false,
      attemptCount: 0,
      nextRetryIn: 0
    },
    reset: jest.fn()
  })
}));

const mockUseEnhancedAIAssistant = useEnhancedAIAssistant as jest.MockedFunction<typeof useEnhancedAIAssistant>;

describe('AI Assistant Comprehensive Tests', () => {
  const defaultMockState = {
    messages: [],
    isLoading: false,
    error: null,
    inputValue: '',
    streamingMessageId: null,
    sessionId: null,
    sessionStartTime: null,
    validationError: null,
    validationWarning: null,
    inputSuggestions: [],
    fallbackToSearch: false
  };

  const defaultMockActions = {
    sendMessage: jest.fn(),
    retryLastMessage: jest.fn(),
    clearMessages: jest.fn(),
    setInputValue: jest.fn(),
    validateInput: jest.fn(),
    fallbackToDocumentationSearch: jest.fn(),
    resetFallback: jest.fn()
  };

  const defaultMockNetworkStatus = {
    isOnline: true,
    isOffline: false,
    checkConnectivity: jest.fn().mockResolvedValue(true),
    lastOnlineTime: new Date(),
    lastOfflineTime: null,
    connectionType: 'wifi' as const,
    effectiveType: '4g' as const,
    downlink: 10,
    rtt: 50
  };

  const defaultMockRetryState = {
    isRetrying: false,
    attemptCount: 0,
    nextRetryIn: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseEnhancedAIAssistant.mockReturnValue({
      state: defaultMockState,
      actions: defaultMockActions,
      networkStatus: defaultMockNetworkStatus,
      retryState: defaultMockRetryState
    });
  });

  describe('AIAssistantInterface Component', () => {
    const defaultProps = {
      isOpen: true,
      onClose: jest.fn(),
      documentationContext: []
    };

    it('renders correctly when open', () => {
      render(<AIAssistantInterface {...defaultProps} />);
      
      expect(screen.getByText('Mietfluss AI Assistent')).toBeInTheDocument();
      expect(screen.getByText('Fragen Sie mich alles über Mietfluss')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<AIAssistantInterface {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Mietfluss AI Assistent')).not.toBeInTheDocument();
    });

    it('displays welcome message when no messages exist', () => {
      render(<AIAssistantInterface {...defaultProps} />);
      
      expect(screen.getByText('Willkommen beim Mietfluss AI Assistenten')).toBeInTheDocument();
      expect(screen.getByText(/Stellen Sie mir Fragen über Mietfluss-Funktionen/)).toBeInTheDocument();
    });

    it('displays messages correctly', () => {
      const messagesState = {
        ...defaultMockState,
        messages: [
          {
            id: 'msg1',
            role: 'user' as const,
            content: 'Test user message',
            timestamp: new Date()
          },
          {
            id: 'msg2',
            role: 'assistant' as const,
            content: 'Test AI response',
            timestamp: new Date()
          }
        ]
      };

      mockUseEnhancedAIAssistant.mockReturnValue({
        state: messagesState,
        actions: defaultMockActions,
        networkStatus: defaultMockNetworkStatus,
        retryState: defaultMockRetryState
      });

      render(<AIAssistantInterface {...defaultProps} />);
      
      expect(screen.getByText('Test user message')).toBeInTheDocument();
      expect(screen.getByText('Test AI response')).toBeInTheDocument();
    });

    it('handles input changes correctly', async () => {
      const user = userEvent.setup();
      const mockSetInputValue = jest.fn();
      
      mockUseEnhancedAIAssistant.mockReturnValue({
        state: defaultMockState,
        actions: { ...defaultMockActions, setInputValue: mockSetInputValue },
        networkStatus: defaultMockNetworkStatus,
        retryState: defaultMockRetryState
      });

      render(<AIAssistantInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...');
      await user.type(input, 'Test input');

      expect(mockSetInputValue).toHaveBeenCalledWith('T');
      expect(mockSetInputValue).toHaveBeenCalledWith('e');
      // Should be called for each character
      expect(mockSetInputValue).toHaveBeenCalledTimes(10);
    });

    it('handles message submission correctly', async () => {
      const user = userEvent.setup();
      const mockSendMessage = jest.fn();
      
      mockUseEnhancedAIAssistant.mockReturnValue({
        state: { ...defaultMockState, inputValue: 'Test message' },
        actions: { ...defaultMockActions, sendMessage: mockSendMessage },
        networkStatus: defaultMockNetworkStatus,
        retryState: defaultMockRetryState
      });

      render(<AIAssistantInterface {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /Nachricht senden/i });
      await user.click(submitButton);

      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });

    it('prevents submission when input is empty', async () => {
      const user = userEvent.setup();
      const mockSendMessage = jest.fn();
      
      mockUseEnhancedAIAssistant.mockReturnValue({
        state: { ...defaultMockState, inputValue: '' },
        actions: { ...defaultMockActions, sendMessage: mockSendMessage },
        networkStatus: defaultMockNetworkStatus,
        retryState: defaultMockRetryState
      });

      render(<AIAssistantInterface {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /Nachricht senden/i });
      expect(submitButton).toBeDisabled();
      
      await user.click(submitButton);
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('shows loading state correctly', () => {
      mockUseEnhancedAIAssistant.mockReturnValue({
        state: { ...defaultMockState, isLoading: true },
        actions: defaultMockActions,
        networkStatus: defaultMockNetworkStatus,
        retryState: defaultMockRetryState
      });

      render(<AIAssistantInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...');
      const submitButton = screen.getByRole('button', { name: /Nachricht senden/i });
      
      expect(input).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Verbinde mit AI...')).toBeInTheDocument();
    });

    it('displays error messages correctly', () => {
      mockUseEnhancedAIAssistant.mockReturnValue({
        state: { ...defaultMockState, error: 'Test error message' },
        actions: defaultMockActions,
        networkStatus: defaultMockNetworkStatus,
        retryState: defaultMockRetryState
      });

      render(<AIAssistantInterface {...defaultProps} />);
      
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('displays validation errors correctly', () => {
      mockUseEnhancedAIAssistant.mockReturnValue({
        state: { ...defaultMockState, validationError: 'Input too short' },
        actions: defaultMockActions,
        networkStatus: defaultMockNetworkStatus,
        retryState: defaultMockRetryState
      });

      render(<AIAssistantInterface {...defaultProps} />);
      
      expect(screen.getByText('Input too short')).toBeInTheDocument();
    });

    it('shows offline status correctly', () => {
      mockUseEnhancedAIAssistant.mockReturnValue({
        state: defaultMockState,
        actions: defaultMockActions,
        networkStatus: { ...defaultMockNetworkStatus, isOnline: false, isOffline: true },
        retryState: defaultMockRetryState
      });

      render(<AIAssistantInterface {...defaultProps} />);
      
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.getByText('Keine Internetverbindung - Funktionen eingeschränkt')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Offline - Keine AI-Anfragen möglich')).toBeInTheDocument();
    });

    it('shows retry state correctly', () => {
      mockUseEnhancedAIAssistant.mockReturnValue({
        state: defaultMockState,
        actions: defaultMockActions,
        networkStatus: defaultMockNetworkStatus,
        retryState: { isRetrying: true, attemptCount: 2, nextRetryIn: 5 }
      });

      render(<AIAssistantInterface {...defaultProps} />);
      
      expect(screen.getByText('Wiederholung 2')).toBeInTheDocument();
      expect(screen.getByText('Wiederholung in 5 Sekunden... (Versuch 2)')).toBeInTheDocument();
    });

    it('handles clear messages correctly', async () => {
      const user = userEvent.setup();
      const mockClearMessages = jest.fn();
      
      mockUseEnhancedAIAssistant.mockReturnValue({
        state: {
          ...defaultMockState,
          messages: [
            { id: 'msg1', role: 'user' as const, content: 'Test', timestamp: new Date() }
          ]
        },
        actions: { ...defaultMockActions, clearMessages: mockClearMessages },
        networkStatus: defaultMockNetworkStatus,
        retryState: defaultMockRetryState
      });

      render(<AIAssistantInterface {...defaultProps} />);
      
      const clearButton = screen.getByRole('button', { name: /Unterhaltung löschen/i });
      await user.click(clearButton);

      expect(mockClearMessages).toHaveBeenCalled();
    });

    it('handles retry correctly', async () => {
      const user = userEvent.setup();
      const mockRetryLastMessage = jest.fn();
      
      mockUseEnhancedAIAssistant.mockReturnValue({
        state: { ...defaultMockState, error: 'Network error' },
        actions: { ...defaultMockActions, retryLastMessage: mockRetryLastMessage },
        networkStatus: defaultMockNetworkStatus,
        retryState: defaultMockRetryState
      });

      render(<AIAssistantInterface {...defaultProps} />);
      
      const retryButton = screen.getByRole('button', { name: /Erneut versuchen/i });
      await user.click(retryButton);

      expect(mockRetryLastMessage).toHaveBeenCalled();
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(<AIAssistantInterface {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: /AI Assistent schließen/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('shows fallback to search option when appropriate', async () => {
      const user = userEvent.setup();
      const onFallbackToSearch = jest.fn();
      
      mockUseEnhancedAIAssistant.mockReturnValue({
        state: { ...defaultMockState, error: 'Service unavailable', fallbackToSearch: true },
        actions: defaultMockActions,
        networkStatus: defaultMockNetworkStatus,
        retryState: defaultMockRetryState
      });

      render(<AIAssistantInterface {...defaultProps} onFallbackToSearch={onFallbackToSearch} />);
      
      const fallbackButton = screen.getByText('Zur Suche');
      await user.click(fallbackButton);

      expect(onFallbackToSearch).toHaveBeenCalled();
    });

    describe('Keyboard Navigation', () => {
      it('closes modal on Escape key', async () => {
        const user = userEvent.setup();
        const onClose = jest.fn();
        
        render(<AIAssistantInterface {...defaultProps} onClose={onClose} />);
        
        await user.keyboard('{Escape}');
        
        expect(onClose).toHaveBeenCalled();
      });

      it('clears messages on Ctrl+K', async () => {
        const user = userEvent.setup();
        const mockClearMessages = jest.fn();
        
        mockUseEnhancedAIAssistant.mockReturnValue({
          state: {
            ...defaultMockState,
            messages: [{ id: 'msg1', role: 'user' as const, content: 'Test', timestamp: new Date() }]
          },
          actions: { ...defaultMockActions, clearMessages: mockClearMessages },
          networkStatus: defaultMockNetworkStatus,
          retryState: defaultMockRetryState
        });

        render(<AIAssistantInterface {...defaultProps} />);
        
        await user.keyboard('{Control>}k{/Control}');
        
        expect(mockClearMessages).toHaveBeenCalled();
      });

      it('retries on Ctrl+R when there is an error', async () => {
        const user = userEvent.setup();
        const mockRetryLastMessage = jest.fn();
        
        mockUseEnhancedAIAssistant.mockReturnValue({
          state: { ...defaultMockState, error: 'Network error' },
          actions: { ...defaultMockActions, retryLastMessage: mockRetryLastMessage },
          networkStatus: defaultMockNetworkStatus,
          retryState: defaultMockRetryState
        });

        render(<AIAssistantInterface {...defaultProps} />);
        
        await user.keyboard('{Control>}r{/Control}');
        
        expect(mockRetryLastMessage).toHaveBeenCalled();
      });
    });

    describe('Accessibility', () => {
      it('has proper ARIA attributes', () => {
        render(<AIAssistantInterface {...defaultProps} />);
        
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-labelledby', 'ai-assistant-title');
        expect(dialog).toHaveAttribute('aria-describedby', 'ai-assistant-description');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
      });

      it('has proper button labels', () => {
        render(<AIAssistantInterface {...defaultProps} />);
        
        expect(screen.getByLabelText(/AI Assistent schließen.*Escape/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Nachricht senden/)).toBeInTheDocument();
      });

      it('shows keyboard shortcuts in help text', () => {
        render(<AIAssistantInterface {...defaultProps} />);
        
        expect(screen.getByText(/Tastenkürzel: Escape.*Strg\+K.*Alt\+↑↓/)).toBeInTheDocument();
      });

      it('focuses input when modal opens', async () => {
        const { rerender } = render(<AIAssistantInterface {...defaultProps} isOpen={false} />);
        
        rerender(<AIAssistantInterface {...defaultProps} isOpen={true} />);
        
        await waitFor(() => {
          const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...');
          expect(input).toHaveFocus();
        });
      });
    });

    describe('Character Counter', () => {
      it('shows character count', () => {
        mockUseEnhancedAIAssistant.mockReturnValue({
          state: { ...defaultMockState, inputValue: 'Test message' },
          actions: defaultMockActions,
          networkStatus: defaultMockNetworkStatus,
          retryState: defaultMockRetryState
        });

        render(<AIAssistantInterface {...defaultProps} />);
        
        expect(screen.getByText('12/2000')).toBeInTheDocument();
      });

      it('shows 0/2000 for empty input', () => {
        render(<AIAssistantInterface {...defaultProps} />);
        
        expect(screen.getByText('0/2000')).toBeInTheDocument();
      });
    });

    describe('Streaming Messages', () => {
      it('shows streaming indicator for assistant messages', () => {
        mockUseEnhancedAIAssistant.mockReturnValue({
          state: {
            ...defaultMockState,
            messages: [
              {
                id: 'streaming-msg',
                role: 'assistant' as const,
                content: 'Partial response...',
                timestamp: new Date()
              }
            ],
            streamingMessageId: 'streaming-msg'
          },
          actions: defaultMockActions,
          networkStatus: defaultMockNetworkStatus,
          retryState: defaultMockRetryState
        });

        render(<AIAssistantInterface {...defaultProps} />);
        
        expect(screen.getByTitle('Nachricht wird empfangen...')).toBeInTheDocument();
      });

      it('shows typing indicator for empty assistant messages', () => {
        mockUseEnhancedAIAssistant.mockReturnValue({
          state: {
            ...defaultMockState,
            messages: [
              {
                id: 'empty-msg',
                role: 'assistant' as const,
                content: '',
                timestamp: new Date()
              }
            ]
          },
          actions: defaultMockActions,
          networkStatus: defaultMockNetworkStatus,
          retryState: defaultMockRetryState
        });

        render(<AIAssistantInterface {...defaultProps} />);
        
        expect(screen.getByText('Schreibt...')).toBeInTheDocument();
      });
    });
  });

  describe('AI Assistant Store', () => {
    beforeEach(() => {
      // Reset store state before each test
      const { result } = renderHook(() => useAIAssistantStore());
      act(() => {
        result.current.closeAI();
        result.current.clearMessages();
        result.current.setError(null);
        result.current.setLoading(false);
        result.current.setSessionId(null);
      });
    });

    it('has correct initial state', () => {
      const { result } = renderHook(() => useAIAssistantStore());
      
      expect(result.current.isOpen).toBe(false);
      expect(result.current.currentMode).toBe('search');
      expect(result.current.messages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.sessionId).toBe(null);
    });

    it('opens AI assistant correctly', () => {
      const { result } = renderHook(() => useAIAssistantStore());
      
      act(() => {
        result.current.openAI();
      });
      
      expect(result.current.isOpen).toBe(true);
      expect(result.current.currentMode).toBe('ai');
      expect(result.current.sessionId).toMatch(/^session_/);
      expect(result.current.error).toBe(null);
    });

    it('closes AI assistant correctly', () => {
      const { result } = renderHook(() => useAIAssistantStore());
      
      act(() => {
        result.current.openAI();
      });
      
      expect(result.current.isOpen).toBe(true);
      
      act(() => {
        result.current.closeAI();
      });
      
      expect(result.current.isOpen).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('switches modes correctly', () => {
      const { result } = renderHook(() => useAIAssistantStore());
      
      act(() => {
        result.current.switchToAI();
      });
      
      expect(result.current.currentMode).toBe('ai');
      expect(result.current.isOpen).toBe(true);
      
      act(() => {
        result.current.switchToSearch();
      });
      
      expect(result.current.currentMode).toBe('search');
      expect(result.current.isOpen).toBe(false);
    });

    it('manages messages correctly', () => {
      const { result } = renderHook(() => useAIAssistantStore());
      
      const message1 = {
        id: 'msg1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date()
      };
      
      const message2 = {
        id: 'msg2',
        role: 'assistant' as const,
        content: 'Hi there!',
        timestamp: new Date()
      };
      
      act(() => {
        result.current.addMessage(message1);
      });
      
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(message1);
      
      act(() => {
        result.current.addMessage(message2);
      });
      
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[1]).toEqual(message2);
      
      act(() => {
        result.current.clearMessages();
      });
      
      expect(result.current.messages).toHaveLength(0);
    });

    it('manages loading state correctly', () => {
      const { result } = renderHook(() => useAIAssistantStore());
      
      expect(result.current.isLoading).toBe(false);
      
      act(() => {
        result.current.setLoading(true);
      });
      
      expect(result.current.isLoading).toBe(true);
      
      act(() => {
        result.current.setLoading(false);
      });
      
      expect(result.current.isLoading).toBe(false);
    });

    it('manages error state correctly', () => {
      const { result } = renderHook(() => useAIAssistantStore());
      
      expect(result.current.error).toBe(null);
      
      act(() => {
        result.current.setError('Test error');
      });
      
      expect(result.current.error).toBe('Test error');
      
      act(() => {
        result.current.setError(null);
      });
      
      expect(result.current.error).toBe(null);
    });

    it('manages session ID correctly', () => {
      const { result } = renderHook(() => useAIAssistantStore());
      
      expect(result.current.sessionId).toBe(null);
      
      act(() => {
        result.current.setSessionId('test-session-123');
      });
      
      expect(result.current.sessionId).toBe('test-session-123');
      
      act(() => {
        result.current.setSessionId(null);
      });
      
      expect(result.current.sessionId).toBe(null);
    });

    it('reuses existing session ID when switching to AI mode', () => {
      const { result } = renderHook(() => useAIAssistantStore());
      
      act(() => {
        result.current.setSessionId('existing-session');
      });
      
      act(() => {
        result.current.switchToAI();
      });
      
      expect(result.current.sessionId).toBe('existing-session');
      expect(result.current.currentMode).toBe('ai');
      expect(result.current.isOpen).toBe(true);
    });

    it('generates new session ID when opening AI without existing session', () => {
      const { result } = renderHook(() => useAIAssistantStore());
      
      expect(result.current.sessionId).toBe(null);
      
      act(() => {
        result.current.openAI();
      });
      
      expect(result.current.sessionId).toMatch(/^session_/);
      expect(result.current.sessionId).not.toBe(null);
    });
  });
});