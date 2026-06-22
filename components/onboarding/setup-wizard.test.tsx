import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SetupWizard } from './setup-wizard';

// Mock hooks
jest.mock('posthog-js/react', () => ({
    usePostHog: () => ({
        capture: jest.fn(),
    }),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: jest.fn(),
    }),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

describe('SetupWizard', () => {
    let mockFetch: jest.Mock;

    beforeEach(() => {
        mockFetch = jest.fn();
        global.fetch = mockFetch;

        // Setup initial API response for check
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                setupCompleted: false,
                stripeCustomerId: null,
                firstName: '',
                lastName: '',
                billingAddress: null,
            }),
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('calls /api/user/onboarding when skipping the product tour', async () => {
        const onCompleteMock = jest.fn();

        render(<SetupWizard isOpen={true} onComplete={onCompleteMock} />);

        // Wait for loading to finish and "Jetzt starten" button to appear
        const startButton = await screen.findByRole('button', { name: /Jetzt starten/i });
        fireEvent.click(startButton);

        // Wait for the 'name' step and fill inputs
        const nameInput = await screen.findByLabelText(/Vorname/i);
        fireEvent.change(nameInput, { target: { value: 'John' } });
        const lastNameInput = await screen.findByLabelText(/Nachname/i);
        fireEvent.change(lastNameInput, { target: { value: 'Doe' } });

        // Re-mock fetch for saving setup
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, skipped: false }),
        });

        const saveNameButton = await screen.findByRole('button', { name: /Einrichtung abschließen/i });
        fireEvent.click(saveNameButton);

        // Wait for the 'tour_prompt' step which says "Selbst entdecken"
        const skipTourButton = await screen.findByRole('button', { name: /Selbst entdecken/i });
        expect(skipTourButton).toBeInTheDocument();

        // Re-mock fetch for saving onboarding status
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        });

        // Click skip tour
        fireEvent.click(skipTourButton);

        // Verify the API was called to mark onboarding as completed
        expect(mockFetch).toHaveBeenCalledWith('/api/user/onboarding', { method: 'POST' });

        // Verify that it transitions to finalizing and calls onComplete
        const finalizingText = await screen.findByText(/Wir bereiten Ihr Dashboard vor/i);
        expect(finalizingText).toBeInTheDocument();

        // Wait for the timeout
        await waitFor(() => {
            expect(onCompleteMock).toHaveBeenCalled();
        }, { timeout: 3000 });
    });
});
