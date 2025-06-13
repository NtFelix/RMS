import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubscriptionLockedPage from './page'; // Adjust path as necessary, assuming it's in the same folder

// Mock lucide-react Lock icon
jest.mock('lucide-react', () => {
  const originalModule = jest.requireActual('lucide-react');
  return {
    ...originalModule,
    Lock: (props: any) => <svg data-testid="lock-icon" {...props} />, // Mock with a test ID
  };
});

describe('SubscriptionLockedPage', () => {
  beforeEach(() => {
    render(<SubscriptionLockedPage />);
  });

  it('should display the lock icon', () => {
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
  });

  it('should display the headline "Zugriff gesperrt"', () => {
    expect(screen.getByRole('heading', { name: /Zugriff gesperrt/i })).toBeInTheDocument();
  });

  it('should display the descriptive text', () => {
    expect(screen.getByText(/Ihr aktuelles Abonnement erlaubt keinen Zugriff auf diese Seite./i)).toBeInTheDocument();
  });

  it('should render the "Abo auswählen" button', () => {
    expect(screen.getByRole('button', { name: /Abo auswählen/i })).toBeInTheDocument();
  });

  it('should render the "Daten herunterladen" button', () => {
    expect(screen.getByRole('button', { name: /Daten herunterladen/i })).toBeInTheDocument();
  });
});
