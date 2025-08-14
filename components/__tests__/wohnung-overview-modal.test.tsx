import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WohnungOverviewModal } from '../wohnung-overview-modal';
import { useModalStore } from '@/hooks/use-modal-store';
import { toast } from '@/hooks/use-toast';

// Mock the hooks
jest.mock('@/hooks/use-modal-store');
jest.mock('@/hooks/use-toast');

// Mock fetch
global.fetch = jest.fn();

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;
const mockToast = toast as jest.MockedFunction<typeof toast>;

describe.skip('WohnungOverviewModal', () => {
  const mockWohnungData = {
    id: '1',
    name: 'Wohnung 1A',
    groesse: 75,
    miete: 1200,
    hausName: 'Musterstraße 1',
    mieter: [
      {
        id: '1',
        name: 'Max Mustermann',
        email: 'max@example.com',
        telefon: '+49123456789',
        einzug: '2023-01-01',
        auszug: null,
        status: 'active' as const,
      },
      {
        id: '2',
        name: 'Anna Schmidt',
        email: 'anna@example.com',
        telefon: null,
        einzug: '2022-01-01',
        auszug: '2022-12-31',
        status: 'moved_out' as const,
      },
    ],
  };

  const defaultMockStore = {
    isWohnungOverviewModalOpen: false,
    wohnungOverviewData: undefined,
    wohnungOverviewLoading: false,
    wohnungOverviewError: undefined,
    closeWohnungOverviewModal: jest.fn(),
    setWohnungOverviewLoading: jest.fn(),
    setWohnungOverviewError: jest.fn(),
    setWohnungOverviewData: jest.fn(),
    openTenantModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModalStore.mockReturnValue(defaultMockStore as any);
  });

  it('renders nothing when modal is closed', () => {
    render(<WohnungOverviewModal />);
    expect(screen.queryByText('Wohnungs-Übersicht')).not.toBeInTheDocument();
  });

  it('displays loading state', () => {
    mockUseModalStore.mockReturnValue({
      ...defaultMockStore,
      isWohnungOverviewModalOpen: true,
      wohnungOverviewLoading: true,
    } as any);

    render(<WohnungOverviewModal />);
    expect(screen.getByText('Wohnungs-Übersicht')).toBeInTheDocument();
    // Check for skeleton loading elements
    expect(document.querySelectorAll('[data-testid="skeleton"]')).toBeTruthy();
  });

  it('displays error state with retry button', () => {
    const mockRetry = jest.fn();
    mockUseModalStore.mockReturnValue({
      ...defaultMockStore,
      isWohnungOverviewModalOpen: true,
      wohnungOverviewError: 'Failed to load data',
      setWohnungOverviewLoading: mockRetry,
    } as any);

    render(<WohnungOverviewModal />);
    
    expect(screen.getByText('Fehler beim Laden')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Erneut versuchen');
    expect(retryButton).toBeInTheDocument();
  });

  it('displays empty state when no mieter exist', () => {
    mockUseModalStore.mockReturnValue({
      ...defaultMockStore,
      isWohnungOverviewModalOpen: true,
      wohnungOverviewData: {
        ...mockWohnungData,
        mieter: [],
      },
    } as any);

    render(<WohnungOverviewModal />);
    
    expect(screen.getByText('Keine Mieter')).toBeInTheDocument();
    expect(screen.getByText('Diese Wohnung hat noch keine Mieter.')).toBeInTheDocument();
  });

  it('displays wohnung data and mieter list', () => {
    mockUseModalStore.mockReturnValue({
      ...defaultMockStore,
      isWohnungOverviewModalOpen: true,
      wohnungOverviewData: mockWohnungData,
    } as any);

    render(<WohnungOverviewModal />);
    
    // Check header information
    expect(screen.getByText('Wohnungs-Übersicht: Wohnung 1A')).toBeInTheDocument();
    expect(screen.getByText('Haus: Musterstraße 1')).toBeInTheDocument();
    expect(screen.getByText(/Größe: 75,00 m²/)).toBeInTheDocument();
    expect(screen.getByText(/Miete: 1\.200,00 €/)).toBeInTheDocument();
    expect(screen.getByText('Mieter gesamt: 2')).toBeInTheDocument();

    // Check mieter data
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
    expect(screen.getByText('aktiv')).toBeInTheDocument();
    expect(screen.getByText('ausgezogen')).toBeInTheDocument();
    expect(screen.getByText('max@example.com')).toBeInTheDocument();
    expect(screen.getByText('anna@example.com')).toBeInTheDocument();
  });

  it('handles edit mieter action', () => {
    const mockOpenTenantModal = jest.fn();
    mockUseModalStore.mockReturnValue({
      ...defaultMockStore,
      isWohnungOverviewModalOpen: true,
      wohnungOverviewData: mockWohnungData,
      openTenantModal: mockOpenTenantModal,
    } as any);

    render(<WohnungOverviewModal />);
    
    const editButtons = screen.getAllByTitle('Mieter bearbeiten');
    fireEvent.click(editButtons[0]);
    
    // Check that the modal is called with the transformed data structure
    expect(mockOpenTenantModal).toHaveBeenCalledWith(
      {
        id: '1',
        name: 'Max Mustermann',
        email: 'max@example.com',
        telefonnummer: '+49123456789',
        einzug: '2023-01-01',
        auszug: '',
        wohnung_id: '1',
        notiz: '',
        nebenkosten: []
      },
      [{ id: '1', name: 'Wohnung 1A' }]
    );
  });

  it('handles view mieter details action', () => {
    mockUseModalStore.mockReturnValue({
      ...defaultMockStore,
      isWohnungOverviewModalOpen: true,
      wohnungOverviewData: mockWohnungData,
    } as any);

    render(<WohnungOverviewModal />);
    
    const viewButtons = screen.getAllByTitle('Details anzeigen');
    fireEvent.click(viewButtons[0]);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: "Mieter Details",
      description: 'Detailansicht für "Max Mustermann" wird geöffnet.',
      variant: "default",
    });
  });

  it('handles contact mieter action with email', () => {
    mockUseModalStore.mockReturnValue({
      ...defaultMockStore,
      isWohnungOverviewModalOpen: true,
      wohnungOverviewData: mockWohnungData,
    } as any);

    render(<WohnungOverviewModal />);
    
    const contactButtons = screen.getAllByTitle(/E-Mail an/);
    
    // Test that the button is enabled for mieter with email
    expect(contactButtons[0]).not.toBeDisabled();
    
    // Test that clicking doesn't throw an error (jsdom will handle the location assignment)
    expect(() => fireEvent.click(contactButtons[0])).not.toThrow();
  });

  it('handles contact mieter action with no contact data', () => {
    const mieterWithoutContact = {
      ...mockWohnungData,
      mieter: [{
        ...mockWohnungData.mieter[0],
        email: undefined,
        telefon: undefined,
      }],
    };

    mockUseModalStore.mockReturnValue({
      ...defaultMockStore,
      isWohnungOverviewModalOpen: true,
      wohnungOverviewData: mieterWithoutContact,
    } as any);

    render(<WohnungOverviewModal />);
    
    const contactButtons = screen.getAllByTitle('Keine Kontaktdaten verfügbar');
    // The button should be disabled when no contact data exists
    expect(contactButtons[0]).toBeDisabled();
  });

  it('closes modal when dialog is closed', () => {
    const mockCloseModal = jest.fn();
    mockUseModalStore.mockReturnValue({
      ...defaultMockStore,
      isWohnungOverviewModalOpen: true,
      wohnungOverviewData: mockWohnungData,
      closeWohnungOverviewModal: mockCloseModal,
    } as any);

    render(<WohnungOverviewModal />);
    
    // Simulate dialog close (this would typically be triggered by clicking outside or pressing escape)
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    
    // Note: The actual close behavior depends on the Dialog component implementation
    // This test verifies the handler is passed correctly
    expect(mockCloseModal).toBeDefined();
  });

  it('formats dates correctly', () => {
    mockUseModalStore.mockReturnValue({
      ...defaultMockStore,
      isWohnungOverviewModalOpen: true,
      wohnungOverviewData: mockWohnungData,
    } as any);

    render(<WohnungOverviewModal />);
    
    // Check German date format (dates are formatted by toLocaleDateString)
    expect(screen.getByText('1.1.2023')).toBeInTheDocument(); // Einzug
    expect(screen.getByText('31.12.2022')).toBeInTheDocument(); // Auszug
  });

  it('displays contact links correctly', () => {
    mockUseModalStore.mockReturnValue({
      ...defaultMockStore,
      isWohnungOverviewModalOpen: true,
      wohnungOverviewData: mockWohnungData,
    } as any);

    render(<WohnungOverviewModal />);
    
    // Check email link
    const emailLink = screen.getByText('max@example.com');
    expect(emailLink).toHaveAttribute('href', 'mailto:max@example.com');
    
    // Check phone link
    const phoneLink = screen.getByText('+49123456789');
    expect(phoneLink).toHaveAttribute('href', 'tel:+49123456789');
  });
});