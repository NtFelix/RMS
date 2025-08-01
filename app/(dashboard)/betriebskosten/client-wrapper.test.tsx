import { render, screen, fireEvent } from '@testing-library/react';
import BetriebskostenClientWrapper from './client-wrapper';
import { useModalStore } from '@/hooks/use-modal-store';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// Mock the hooks
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockOpenBetriebskostenModal = jest.fn();
const mockToast = jest.fn();
const mockRouterRefresh = jest.fn();

const defaultProps = {
  initialNebenkosten: [],
  initialHaeuser: [],
  userId: 'user-123',
  ownerName: 'Test Owner',
};

describe('BetriebskostenClientWrapper', () => {
  beforeEach(() => {
    (useModalStore as jest.Mock).mockReturnValue({
      openBetriebskostenModal: mockOpenBetriebskostenModal,
    });
    (useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    });
    (useRouter as jest.Mock).mockReturnValue({
      refresh: mockRouterRefresh,
    });
    jest.clearAllMocks();
  });

  it('renders the component', () => {
    render(<BetriebskostenClientWrapper {...defaultProps} />);
    expect(screen.getByText('Betriebskosten')).toBeInTheDocument();
    expect(screen.getByText('Betriebskostenabrechnung erstellen')).toBeInTheDocument();
  });

  it('calls openBetriebskostenModal when "Betriebskostenabrechnung erstellen" button is clicked', () => {
    render(<BetriebskostenClientWrapper {...defaultProps} />);
    fireEvent.click(screen.getByText('Betriebskostenabrechnung erstellen'));
    expect(mockOpenBetriebskostenModal).toHaveBeenCalled();
  });
});
