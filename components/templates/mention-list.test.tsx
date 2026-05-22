import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MentionList } from './mention-list';
import { MentionVariable } from '@/lib/template-constants';

// Mock the framer-motion module properties that cause issues in test environments
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockVariables: MentionVariable[] = [
  {
    id: 'mieter.name',
    label: 'Mieter.Name',
    description: 'Vollständiger Name des Mieters',
    category: 'mieter' as const,
  },
  {
    id: 'datum.heute',
    label: 'Datum.Heute',
    description: 'Heutiges Datum (DD.MM.YYYY)',
    category: 'datum' as const,
  },
];

describe('MentionList', () => {
  it('renders items and calls command on click', async () => {
    const mockCommand = jest.fn();
    render(<MentionList items={mockVariables} command={mockCommand} />);

    // Items should be rendered
    expect(screen.getByText('Mieter.Name')).toBeInTheDocument();
    expect(screen.getByText('Datum.Heute')).toBeInTheDocument();

    // The categories should be visible as headers
    expect(screen.getByText('Mieter')).toBeInTheDocument();
    expect(screen.getByText('Datum')).toBeInTheDocument();

    // Click on the first item
    const items = screen.getAllByRole('button');
    expect(items).toHaveLength(2);
    
    await userEvent.click(items[0]);

    // Command should be called with the exact clicked item
    expect(mockCommand).toHaveBeenCalledTimes(1);
    expect(mockCommand).toHaveBeenCalledWith(mockVariables[0]);
  });

  it('handles navigation via ref operations correctly (ArrowDown/ArrowUp/Enter)', async () => {
    const mockCommand = jest.fn();
    const ref = React.createRef<any>();
    
    // Mount the component passing the ref
    render(<MentionList items={mockVariables} command={mockCommand} ref={ref} />);
    
    // Use the exposed imperative handle to send ArrowDown
    await act(async () => {
      ref.current.onKeyDown({ event: { key: 'ArrowDown', preventDefault: jest.fn() } as unknown as KeyboardEvent });
    });
    
    // Now trigger Enter to submit the selected item
    await act(async () => {
      ref.current.onKeyDown({ event: { key: 'Enter', preventDefault: jest.fn() } as unknown as KeyboardEvent });
    });

    // Initial state points to index 0, ArrowDown moves to 1, Enter selects index 1.
    expect(mockCommand).toHaveBeenCalledWith(mockVariables[1]);

    // ArrowUp back to 0
    await act(async () => {
      ref.current.onKeyDown({ event: { key: 'ArrowUp', preventDefault: jest.fn() } as unknown as KeyboardEvent });
    });
    await act(async () => {
      ref.current.onKeyDown({ event: { key: 'Enter', preventDefault: jest.fn() } as unknown as KeyboardEvent });
    });

    expect(mockCommand).toHaveBeenCalledWith(mockVariables[0]);
  });

  it('shows empty state when items is empty', () => {
    const mockCommand = jest.fn();
    render(<MentionList items={[]} command={mockCommand} />);
    
    expect(screen.getByText('Keine Variablen gefunden.')).toBeInTheDocument();
  });

  it('does not throw on regex special chars in labels or descriptions', () => {
    // Testing edge case data stability 
    const nastyItems: MentionVariable[] = [
      {
        id: 'nasty.1',
        label: '(.*+?^${}|[]\\',
        description: '^$*+[a-z]',
        category: 'sonstiges' as any
      }
    ];
    const mockCommand = jest.fn();
    
    // React shouldn't crash trying to render them
    expect(() => render(<MentionList items={nastyItems} command={mockCommand} />)).not.toThrow();
    
    // Ensure the nasty string made it to the screen uncorrupted
    expect(screen.getByText('(.*+?^${}|[]\\')).toBeInTheDocument();
    expect(screen.getByText('^$*+[a-z]')).toBeInTheDocument();
  });
});
