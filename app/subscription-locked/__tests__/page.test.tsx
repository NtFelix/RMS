import React from 'react';
import { render, screen, within } from '@testing-library/react'; // Added within
import '@testing-library/jest-dom';
import SubscriptionLockedPage from '../page';

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const originalModule = jest.requireActual('lucide-react');
  return {
    ...originalModule,
    Lock: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="lock-icon" {...props} />,
    Package: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="package-icon" {...props} />,
    Download: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="download-icon" {...props} />,
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

  it('should render the "Abo auswählen" button with package icon', () => {
    const button = screen.getByRole('button', { name: /Abo auswählen/i });
    expect(button).toBeInTheDocument();
    // Check for the icon within the button
    expect(within(button).getByTestId('package-icon')).toBeInTheDocument();
  });

  it('should render the "Daten herunterladen" button with download icon', () => {
    const button = screen.getByRole('button', { name: /Daten herunterladen/i });
    expect(button).toBeInTheDocument();
    // Check for the icon within the button
    expect(within(button).getByTestId('download-icon')).toBeInTheDocument();
  });
});
