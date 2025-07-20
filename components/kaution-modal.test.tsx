import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useModalStore } from '@/hooks/use-modal-store';
import { KautionModal } from './kaution-modal';
import { updateKautionAction } from '@/app/mieter/[id]/kaution/actions';
import { toast } from 'sonner';

jest.mock('@/hooks/use-modal-store');
jest.mock('@/app/mieter/[id]/kaution/actions', () => ({
  updateKautionAction: jest.fn(),
  getSuggestedKaution: jest.fn(),
}));
jest.mock('sonner');

const mockUseModalStore = useModalStore as jest.Mock;
const mockUpdateKautionAction = updateKautionAction as jest.Mock;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('KautionModal', () => {
  const mockCloseKautionModal = jest.fn();
  const mockSetKautionModalDirty = jest.fn();

  beforeEach(() => {
    mockUseModalStore.mockReturnValue({
      isKautionModalOpen: true,
      closeKautionModal: mockCloseKautionModal,
      kautionInitialData: {
        tenant: { id: 'tenant-1', name: 'John Doe' },
        suggestedAmount: 1500,
      },
      setKautionModalDirty: mockSetKautionModalDirty,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with initial data', () => {
    render(<KautionModal />);

    expect(screen.getByText('Kaution verwalten')).toBeInTheDocument();
    expect(screen.getByText('Mieter: John Doe')).toBeInTheDocument();
    expect(screen.getByLabelText('Betrag (€)')).toBeInTheDocument();
    expect(screen.getByText('Vorschlag: 1500 €')).toBeInTheDocument();
  });

  it('calls updateKautionAction on form submission', async () => {
    mockUpdateKautionAction.mockResolvedValue({ success: true });
    render(<KautionModal />);

    fireEvent.change(screen.getByLabelText('Betrag (€)'), {
      target: { value: '1600' },
    });
    fireEvent.click(screen.getByText('Speichern'));

    await waitFor(() => {
      expect(mockUpdateKautionAction).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        'Kaution erfolgreich gespeichert.'
      );
      expect(mockCloseKautionModal).toHaveBeenCalledWith({ force: true });
    });
  });

  it('shows an error toast on failed submission', async () => {
    mockUpdateKautionAction.mockResolvedValue({
      success: false,
      error: { message: 'Test error' },
    });
    render(<KautionModal />);

    fireEvent.change(screen.getByLabelText('Betrag (€)'), {
      target: { value: '1600' },
    });
    fireEvent.click(screen.getByText('Speichern'));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Test error');
    });
  });
});
