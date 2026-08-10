import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
        jest.useFakeTimers();
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
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('finalizes and calls onComplete after saving the name step', async () => {
        const onCompleteMock = jest.fn();

        render(<SetupWizard isOpen={true} onComplete={onCompleteMock} />);

        // Advance timers if there are any immediate microtasks/useEffect timers
        act(() => {
            jest.advanceTimersByTime(100);
        });

        // Wait for loading to finish and "Jetzt starten" button to appear
        const startButton = await screen.findByRole('button', { name: /Jetzt starten/i });
        fireEvent.click(startButton);

        act(() => {
            jest.advanceTimersByTime(100);
        });

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

        // Verify that it transitions directly to finalizing (no tour prompt anymore)
        const finalizingText = await screen.findByText(/Wir bereiten Ihr Dashboard vor/i);
        expect(finalizingText).toBeInTheDocument();

        // Fast-forward the completeTimeout (2000ms)
        act(() => {
            jest.advanceTimersByTime(2000);
        });

        expect(onCompleteMock).toHaveBeenCalled();
    });
});
