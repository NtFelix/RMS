import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIAssistantInterface from '@/app/modern/components/ai-assistant-interface';

// Mock fetch
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('AIAssistantInterface', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    documentationContext: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders when open', () => {
    render(<AIAssistantInterface {...defaultProps} />);
    
    expect(screen.getByText('Mietfluss AI Assistent')).toBeInTheDocument();
    expect(screen.getByText('Fragen Sie mich alles über Mietfluss')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AIAssistantInterface {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Mietfluss AI Assistent')).not.toBeInTheDocument();
  });

  it('displays welcome message when no messages', () => {
    render(<AIAssistantInterface {...defaultProps} />);
    
    expect(screen.getByText('Willkommen beim Mietfluss AI Assistenten')).toBeInTheDocument();
    expect(screen.getByText(/Stellen Sie mir Fragen über Mietfluss-Funktionen/)).toBeInTheDocument();
  });

  it('handles message submission', async () => {
    const user = userEvent.setup();
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'Test AI response' })
    } as Response);

    render(<AIAssistantInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...');
    const submitButton = screen.getByRole('button', { name: /Nachricht senden/i });

    await user.type(input, 'Test question');
    await user.click(submitButton);

    // Check that user message appears
    expect(screen.getByText('Test question')).toBeInTheDocument();

    // Wait for AI response
    await waitFor(() => {
      expect(screen.getByText('Test AI response')).toBeInTheDocument();
    });

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
    
    const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...');
    
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
    
    const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...');
    
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
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'Test response' })
    } as Response);

    render(<AIAssistantInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...');
    
    // Send a message first
    await user.type(input, 'Test question');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Test response')).toBeInTheDocument();
    });

    // Click clear button
    const clearButton = screen.getByRole('button', { name: /Unterhaltung löschen/i });
    await user.click(clearButton);

    // Check that messages are cleared
    expect(screen.queryByText('Test question')).not.toBeInTheDocument();
    expect(screen.queryByText('Test response')).not.toBeInTheDocument();
    expect(screen.getByText('Willkommen beim Mietfluss AI Assistenten')).toBeInTheDocument();
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
    
    // Mock a slow response
    mockFetch.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ response: 'Delayed response' })
      } as Response), 100))
    );

    render(<AIAssistantInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...');
    const submitButton = screen.getByRole('button', { name: /Nachricht senden/i });

    await user.type(input, 'Test question');
    await user.click(submitButton);

    // Check that input and button are disabled during loading
    expect(input).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('formats timestamps correctly', async () => {
    const user = userEvent.setup();
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'Test response' })
    } as Response);

    render(<AIAssistantInterface {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...');
    
    await user.type(input, 'Test question');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      // Check that timestamp is displayed in German format (HH:MM)
      const timestamps = screen.getAllByText(/^\d{2}:\d{2}$/);
      expect(timestamps.length).toBeGreaterThan(0);
    });
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
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Test response' })
      } as Response);

      render(<AIAssistantInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...');
      
      // Send a message first
      await user.type(input, 'Test question');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Test response')).toBeInTheDocument();
      });

      // Clear with keyboard shortcut
      await user.keyboard('{Control>}k{/Control}');

      // Check that messages are cleared
      expect(screen.queryByText('Test question')).not.toBeInTheDocument();
      expect(screen.queryByText('Test response')).not.toBeInTheDocument();
      expect(screen.getByText('Willkommen beim Mietfluss AI Assistenten')).toBeInTheDocument();
    });

    it('retries last message when Ctrl+R is pressed and there is an error', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AIAssistantInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...');
      
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
        const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...');
        expect(input).toHaveFocus();
      });
    });

    it('has proper message accessibility labels', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Test AI response' })
      } as Response);

      render(<AIAssistantInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...');
      
      await user.type(input, 'Test question');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        // Check that messages have proper ARIA labels
        expect(screen.getByLabelText(/Ihre Nachricht um \d{2}:\d{2}/)).toBeInTheDocument();
        expect(screen.getByLabelText(/AI Antwort um \d{2}:\d{2}/)).toBeInTheDocument();
      });
    });

    it('shows tooltip hints for action buttons', async () => {
      const user = userEvent.setup();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Test response' })
      } as Response);

      render(<AIAssistantInterface {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Stellen Sie eine Frage über Mietfluss...');
      
      // Send a message to show clear button
      await user.type(input, 'Test question');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        // Check that buttons have title attributes for tooltips
        const clearButton = screen.getByLabelText(/Unterhaltung löschen.*Strg\+K/);
        expect(clearButton).toHaveAttribute('title', 'Unterhaltung löschen (Strg+K)');
        
        const closeButton = screen.getByLabelText(/AI Assistent schließen.*Escape/);
        expect(closeButton).toHaveAttribute('title', 'AI Assistent schließen (Escape)');
      });
    });
  });
});