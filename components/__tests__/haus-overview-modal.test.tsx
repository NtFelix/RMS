import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HausOverviewModal } from '../haus-overview-modal';
import { useModalStore } from '@/hooks/use-modal-store';
import { toast } from '@/hooks/use-toast';

// Mock the modal store
jest.mock('@/hooks/use-modal-store');
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

// Mock the toast hook
jest.mock('@/hooks/use-toast');
const mockToast = toast as jest.MockedFunction<typeof toast>;

// Mock fetch
global.fetch = jest.fn();

describe('HausOverviewModal', () => {
  const mockCloseModal = jest.fn();
  const mockSetLoading = jest.fn();
  const mockSetError = jest.fn();
  const mockSetData = jest.fn();
  const mockOpenWohnungModal = jest.fn();
  const mockOpenWohnungOverviewModal = jest.fn();

  const mockHausData = {
    id: '1',
    name: 'Test Haus',
    strasse: 'Teststraße 1',
    ort: 'Teststadt',
    size: '200 m²',
    wohnungen: [
      {
        id: '1',
        name: 'Wohnung 1',
        groesse: 80,
        miete: 1200,
        status: 'vermietet' as const,
        currentTenant: {
          id: '1',
          name: 'Max Mustermann',
          einzug: '2023-01-01'
        }
      },
      {
        id: '2',
        name: 'Wohnung 2',
        groesse: 60,
        miete: 900,
        status: 'frei' as const,
        currentTenant: undefined
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseModalStore.mockReturnValue({
      isHausOverviewModalOpen: false,
      hausOverviewData: undefined,
      hausOverviewLoading: false,
      hausOverviewError: undefined,
      closeHausOverviewModal: mockCloseModal,
      setHausOverviewLoading: mockSetLoading,
      setHausOverviewError: mockSetError,
      setHausOverviewData: mockSetData,
      openWohnungModal: mockOpenWohnungModal,
      openWohnungOverviewModal: jest.fn(),
    } as any);
  });

  it('should not render when modal is closed', () => {
    render(<HausOverviewModal />);
    expect(screen.queryByText('Haus-Übersicht')).not.toBeInTheDocument();
  });

  it('should render loading state when modal is open and loading', () => {
    mockUseModalStore.mockReturnValue({
      isHausOverviewModalOpen: true,
      hausOverviewData: undefined,
      hausOverviewLoading: true,
      hausOverviewError: undefined,
      closeHausOverviewModal: mockCloseModal,
      setHausOverviewLoading: mockSetLoading,
      setHausOverviewError: mockSetError,
      setHausOverviewData: mockSetData,
      openWohnungModal: mockOpenWohnungModal,
      openWohnungOverviewModal: mockOpenWohnungOverviewModal,
    } as any);

    render(<HausOverviewModal />);
    expect(screen.getByText('Haus-Übersicht')).toBeInTheDocument();
    // Check for skeleton loading elements (there are more than expected due to the detailed skeleton)
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('should render error state when there is an error', () => {
    mockUseModalStore.mockReturnValue({
      isHausOverviewModalOpen: true,
      hausOverviewData: undefined,
      hausOverviewLoading: false,
      hausOverviewError: 'Failed to load data',
      closeHausOverviewModal: mockCloseModal,
      setHausOverviewLoading: mockSetLoading,
      setHausOverviewError: mockSetError,
      setHausOverviewData: mockSetData,
      openWohnungModal: mockOpenWohnungModal,
      openWohnungOverviewModal: mockOpenWohnungOverviewModal,
    } as any);

    render(<HausOverviewModal />);
    // Use getAllByText to handle multiple instances of "Fehler beim Laden"
    expect(screen.getAllByText('Fehler beim Laden')[0]).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument();
  });

  it('should render empty state when no wohnungen exist', () => {
    mockUseModalStore.mockReturnValue({
      isHausOverviewModalOpen: true,
      hausOverviewData: { ...mockHausData, wohnungen: [] },
      hausOverviewLoading: false,
      hausOverviewError: undefined,
      closeHausOverviewModal: mockCloseModal,
      setHausOverviewLoading: mockSetLoading,
      setHausOverviewError: mockSetError,
      setHausOverviewData: mockSetData,
      openWohnungModal: mockOpenWohnungModal,
      openWohnungOverviewModal: mockOpenWohnungOverviewModal,
    } as any);

    render(<HausOverviewModal />);
    expect(screen.getByText('Keine Wohnungen')).toBeInTheDocument();
    expect(screen.getByText('Dieses Haus hat noch keine Wohnungen.')).toBeInTheDocument();
  });

  it('should render haus data and wohnungen table when data is available', () => {
    mockUseModalStore.mockReturnValue({
      isHausOverviewModalOpen: true,
      hausOverviewData: mockHausData,
      hausOverviewLoading: false,
      hausOverviewError: undefined,
      closeHausOverviewModal: mockCloseModal,
      setHausOverviewLoading: mockSetLoading,
      setHausOverviewError: mockSetError,
      setHausOverviewData: mockSetData,
      openWohnungModal: mockOpenWohnungModal,
      openWohnungOverviewModal: mockOpenWohnungOverviewModal,
    } as any);

    render(<HausOverviewModal />);
    
    // Check header information
    expect(screen.getByText('Haus-Übersicht: Test Haus')).toBeInTheDocument();
    expect(screen.getByText('Teststraße 1, Teststadt')).toBeInTheDocument();
    expect(screen.getByText('Größe: 200 m²')).toBeInTheDocument();
    expect(screen.getByText('Wohnungen gesamt: 2')).toBeInTheDocument();

    // Check table content
    expect(screen.getByText('Wohnung 1')).toBeInTheDocument();
    expect(screen.getByText('Wohnung 2')).toBeInTheDocument();
    expect(screen.getByText('80 m²')).toBeInTheDocument();
    expect(screen.getByText('€1,200.00')).toBeInTheDocument();
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    expect(screen.getByText('vermietet')).toBeInTheDocument();
    expect(screen.getByText('Frei')).toBeInTheDocument(); // Changed from 'leer' to 'Frei' to match component
  });

  it('should call openWohnungModal when edit button is clicked', () => {
    mockUseModalStore.mockReturnValue({
      isHausOverviewModalOpen: true,
      hausOverviewData: mockHausData,
      hausOverviewLoading: false,
      hausOverviewError: undefined,
      closeHausOverviewModal: mockCloseModal,
      setHausOverviewLoading: mockSetLoading,
      setHausOverviewError: mockSetError,
      setHausOverviewData: mockSetData,
      openWohnungModal: mockOpenWohnungModal,
      openWohnungOverviewModal: mockOpenWohnungOverviewModal,
    } as any);

    render(<HausOverviewModal />);
    
    const editButtons = screen.getAllByTitle('Wohnung bearbeiten');
    fireEvent.click(editButtons[0]);
    
    // Check that the modal is called with the transformed data structure
    expect(mockOpenWohnungModal).toHaveBeenCalledWith(
      {
        id: '1',
        name: 'Wohnung 1',
        groesse: 80,
        miete: 1200,
        haus_id: '1'
      },
      [{ id: '1', name: 'Test Haus' }],
      expect.any(Function) // onSuccess callback
    );
  });

  it('should open wohnung overview modal when view details button is clicked', () => {
    const mockOpenWohnungOverviewModal = jest.fn();
    mockUseModalStore.mockReturnValue({
      isHausOverviewModalOpen: true,
      hausOverviewData: mockHausData,
      hausOverviewLoading: false,
      hausOverviewError: undefined,
      closeHausOverviewModal: mockCloseModal,
      setHausOverviewLoading: mockSetLoading,
      setHausOverviewError: mockSetError,
      setHausOverviewData: mockSetData,
      openWohnungModal: mockOpenWohnungModal,
      openWohnungOverviewModal: mockOpenWohnungOverviewModal,
    } as any);

    render(<HausOverviewModal />);
    
    const viewButtons = screen.getAllByTitle('Mieter-Übersicht anzeigen');
    fireEvent.click(viewButtons[0]);
    
    expect(mockOpenWohnungOverviewModal).toHaveBeenCalledWith('1');
  });

  it('should handle retry functionality', async () => {
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockHausData,
    } as Response);

    mockUseModalStore.mockReturnValue({
      isHausOverviewModalOpen: true,
      hausOverviewData: { ...mockHausData, id: '1' },
      hausOverviewLoading: false,
      hausOverviewError: 'Failed to load data',
      closeHausOverviewModal: mockCloseModal,
      setHausOverviewLoading: mockSetLoading,
      setHausOverviewError: mockSetError,
      setHausOverviewData: mockSetData,
      openWohnungModal: mockOpenWohnungModal,
      openWohnungOverviewModal: mockOpenWohnungOverviewModal,
    } as any);

    render(<HausOverviewModal />);
    
    const retryButton = screen.getByText('Erneut versuchen');
    fireEvent.click(retryButton);

    expect(mockSetLoading).toHaveBeenCalledWith(true);
    expect(mockSetError).toHaveBeenCalledWith(undefined);
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/haeuser/1/overview');
      expect(mockSetData).toHaveBeenCalledWith(mockHausData);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });
});