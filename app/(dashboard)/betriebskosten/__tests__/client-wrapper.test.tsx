import { render, screen, fireEvent, act } from '@testing-library/react';
import { getMieterByHausIdAction } from '@/app/mieter-actions';
import BetriebskostenClientWrapper from './client-wrapper';
import { useModalStore } from '@/hooks/use-modal-store';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { deleteNebenkosten } from '@/app/betriebskosten-actions';

// Mock the modal store
const mockModalStore = {
  isTenantModalOpen: false,
  tenantInitialData: undefined,
  tenantModalWohnungen: [],
  isTenantModalDirty: false,
  openTenantModal: jest.fn(),
  closeTenantModal: jest.fn(),
  setTenantModalDirty: jest.fn(),
  
  isHouseModalOpen: false,
  houseInitialData: undefined,
  houseModalOnSuccess: undefined,
  isHouseModalDirty: false,
  openHouseModal: jest.fn(),
  closeHouseModal: jest.fn(),
  
  isBetriebskostenModalOpen: false,
  betriebskostenInitialData: undefined,
  betriebskostenModalHaeuser: [],
  openBetriebskostenModal: jest.fn(),
  closeBetriebskostenModal: jest.fn(),
  setBetriebskostenModalDirty: jest.fn(),
};

jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => mockModalStore,
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/app/mieter-actions', () => ({
  deleteNebenkosten: jest.fn(),
  getMieterByHausIdAction: jest.fn(),
}));

const mockOpenBetriebskostenModal = jest.fn();
const mockToast = jest.fn();
const mockRouterRefresh = jest.fn();

const defaultProps = {
  initialNebenkosten: [],
  initialHaeuser: [],
  userId: 'user123',
  ownerName: 'Test Owner',
};

const mockNebenkostenData = [{ 
  id: 'nk1', 
  jahr: '2023', 
  Haeuser: { name: 'Haus A' }, 
  nebenkostenart: ['Strom'], 
  betrag: [100], 
  berechnungsart: ['Einheit'], 
  wasserkosten: 50, 
  haeuser_id: 'h1', 
  user_id: 'u1' 
}];

const mockHaeuserData = [{ 
  id: 'h1', 
  name: 'Haus A', 
  ort: 'Ort A', 
  strasse: 'Strasse A', 
  user_id: 'u1'
}];

const mockUserId = "user123";

describe('BetriebskostenClientWrapper', () => {
  beforeEach(() => {
    (useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    });
    (useRouter as jest.Mock).mockReturnValue({
      refresh: mockRouterRefresh,
    });
    jest.clearAllMocks();
    
    // Mock getMieterByHausIdAction
    (getMieterByHausIdAction as jest.Mock).mockResolvedValue({
      success: true,
      data: [{ id: 't1', name: 'Test Mieter' }]
    });
    
    // Reset modal store mock functions
    mockModalStore.openBetriebskostenModal.mockClear();
    mockModalStore.closeBetriebskostenModal.mockClear();
    mockModalStore.setBetriebskostenModalDirty.mockClear();
  });

  it('renders correctly with initial data', () => {
    render(<BetriebskostenClientWrapper {...defaultProps} />);
    expect(screen.getByText('Betriebskostenübersicht')).toBeInTheDocument();
    expect(screen.getByText('Betriebskostenabrechnung erstellen')).toBeInTheDocument();
  });

  it('renders the Betriebskosten title and create button', () => {
    render(<BetriebskostenClientWrapper {...defaultProps} />);
    
    // Check if the main title and create button are rendered
    expect(screen.getByText('Betriebskostenübersicht')).toBeInTheDocument();
    expect(screen.getByText('Betriebskostenabrechnung erstellen')).toBeInTheDocument();
  });

  it('renders the Betriebskostenübersicht section', () => {
    render(<BetriebskostenClientWrapper {...defaultProps} />);
    
    // Check if the overview section is rendered
    expect(screen.getByText('Betriebskostenübersicht')).toBeInTheDocument();
    expect(screen.getByText('Betriebskostenabrechnung erstellen')).toBeInTheDocument();
  });

  it('renders the filter buttons', () => {
    render(<BetriebskostenClientWrapper {...defaultProps} />);
    
    // Check if the filter buttons are rendered
    expect(screen.getByText('Alle')).toBeInTheDocument();
    expect(screen.getByText('Noch nicht erledigt')).toBeInTheDocument();
    expect(screen.getByText('Vorherige Abrechnungen')).toBeInTheDocument();
  });

  it('renders the table with correct headers', () => {
    render(<BetriebskostenClientWrapper {...defaultProps} />);
    
    // Check if the table headers are rendered
    expect(screen.getByText('Jahr')).toBeInTheDocument();
    expect(screen.getByText('Haus')).toBeInTheDocument();
    expect(screen.getByText('Kostenarten')).toBeInTheDocument();
    expect(screen.getByText('Beträge')).toBeInTheDocument();
    expect(screen.getByText('Berechnungsarten')).toBeInTheDocument();
    expect(screen.getByText('Wasserkosten')).toBeInTheDocument();
  });

  it('displays a message when no data is available', () => {
    render(<BetriebskostenClientWrapper {...defaultProps} initialNebenkosten={[]} />);
    
    // Check if the no data message is displayed
    expect(screen.getByText('Keine Betriebskostenabrechnungen gefunden.')).toBeInTheDocument();
  });

  it('calls openBetriebskostenModal when "Betriebskostenabrechnung erstellen" button is clicked', async () => {
    render(<BetriebskostenClientWrapper {...defaultProps} initialHaeuser={mockHaeuserData} />);
    
    // Find and click the "Betriebskostenabrechnung erstellen" button
    const createButton = screen.getByRole('button', { name: /Betriebskostenabrechnung erstellen/i });
    await act(async () => {
      fireEvent.click(createButton);
    });
    
    // Check if the modal store's openBetriebskostenModal was called
    expect(mockModalStore.openBetriebskostenModal).toHaveBeenCalled();
  });
});
