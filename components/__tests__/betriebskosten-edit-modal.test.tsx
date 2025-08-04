import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useModalStore } from '@/hooks/use-modal-store';
import { BetriebskostenEditModal } from '../betriebskosten-edit-modal';

// Create a simple mock component factory
const createMockComponent = (name: string) => ({ children, ...props }: { children?: React.ReactNode }) => (
  <div data-testid={name} {...props}>
    {children}
  </div>
);

// Mock Dialog components
jest.mock('@/components/ui/dialog', () => ({
  __esModule: true,
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content" {...props}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h1 data-testid="dialog-title">{children}</h1>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-description">{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  )
}));

// Mock modal store
jest.mock('@/hooks/use-modal-store', () => ({
  __esModule: true,
  useModalStore: jest.fn()
}));

// Mock UI components
const mockComponents = [
  '@/components/ui/input',
  '@/components/ui/button',
  '@/components/ui/label',
  '@/components/ui/textarea',
  '@/components/ui/select',
  '@/components/ui/custom-combobox',
  '@/components/ui/skeleton',
  '@/components/ui/label-with-tooltip'
];

// Mock each component individually
mockComponents.forEach(mockPath => {
  const componentName = mockPath.split('/').pop();
  if (componentName) {
    jest.mock(mockPath, () => ({
      __esModule: true,
      [componentName]: createMockComponent(componentName)
    }));
  }
});

// Mock actions
jest.mock('@/app/betriebskosten-actions', () => ({
  getNebenkostenDetailsAction: jest.fn(),
  createNebenkosten: jest.fn(),
  updateNebenkosten: jest.fn(),
  createRechnungenBatch: jest.fn(),
  deleteRechnungenByNebenkostenId: jest.fn()
}));

jest.mock('@/app/mieter-actions', () => ({
  __esModule: true,
  getMieterByHausIdAction: jest.fn()
}));

// Mock data for testing
const mockNebenkosten = {
  id: '1',
  name: 'Test Nebenkosten',
  jahr: '2023',
  haeuser_id: '1',
  nebenkostenart: ['nach Rechnung'],
  betrag: [150.00],
  berechnungsart: ['nach Rechnung'],
  wasserkosten: 0.00,
  Haeuser: { name: 'House 1' },
  kosten: [
    { art: 'Gas', betrag: '100.00', berechnungsart: 'nach Rechnung' },
    { art: 'Strom', betrag: '50.00', berechnungsart: 'nach Rechnung' }
  ]
};

const mockUserData = {
  id: 'test-user',
  name: 'Test User'
};

describe('BetriebskostenEditModal', () => {
  describe('State Management', () => {
    const mockHaeuser = [
      { id: '1', name: 'Test Haus 1' },
      { id: '2', name: 'Test Haus 2' }
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      jest.mocked(useModalStore).mockReturnValue({
        isBetriebskostenModalOpen: true,
        closeBetriebskostenModal: jest.fn(),
        betriebskostenInitialData: null,
        betriebskostenModalHaeuser: mockHaeuser,
        betriebskostenModalOnSuccess: jest.fn(),
        isBetriebskostenModalDirty: false,
        setBetriebskostenModalDirty: jest.fn(),
        openConfirmationModal: jest.fn(),
        attemptClose: jest.fn(),
        userId: 'test-user'
      });
    });

    it('should handle loading state correctly', async () => {
      await act(async () => {
        const { rerender } = render(
          <BetriebskostenEditModal />
        );

        const dialog = screen.getByTestId('dialog-content');
        expect(dialog).toBeInTheDocument();
        expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
        expect(screen.getByTestId('dialog-title')).toHaveTextContent('Betriebskosten bearbeiten');

        expect(screen.getByText('Lade Details...')).toBeInTheDocument();
      });
    });

    it('should handle tenant selection correctly', async () => {
      await act(async () => {
        const { rerender } = render(
          <BetriebskostenEditModal />
        );

        const dialog = screen.getByTestId('dialog-content');
        expect(dialog).toBeInTheDocument();
        expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
        expect(screen.getByTestId('dialog-title')).toHaveTextContent('Betriebskosten bearbeiten');

        const houseSelect = screen.getByTestId('combobox');
        fireEvent.click(houseSelect);
        const houseOption = screen.getByTestId('combobox-option');
        fireEvent.click(houseOption);

        expect(screen.getByTestId('combobox')).toHaveValue(mockHaeuser[0].name);

        expect(screen.getByText('Jahr *')).toBeInTheDocument();
        expect(screen.getByText('Haus *')).toBeInTheDocument();
        expect(screen.getByText('Wasserkosten (€)')).toBeInTheDocument();
        expect(screen.getByText('Kostenaufstellung')).toBeInTheDocument();

        const addCostButton = screen.getByTestId('button');
        fireEvent.click(addCostButton);

        const costItems = screen.getAllByTestId('combobox');
        expect(costItems).toHaveLength(2);

        const firstCostItem = costItems[1];
        expect(firstCostItem).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Kostenart')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Berechnungsart...')).toBeInTheDocument();

        expect(screen.getByTestId('button')).toBeInTheDocument();
        expect(screen.getByTestId('button')).toBeInTheDocument();

        expect(screen.getByTestId('button')).not.toHaveTextContent('Speichern...');
        expect(screen.getByTestId('button')).not.toHaveTextContent('Laden...');
      });
    });

    it('should handle saving correctly', async () => {
      await act(async () => {
        const { rerender } = render(
          <BetriebskostenEditModal />
        );

        const dialog = screen.getByTestId('dialog-content');
        expect(dialog).toBeInTheDocument();
        expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
        expect(screen.getByTestId('dialog-title')).toHaveTextContent('Betriebskosten bearbeiten');

        const saveButton = screen.getByTestId('button');
        fireEvent.click(saveButton);

        expect(screen.getByText('Speichern...')).toBeInTheDocument();
      });
    });
  });
});
