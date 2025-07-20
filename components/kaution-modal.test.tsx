import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useModalStore } from '@/hooks/use-modal-store';
import { KautionModal } from './kaution-modal';
import * as mieterActions from '@/app/mieter-actions';
import { toast } from 'sonner';

jest.mock('@/hooks/use-modal-store');
jest.mock('@/app/mieter-actions', () => ({
  updateKautionAction: jest.fn(),
}));
jest.mock('sonner');

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;
const mockUpdateKautionAction = mieterActions.updateKautionAction as jest.Mock;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('KautionModal', () => {
  const mockTenant = { id: '1', name: 'John Doe' };
  const mockCloseKautionModal = jest.fn();
  const mockSetKautionModalDirty = jest.fn();

  beforeEach(() => {
    mockUseModalStore.mockReturnValue({
      isKautionModalOpen: true,
      closeKautionModal: mockCloseKautionModal,
      kautionInitialData: {
        tenant: mockTenant,
        existingKaution: undefined,
        suggestedAmount: 1500,
      },
      setKautionModalDirty: mockSetKautionModalDirty,
    });
    mockUpdateKautionAction.mockClear();
    mockToast.success.mockClear();
    mockToast.error.mockClear();
  });

  it('renders the modal with initial data', () => {
    render(<KautionModal />);

    expect(screen.getByText('Kaution verwalten')).toBeInTheDocument();
    expect(screen.getByText(`Mieter: ${mockTenant.name}`)).toBeInTheDocument();
    expect(screen.getByLabelText('Betrag (€)')).toHaveValue(1500);
    expect(screen.getByLabelText('Zahlungsdatum')).toBeInTheDocument();
  });

  it('calls updateKautionAction on form submission and shows success toast', async () => {
    mockUpdateKautionAction.mockResolvedValue({ success: true });
    render(<KautionModal />);

    fireEvent.change(screen.getByLabelText('Betrag (€)'), { target: { value: '1600' } });
    fireEvent.click(screen.getByText('Speichern'));

    await waitFor(() => {
      expect(mockUpdateKautionAction).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Kaution erfolgreich gespeichert');
      expect(mockCloseKautionModal).toHaveBeenCalledWith({ force: true });
    });
  });

  it('shows an error toast if saving fails', async () => {
    mockUpdateKautionAction.mockResolvedValue({ success: false, error: { message: 'Save failed' } });
    render(<KautionModal />);

    fireEvent.click(screen.getByText('Speichern'));

    await waitFor(() => {
      expect(mockUpdateKautionAction).toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith('Save failed');
    });
  });
});
