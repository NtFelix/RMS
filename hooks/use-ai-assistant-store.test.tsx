import { renderHook, act } from '@testing-library/react';
import { useAIAssistantStore } from '@/hooks/use-ai-assistant-store';

describe('useAIAssistantStore', () => {
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

  it('switches to search mode correctly', () => {
    const { result } = renderHook(() => useAIAssistantStore());
    
    act(() => {
      result.current.openAI();
    });
    
    expect(result.current.currentMode).toBe('ai');
    expect(result.current.isOpen).toBe(true);
    
    act(() => {
      result.current.switchToSearch();
    });
    
    expect(result.current.currentMode).toBe('search');
    expect(result.current.isOpen).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('switches to AI mode correctly', () => {
    const { result } = renderHook(() => useAIAssistantStore());
    
    expect(result.current.currentMode).toBe('search');
    expect(result.current.isOpen).toBe(false);
    
    act(() => {
      result.current.switchToAI();
    });
    
    expect(result.current.currentMode).toBe('ai');
    expect(result.current.isOpen).toBe(true);
    expect(result.current.sessionId).toMatch(/^session_/);
    expect(result.current.error).toBe(null);
  });

  it('adds messages correctly', () => {
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
  });

  it('sets loading state correctly', () => {
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

  it('sets error state correctly', () => {
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

  it('clears messages correctly', () => {
    const { result } = renderHook(() => useAIAssistantStore());
    
    const message = {
      id: 'msg1',
      role: 'user' as const,
      content: 'Hello',
      timestamp: new Date()
    };
    
    act(() => {
      result.current.addMessage(message);
      result.current.setError('Some error');
    });
    
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.error).toBe('Some error');
    
    act(() => {
      result.current.clearMessages();
    });
    
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.error).toBe(null);
  });

  it('sets session ID correctly', () => {
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