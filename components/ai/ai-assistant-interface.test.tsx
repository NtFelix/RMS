import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIAssistantInterface from '@/app/modern/components/ai-assistant-interface';

// Mock fetch
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock ReadableStream for Node.js test environment
if (typeof ReadableStream === 'undefined') {
  global.ReadableStream = class MockReadableStream {
    private controller: any;

    constructor(options: { start: (controller: any) => void }) {
      this.controller = {
        enqueue: jest.fn(),
        close: jest.fn()
      };

      // Execute start function asynchronously
      setTimeout(() => {
        options.start(this.controller);
      }, 0);
    }

    getReader() {
      const chunks: Uint8Array[] = [];
      let closed = false;

      // Collect all enqueued chunks
      this.controller.enqueue.mock.calls.forEach((call: any) => {
        chunks.push(call[0]);
      });

      let index = 0;

      return {
        read: async () => {
          if (index < chunks.length) {
            return { done: false, value: chunks[index++] };
          }
          return { done: true, value: undefined };
        },
        releaseLock: jest.fn()
      };
    }
  } as any;
}

// Mock TextEncoder for Node.js test environment
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = class MockTextEncoder {
    encode(input: string): Uint8Array {
      return new Uint8Array(Buffer.from(input, 'utf8'));
    }
  } as any;
}

// Helper function to create a mock streaming response
const createMockStreamingResponse = (chunks: string[], finalResponse?: string) => {
  const encoder = new TextEncoder();
  const allChunks: Uint8Array[] = [];

  // Create all chunks upfront
  chunks.forEach(chunk => {
    const data = JSON.stringify({
      type: 'chunk',
      content: chunk,
      sessionId: 'test-session'
    });
    allChunks.push(encoder.encode(`data: ${data}\n\n`));
  });

  // Add final complete message
  const finalData = JSON.stringify({
    type: 'complete',
    content: finalResponse || chunks.join(''),
    sessionId: 'test-session'
  });
  allChunks.push(encoder.encode(`data: ${finalData}\n\n`));

  let chunkIndex = 0;

  const mockStream = {
    getReader: () => ({
      read: async () => {
        if (chunkIndex < allChunks.length) {
          const chunk = allChunks[chunkIndex++];
          return { done: false, value: chunk };
        }
        return { done: true, value: undefined };
      },
      releaseLock: jest.fn()
    })
  };

  return {
    ok: true,
    headers: new Headers({
      'content-type': 'text/event-stream'
    }),
    body: mockStream
  } as Response;
};

// Helper function to create a mock JSON response (fallback)
const createMockJsonResponse = (response: string) => {
  return {
    ok: true,
    headers: new Headers({
      'content-type': 'application/json'
    }),
    json: async () => ({ response })
  } as Response;
};

describe('AIAssistantInterface', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    documentationContext: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for tests
    jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders when open', () => {
    render(<AIAssistantInterface {...defaultProps} />);

    expect(screen.getByText('Mietevo AI Assistent')).toBeInTheDocument();
    expect(screen.getByText('Fragen Sie mich alles über Mietevo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Stellen Sie eine Frage über Mietevo...')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AIAssistantInterface {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Mietevo AI Assistent')).not.toBeInTheDocument();
  });

  it('displays welcome message when no messages', () => {
    render(<AIAssistantInterface {...defaultProps} />);

    expect(screen.getByText('Willkommen beim Mietevo AI Assistenten')).toBeInTheDocument();
    expect(screen.getByText(/Stellen Sie mir Fragen über Mietevo-Funktionen/)).toBeInTheDocument();
  });

  it('handles message submission', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce(
      createMockStreamingResponse(['Test ', 'AI ', 'response'], 'Test AI response')
    );

    render(<AIAssistantInterface {...defaultProps} />);

    const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietevo...');
    const submitButton = screen.getByRole('button', { name: /Nachricht senden/i });

    await user.type(input, 'Test question');
    await user.click(submitButton);

    // Check that user message appears
    expect(screen.getByText('Test question')).toBeInTheDocument();

    // Wait for AI response to be streamed
    await waitFor(() => {
      expect(screen.getByText('Test AI response')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify fetch was called correctly
    expect(mockFetch).toHaveBeenCalledWith('/api/ai-assistant', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: expect.stringContaining('"message":"Test question"')
    }));
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<AIAssistantInterface {...defaultProps} />);

    const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietevo...');

    await user.type(input, 'Test question');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('handles retry functionality', async () => {
    const user = userEvent.setup();

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<AIAssistantInterface {...defaultProps} />);

    const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietevo...');

    await user.type(input, 'Test question');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /Erneut versuchen/i });
    await user.click(retryButton);

    // Check that the input is populated with the last message
    expect(input).toHaveValue('Test question');
  });

  it('clears messages when clear button is clicked', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce(
      createMockStreamingResponse(['Test response'])
    );

    render(<AIAssistantInterface {...defaultProps} />);

    const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietevo...');

    // Send a message first
    await user.type(input, 'Test question');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Test response')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click clear button
    const clearButton = screen.getByRole('button', { name: /Unterhaltung löschen/i });
    await user.click(clearButton);

    // Check that messages are cleared
    expect(screen.queryByText('Test question')).not.toBeInTheDocument();
    expect(screen.queryByText('Test response')).not.toBeInTheDocument();
    expect(screen.getByText('Willkommen beim Mietevo AI Assistenten')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<AIAssistantInterface {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /AI Assistent schließen/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking outside modal', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<AIAssistantInterface {...defaultProps} onClose={onClose} />);

    // Click on the backdrop
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement;
    if (backdrop) {
      await user.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('disables input and submit button when loading', async () => {
    const user = userEvent.setup();

    // Mock a slow streaming response
    mockFetch.mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve(
        createMockStreamingResponse(['Delayed response'])
      ), 100))
    );

    render(<AIAssistantInterface {...defaultProps} />);

    const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietevo...');
    const submitButton = screen.getByRole('button', { name: /Nachricht senden/i });

    await user.type(input, 'Test question');
    await user.click(submitButton);

    // Check that input and button are disabled during loading
    expect(input).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('formats timestamps correctly', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce(
      createMockStreamingResponse(['Test response'])
    );

    render(<AIAssistantInterface {...defaultProps} />);

    const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietevo...');

    await user.type(input, 'Test question');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      // Check that timestamp is displayed in German format (HH:MM)
      const timestamps = screen.getAllByText(/^\d{2}:\d{2}$/);
      expect(timestamps.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('handles streaming responses correctly', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce(
      createMockStreamingResponse(['Hello ', 'from ', 'AI!'], 'Hello from AI!')
    );

    render(<AIAssistantInterface {...defaultProps} />);

    const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietevo...');

    await user.type(input, 'Test question');
    await user.keyboard('{Enter}');

    // Check that user message appears immediately
    expect(screen.getByText('Test question')).toBeInTheDocument();

    // Wait for the complete streamed response
    await waitFor(() => {
      expect(screen.getByText('Hello from AI!')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('falls back to JSON response when streaming is not available', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce(
      createMockJsonResponse('Fallback JSON response')
    );

    render(<AIAssistantInterface {...defaultProps} />);

    const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietevo...');

    await user.type(input, 'Test question');
    await user.keyboard('{Enter}');

    // Wait for the JSON response
    await waitFor(() => {
      expect(screen.getByText('Fallback JSON response')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  describe('Keyboard Navigation and Accessibility', () => {
    it('closes modal when Escape key is pressed', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<AIAssistantInterface {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalled();
    });

    it('clears conversation when Ctrl+K is pressed', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce(
        createMockStreamingResponse(['Test response'])
      );

      render(<AIAssistantInterface {...defaultProps} />);

      const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietevo...');

      // Send a message first
      await user.type(input, 'Test question');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Test response')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Clear with keyboard shortcut
      await user.keyboard('{Control>}k{/Control}');

      // Check that messages are cleared
      expect(screen.queryByText('Test question')).not.toBeInTheDocument();
      expect(screen.queryByText('Test response')).not.toBeInTheDocument();
      expect(screen.getByText('Willkommen beim Mietevo AI Assistenten')).toBeInTheDocument();
    });

    it('retries last message when Ctrl+R is pressed and there is an error', async () => {
      const user = userEvent.setup();

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AIAssistantInterface {...defaultProps} />);

      const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietevo...');

      await user.type(input, 'Test question');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });

      // Retry with keyboard shortcut
      await user.keyboard('{Control>}r{/Control}');

      // Check that the input is populated with the last message
      expect(input).toHaveValue('Test question');
    });

    it('has proper ARIA labels and roles', () => {
      render(<AIAssistantInterface {...defaultProps} />);

      // Check dialog has proper ARIA attributes
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'ai-assistant-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'ai-assistant-description');
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      // Check scroll area has proper label
      const scrollArea = screen.getByLabelText(/Unterhaltungsverlauf/);
      expect(scrollArea).toBeInTheDocument();

      // Check buttons have proper labels
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
        const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietevo...');
        expect(input).toHaveFocus();
      });
    });

    it('has proper message accessibility labels', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce(
        createMockStreamingResponse(['Test AI response'])
      );

      render(<AIAssistantInterface {...defaultProps} />);

      const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietevo...');

      await user.type(input, 'Test question');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        // Check that messages have proper ARIA labels
        expect(screen.getByLabelText(/Ihre Nachricht um \d{2}:\d{2}/)).toBeInTheDocument();
        expect(screen.getByLabelText(/AI Antwort um \d{2}:\d{2}/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows tooltip hints for action buttons', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce(
        createMockStreamingResponse(['Test response'])
      );

      render(<AIAssistantInterface {...defaultProps} />);

      const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietevo...');

      // Send a message to show clear button
      await user.type(input, 'Test question');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        // Check that buttons have title attributes for tooltips
        const clearButton = screen.getByLabelText(/Unterhaltung löschen.*Strg\+K/);
        expect(clearButton).toHaveAttribute('title', 'Unterhaltung löschen (Strg+K)');

        const closeButton = screen.getByLabelText(/AI Assistent schließen.*Escape/);
        expect(closeButton).toHaveAttribute('title', 'AI Assistent schließen (Escape)');
      }, { timeout: 3000 });
    });
  });
});