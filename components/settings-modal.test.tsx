import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // Added within
import { SettingsModal } from './settings-modal'; // Adjust path as needed
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client'; // Actual path to supabase client
import { getUserProfileForSettings } from '@/app/user-profile-actions'; // Actual path
import { useRouter } from 'next/navigation';

// --- Mocks ---
jest.mock('@/utils/supabase/client', () => {
  const mAuth = {
    reauthenticate: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id', email: 'test@example.com', user_metadata: { first_name: 'Test', last_name: 'User' } } }, error: null }),
  };
  const mFunctions = {
    invoke: jest.fn(),
  };
  return {
    createClient: jest.fn(() => ({
      auth: mAuth,
      functions: mFunctions,
    })),
  };
});

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(), // In case any info toasts are used
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock('@/app/user-profile-actions', () => ({
  getUserProfileForSettings: jest.fn().mockResolvedValue({
    // Provide a mock profile that matches UserProfileWithSubscription structure
    id: 'test-profile-id',
    email: 'test@example.com',
    stripe_subscription_status: 'active',
    currentWohnungenCount: 2,
    activePlan: {
      priceId: 'price_123',
      name: 'Standard Plan',
      price: 10,
      currency: 'EUR',
      features: ['Feature 1', 'Feature 2'],
      limitWohnungen: 5,
    },
    stripe_customer_id: 'cus_123',
    stripe_subscription_id: 'sub_123',
    stripe_cancel_at_period_end: false,
  }),
}));


// --- Test Suite ---
describe('Account Deletion in SettingsModal', () => {
  let mockSupabaseClient: ReturnType<typeof createClient>;
  let mockRouterPush: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Get a fresh instance of the mocked Supabase client for assertions
    // This ensures that createClient() in the component returns our mock with its mock methods
    mockSupabaseClient = createClient();

    // Get a fresh instance of the mocked router.push
    const router = useRouter();
    mockRouterPush = router.push as jest.Mock;

    // Default mock implementations
    (mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com', user_metadata: { first_name: 'Test', last_name: 'User' } } },
        error: null,
    });
    (getUserProfileForSettings as jest.Mock).mockResolvedValue({
        id: 'test-profile-id',
        email: 'test@example.com',
        stripe_subscription_status: 'active',
    });
  });

  const renderModal = () => {
    return render(<SettingsModal open={true} onOpenChange={jest.fn()} />);
  };

  // Helper to switch to profile tab - though it's default
  const switchToProfileTab = async () => {
    // The navigation buttons are within a <nav> element.
    const navElement = screen.getByRole('navigation');
    const profileTabButton = await within(navElement).findByRole('button', { name: /Profil/i });
    fireEvent.click(profileTabButton);
  };

  test('initial state: delete section is hidden', async () => {
    renderModal();
    await switchToProfileTab();

    expect(screen.getByRole('button', { name: /Konto löschen/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Bestätigungscode/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Code bestätigen und Konto löschen/i })).not.toBeInTheDocument();
  });

  test('reauthentication initiation success: shows confirmation section and success toast', async () => {
    (mockSupabaseClient.auth.reauthenticate as jest.Mock).mockResolvedValue({ error: null });
    renderModal();
    await switchToProfileTab();

    const deleteButton = screen.getByRole('button', { name: /Konto löschen/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockSupabaseClient.auth.reauthenticate).toHaveBeenCalledTimes(1);
    });
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Bestätigungscode wurde an Ihre E-Mail gesendet"));
    expect(screen.getByLabelText(/Bestätigungscode \(OTP\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Code bestätigen und Konto löschen/i })).toBeInTheDocument();
  });

  test('reauthentication initiation failure: shows error toast and hides confirmation section', async () => {
    const errorMessage = "Reauth failed";
    (mockSupabaseClient.auth.reauthenticate as jest.Mock).mockResolvedValue({ error: { message: errorMessage } });
    renderModal();
    await switchToProfileTab();

    const deleteButton = screen.getByRole('button', { name: /Konto löschen/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockSupabaseClient.auth.reauthenticate).toHaveBeenCalledTimes(1);
    });
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    expect(screen.queryByLabelText(/Bestätigungscode/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Code bestätigen und Konto löschen/i })).not.toBeInTheDocument();
  });

  test('final deletion attempt with missing code: shows error toast, no function call', async () => {
    (mockSupabaseClient.auth.reauthenticate as jest.Mock).mockResolvedValue({ error: null }); // Make reauth pass
    renderModal();
    await switchToProfileTab();

    // Show confirmation section
    fireEvent.click(screen.getByRole('button', { name: /Konto löschen/i }));
    await waitFor(() => expect(screen.getByLabelText(/Bestätigungscode \(OTP\)/i)).toBeInTheDocument());

    const confirmDeleteButton = screen.getByRole('button', { name: /Code bestätigen und Konto löschen/i });
    fireEvent.click(confirmDeleteButton);

    expect(toast.error).toHaveBeenCalledWith("Bestätigungscode ist erforderlich.");
    expect(mockSupabaseClient.functions.invoke).not.toHaveBeenCalled();
  });

  test('final deletion success: invokes function, signs out, redirects, shows success toast', async () => {
    (mockSupabaseClient.auth.reauthenticate as jest.Mock).mockResolvedValue({ error: null });
    (mockSupabaseClient.functions.invoke as jest.Mock).mockResolvedValue({ data: {}, error: null });
    (mockSupabaseClient.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

    renderModal();
    await switchToProfileTab();

    // 1. Initiate reauth
    fireEvent.click(screen.getByRole('button', { name: /Konto löschen/i }));
    await waitFor(() => expect(screen.getByLabelText(/Bestätigungscode \(OTP\)/i)).toBeInTheDocument());

    // 2. Enter code
    const codeInput = screen.getByLabelText(/Bestätigungscode \(OTP\)/i);
    fireEvent.change(codeInput, { target: { value: '123456' } });

    // 3. Confirm deletion
    const confirmDeleteButton = screen.getByRole('button', { name: /Code bestätigen und Konto löschen/i });
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith("delete-user-account", {});
    });
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Ihr Konto wurde erfolgreich gelöscht."));
    expect(mockSupabaseClient.auth.signOut).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith("/auth/login");
  });

  test('final deletion failure (Edge Function error): shows error toast, no sign out/redirect', async () => {
    const functionErrorMessage = "Edge function failed spectacularly";
    (mockSupabaseClient.auth.reauthenticate as jest.Mock).mockResolvedValue({ error: null });
    (mockSupabaseClient.functions.invoke as jest.Mock).mockResolvedValue({ error: { message: functionErrorMessage } });

    renderModal();
    await switchToProfileTab();

    // 1. Initiate reauth
    fireEvent.click(screen.getByRole('button', { name: /Konto löschen/i }));
    await waitFor(() => expect(screen.getByLabelText(/Bestätigungscode \(OTP\)/i)).toBeInTheDocument());

    // 2. Enter code
    const codeInput = screen.getByLabelText(/Bestätigungscode \(OTP\)/i);
    fireEvent.change(codeInput, { target: { value: '123456' } });

    // 3. Confirm deletion
    const confirmDeleteButton = screen.getByRole('button', { name: /Code bestätigen und Konto löschen/i });
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith("delete-user-account", {});
    });
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining(functionErrorMessage));
    expect(mockSupabaseClient.auth.signOut).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
