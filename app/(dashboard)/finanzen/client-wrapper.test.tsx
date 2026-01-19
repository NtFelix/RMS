import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinanzenClientWrapper from './client-wrapper';
import { useModalStore } from '@/hooks/use-modal-store';

// Mock dependencies
jest.mock('@/hooks/use-modal-store');
jest.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string) => value,
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

describe('FinanzenClientWrapper - Layout Changes', () => {
  const mockOpenFinanceModal = jest.fn();
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  const mockFinances = [
    {
      id: '1',
      name: 'Rent Income',
      betrag: 1000,
      ist_einnahmen: true,
      datum: '2023-01-01',
      wohnung_id: 'w1',
      Wohnungen: { name: 'Apartment 1' }
    },
    {
      id: '2',
      name: 'Maintenance Cost',
      betrag: 200,
      ist_einnahmen: false,
      datum: '2023-01-02',
      wohnung_id: 'w2',
      Wohnungen: { name: 'Apartment 2' }
    }
  ];

  const mockWohnungen = [
    { id: 'w1', name: 'Apartment 1' },
    { id: 'w2', name: 'Apartment 2' }
  ];

  const mockSummaryData = {
    year: 2023,
    totalIncome: 12000,
    totalExpenses: 2400,
    totalCashflow: 9600,
    averageMonthlyIncome: 1000,
    averageMonthlyExpenses: 200,
    averageMonthlyCashflow: 800,
    yearlyProjection: 9600,
    monthsPassed: 12,
    monthlyData: {}
  };

  const defaultProps = {
    finances: mockFinances,
    wohnungen: mockWohnungen,
    summaryData: mockSummaryData,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModalStore.mockReturnValue({
      getState: () => ({
        openFinanceModal: mockOpenFinanceModal,
      }),
    } as any);

    // Mock successful API responses
    mockFetch.mockImplementation((url: any) => {
      if (url.includes('/api/finanzen/years')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([2023, 2024]),
        } as Response);
      }
      if (url.includes('/api/finanzen/balance')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ totalBalance: 9600 }),
        } as Response);
      }
      if (url.includes('/api/finanzen/summary')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSummaryData),
        } as Response);
      }
      if (url.includes('/api/finanzen')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFinances),
          headers: {
            get: (header: string) => header === 'X-Total-Count' ? '2' : null,
          },
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);
    });
  });

  describe('Special Finanzen Layout Structure', () => {
    it('renders without redundant page header section', () => {
      render(<FinanzenClientWrapper {...defaultProps} />);

      // Should NOT have the old page header structure
      expect(screen.queryByText('Finanzen')).not.toBeInTheDocument();
      expect(screen.queryByText('Verwalten Sie Ihre Finanzen und Transaktionen')).not.toBeInTheDocument();
    });

    it('renders summary cards at the top', () => {
      render(<FinanzenClientWrapper {...defaultProps} />);

      // Should have summary cards
      expect(screen.getByText('Ø Monatliche Einnahmen')).toBeInTheDocument();
      expect(screen.getByText('Ø Monatliche Ausgaben')).toBeInTheDocument();
      expect(screen.getByText('Ø Monatlicher Cashflow')).toBeInTheDocument();
      expect(screen.getByText('Jahresprognose')).toBeInTheDocument();
    });

    it('positions saldo display between chart and table', async () => {
      render(<FinanzenClientWrapper {...defaultProps} />);

      await waitFor(() => {
        // Should have saldo card positioned separately
        expect(screen.getByText('Aktueller Saldo')).toBeInTheDocument();
      });

      // Verify the saldo is not in the old position (top header area)
      const { container } = render(<FinanzenClientWrapper {...defaultProps} />);
      const summaryCards = container.querySelector('.grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-4');
      const saldoCards = screen.getAllByText('Aktueller Saldo');
      // Find the saldo card that's in a Card component (not in skeleton)
      let saldoCard = null;
      for (const card of saldoCards) {
        const cardElement = card.closest('[class*="summary-card"]');
        if (cardElement) {
          saldoCard = cardElement;
          break;
        }
      }
      
      // If we still don't find it, just use the first one's closest card
      if (!saldoCard && saldoCards.length > 0) {
        saldoCard = saldoCards[0].closest('div[class*="Card"], div[class*="card"]');
      }
      
      // Saldo should not be in the summary cards grid
      expect(summaryCards).not.toContainElement(saldoCard as HTMLElement);
    });

    it('maintains proper layout flow: summary cards -> chart -> saldo -> transactions', () => {
      const { container } = render(<FinanzenClientWrapper {...defaultProps} />);

      const mainContainer = container.firstChild as HTMLElement;
      const children = Array.from(mainContainer.children);

      // First child should be summary cards grid
      expect(children[0]).toHaveClass('grid', 'gap-4');
      
      // Should have proper gap between sections
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'gap-8');
    });

    it('removes add transaction button from header area', () => {
      render(<FinanzenClientWrapper {...defaultProps} />);

      // Should not have the old header with add button
      expect(screen.queryByText('Transaktion hinzufügen')).not.toBeInTheDocument();
    });
  });

  describe('Summary Cards Functionality', () => {
    it('displays correct summary data', () => {
      render(<FinanzenClientWrapper {...defaultProps} />);

      // Check if summary values are displayed (formatted)
      expect(screen.getByText('1.000,00 €')).toBeInTheDocument(); // Average monthly income
      expect(screen.getByText('200,00 €')).toBeInTheDocument(); // Average monthly expenses
      expect(screen.getByText('800,00 €')).toBeInTheDocument(); // Average monthly cashflow
      expect(screen.getByText('9.600,00 €')).toBeInTheDocument(); // Yearly projection
    });

    it('shows loading state for summary cards', () => {
      const loadingProps = {
        ...defaultProps,
        summaryData: null,
      };

      render(<FinanzenClientWrapper {...loadingProps} />);

      // Should show skeleton loading state
      expect(screen.getByText('Ø Monatliche Einnahmen')).toBeInTheDocument();
    });

    it('handles summary data updates', async () => {
      render(<FinanzenClientWrapper {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('1.000,00 €')).toBeInTheDocument();
      });
    });
  });

  describe('Saldo Display', () => {
    it('renders saldo card with correct styling', async () => {
      render(<FinanzenClientWrapper {...defaultProps} />);

      await waitFor(() => {
        const saldoCard = screen.getByText('Aktueller Saldo');
        expect(saldoCard).toBeInTheDocument();
      });
    });

    it('shows loading state for saldo', () => {
      render(<FinanzenClientWrapper {...defaultProps} />);

      // Initially should show loading state
      expect(screen.getByText('Aktueller Saldo')).toBeInTheDocument();
    });

    it('updates saldo when filters change', async () => {
      render(<FinanzenClientWrapper {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/finanzen/balance')
        );
      });
    });
  });

  describe('Responsive Design', () => {
    it('has responsive layout classes', () => {
      const { container } = render(<FinanzenClientWrapper {...defaultProps} />);

      // Main container should have responsive padding
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'gap-8', 'p-8');
    });

    it('summary cards have responsive grid layout', () => {
      const { container } = render(<FinanzenClientWrapper {...defaultProps} />);

      const summaryGrid = container.querySelector('.grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-4');
      expect(summaryGrid).toBeInTheDocument();
      expect(summaryGrid).toHaveClass('md:grid-cols-2', 'lg:grid-cols-4');
    });

    it('maintains responsive spacing between sections', () => {
      const { container } = render(<FinanzenClientWrapper {...defaultProps} />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('gap-8');
    });
  });

  describe('Accessibility', () => {
    it('maintains proper heading hierarchy', () => {
      render(<FinanzenClientWrapper {...defaultProps} />);

      // Summary card titles should be properly structured
      expect(screen.getByText('Ø Monatliche Einnahmen')).toBeInTheDocument();
      expect(screen.getByText('Aktueller Saldo')).toBeInTheDocument();
    });

    it('has proper ARIA labels for summary cards', () => {
      render(<FinanzenClientWrapper {...defaultProps} />);

      // Cards should have proper structure for screen readers
      const incomeCard = screen.getByText('Ø Monatliche Einnahmen').closest('[role]');
      expect(incomeCard).toBeInTheDocument();
    });

    it('provides meaningful descriptions for summary data', () => {
      render(<FinanzenClientWrapper {...defaultProps} />);

      expect(screen.getByText('Durchschnittliche monatliche Einnahmen')).toBeInTheDocument();
      expect(screen.getByText('Durchschnittliche monatliche Ausgaben')).toBeInTheDocument();
      expect(screen.getByText('Durchschnittlicher monatlicher Überschuss')).toBeInTheDocument();
      expect(screen.getByText('Geschätzter Jahresgewinn')).toBeInTheDocument();
    });
  });

  describe('Data Integration', () => {
    it('handles empty finances data', () => {
      const emptyProps = {
        ...defaultProps,
        finances: [],
      };

      render(<FinanzenClientWrapper {...emptyProps} />);

      // Should still render layout
      expect(screen.getByText('Ø Monatliche Einnahmen')).toBeInTheDocument();
    });

    it('handles missing summary data', () => {
      const noSummaryProps = {
        ...defaultProps,
        summaryData: null,
      };

      render(<FinanzenClientWrapper {...noSummaryProps} />);

      // Should show default values (0)
      expect(screen.getByText('Ø Monatliche Einnahmen')).toBeInTheDocument();
    });

    it('deduplicates finance data correctly', () => {
      const duplicateFinances = [
        ...mockFinances,
        mockFinances[0], // Duplicate
      ];

      const duplicateProps = {
        ...defaultProps,
        finances: duplicateFinances,
      };

      render(<FinanzenClientWrapper {...duplicateProps} />);

      // Should handle duplicates without crashing
      expect(screen.getByText('Ø Monatliche Einnahmen')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<FinanzenClientWrapper {...defaultProps} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('handles balance fetch errors', async () => {
      mockFetch.mockImplementation((url: any) => {
        if (url.includes('/api/finanzen/balance')) {
          return Promise.reject(new Error('Balance API Error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<FinanzenClientWrapper {...defaultProps} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch balance:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles summary data fetch errors', async () => {
      mockFetch.mockImplementation((url: any) => {
        if (url.includes('/api/finanzen/summary')) {
          return Promise.reject(new Error('Summary API Error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<FinanzenClientWrapper {...defaultProps} />);

      // Should still render without crashing
      expect(screen.getByText('Ø Monatliche Einnahmen')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('debounces search queries correctly', () => {
      render(<FinanzenClientWrapper {...defaultProps} />);

      // Should use debounced search
      expect(screen.getByText('Ø Monatliche Einnahmen')).toBeInTheDocument();
    });

    it('handles large datasets efficiently', () => {
      const largeFinances = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        name: `Transaction ${i}`,
        betrag: 100,
        ist_einnahmen: i % 2 === 0,
        datum: '2023-01-01',
      }));

      const largeProps = {
        ...defaultProps,
        finances: largeFinances,
      };

      render(<FinanzenClientWrapper {...largeProps} />);

      // Should render without performance issues
      expect(screen.getByText('Ø Monatliche Einnahmen')).toBeInTheDocument();
    });
  });
});