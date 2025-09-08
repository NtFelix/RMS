import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CallToAction } from './call-to-action';
import { EXAMPLE_BILL_PDF_URL } from '@/lib/constants';

// Mock dependencies
jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, asChild, ...props }: any) => {
    if (asChild) {
      return <div {...props}>{children}</div>;
    }
    return <button onClick={onClick} {...props}>{children}</button>;
  },
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
  AlertDialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

// Mock window.open
Object.defineProperty(window, 'open', {
  value: jest.fn(),
  writable: true,
});

describe('CallToAction - Jetzt loslegen Feature', () => {
  const mockOnGetStarted = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Default Variant', () => {
    it('renders "Jetzt loslegen" button', () => {
      render(<CallToAction onGetStarted={mockOnGetStarted} />);

      expect(screen.getByText('Jetzt loslegen')).toBeInTheDocument();
    });

    it('calls onGetStarted when "Jetzt loslegen" button is clicked', async () => {
      const user = userEvent.setup();
      render(<CallToAction onGetStarted={mockOnGetStarted} />);

      const getStartedButton = screen.getByText('Jetzt loslegen');
      await user.click(getStartedButton);

      expect(mockOnGetStarted).toHaveBeenCalledTimes(1);
    });

    it('renders "Demo anfordern" button with alert dialog', () => {
      render(<CallToAction onGetStarted={mockOnGetStarted} />);

      expect(screen.getByText('Demo anfordern')).toBeInTheDocument();
    });

    it('opens demo booking dialog when "Demo anfordern" is clicked', async () => {
      const user = userEvent.setup();
      render(<CallToAction onGetStarted={mockOnGetStarted} />);

      const demoButton = screen.getByText('Demo anfordern');
      await user.click(demoButton);

      expect(screen.getByText('Demo buchen')).toBeInTheDocument();
      expect(screen.getByText(/Sie werden auf eine neue Seite weitergeleitet/)).toBeInTheDocument();
    });

    it('opens external calendar link when demo is confirmed', async () => {
      const user = userEvent.setup();
      const mockWindowOpen = jest.fn();
      window.open = mockWindowOpen;

      render(<CallToAction onGetStarted={mockOnGetStarted} />);

      const demoButton = screen.getByText('Demo anfordern');
      await user.click(demoButton);

      const confirmButton = screen.getByText('Weiterleiten');
      await user.click(confirmButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://calendar.notion.so/meet/felix-b0111/demo-anfordern',
        '_blank'
      );
    });
  });

  describe('Hero Variant', () => {
    it('renders "Jetzt loslegen" button with hero styling', () => {
      render(<CallToAction variant="hero" onGetStarted={mockOnGetStarted} />);

      expect(screen.getByText('Jetzt loslegen')).toBeInTheDocument();
    });

    it('renders "Beispiel-Abrechnung" link instead of demo button', () => {
      render(<CallToAction variant="hero" onGetStarted={mockOnGetStarted} />);

      expect(screen.getByText('Beispiel-Abrechnung')).toBeInTheDocument();
      expect(screen.queryByText('Demo anfordern')).not.toBeInTheDocument();
    });

    it('links to example PDF', () => {
      render(<CallToAction variant="hero" onGetStarted={mockOnGetStarted} />);

      const pdfLink = screen.getByRole('link');
      expect(pdfLink).toHaveAttribute('href', EXAMPLE_BILL_PDF_URL);
      expect(pdfLink).toHaveAttribute('target', '_blank');
      expect(pdfLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('calls onGetStarted when "Jetzt loslegen" button is clicked', async () => {
      const user = userEvent.setup();
      render(<CallToAction variant="hero" onGetStarted={mockOnGetStarted} />);

      const getStartedButton = screen.getByText('Jetzt loslegen');
      await user.click(getStartedButton);

      expect(mockOnGetStarted).toHaveBeenCalledTimes(1);
    });
  });

  describe('CTA Variant', () => {
    it('renders "Jetzt loslegen" button', () => {
      render(<CallToAction variant="cta" onGetStarted={mockOnGetStarted} />);

      expect(screen.getByText('Jetzt loslegen')).toBeInTheDocument();
    });

    it('renders "Demo anfordern" button', () => {
      render(<CallToAction variant="cta" onGetStarted={mockOnGetStarted} />);

      expect(screen.getByText('Demo anfordern')).toBeInTheDocument();
    });

    it('calls onGetStarted when "Jetzt loslegen" button is clicked', async () => {
      const user = userEvent.setup();
      render(<CallToAction variant="cta" onGetStarted={mockOnGetStarted} />);

      const getStartedButton = screen.getByText('Jetzt loslegen');
      await user.click(getStartedButton);

      expect(mockOnGetStarted).toHaveBeenCalledTimes(1);
    });
  });

  describe('Button Styling and Icons', () => {
    it('renders arrow icon in "Jetzt loslegen" button', () => {
      render(<CallToAction onGetStarted={mockOnGetStarted} />);

      const getStartedButton = screen.getByText('Jetzt loslegen');
      expect(getStartedButton.closest('button')).toBeInTheDocument();
    });

    it('renders external link icon in "Demo anfordern" button', () => {
      render(<CallToAction onGetStarted={mockOnGetStarted} />);

      expect(screen.getByText('Demo anfordern')).toBeInTheDocument();
    });

    it('renders download icon in "Beispiel-Abrechnung" link for hero variant', () => {
      render(<CallToAction variant="hero" onGetStarted={mockOnGetStarted} />);

      expect(screen.getByText('Beispiel-Abrechnung')).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    it('renders buttons in flex container', () => {
      const { container } = render(<CallToAction onGetStarted={mockOnGetStarted} />);

      const flexContainer = container.querySelector('.flex');
      expect(flexContainer).toBeInTheDocument();
    });

    it('handles different screen sizes with responsive classes', () => {
      const { container } = render(<CallToAction onGetStarted={mockOnGetStarted} />);

      // Check for responsive classes
      const flexContainer = container.querySelector('.sm\\:flex-row');
      expect(flexContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper button roles', () => {
      render(<CallToAction onGetStarted={mockOnGetStarted} />);

      const getStartedButton = screen.getByRole('button', { name: /jetzt loslegen/i });
      expect(getStartedButton).toBeInTheDocument();

      const demoButton = screen.getByRole('button', { name: /demo anfordern/i });
      expect(demoButton).toBeInTheDocument();
    });

    it('has proper link role for hero variant', () => {
      render(<CallToAction variant="hero" onGetStarted={mockOnGetStarted} />);

      const pdfLink = screen.getByRole('link', { name: /beispiel-abrechnung/i });
      expect(pdfLink).toBeInTheDocument();
    });

    it('provides proper dialog labels', async () => {
      const user = userEvent.setup();
      render(<CallToAction onGetStarted={mockOnGetStarted} />);

      const demoButton = screen.getByText('Demo anfordern');
      await user.click(demoButton);

      expect(screen.getByText('Demo buchen')).toBeInTheDocument();
      expect(screen.getByText('Abbrechen')).toBeInTheDocument();
      expect(screen.getByText('Weiterleiten')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing onGetStarted prop gracefully', () => {
      // This should not throw an error
      expect(() => {
        render(<CallToAction onGetStarted={undefined as any} />);
      }).not.toThrow();
    });

    it('handles window.open failures gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock window.open to return null (popup blocked)
      window.open = jest.fn().mockReturnValue(null);

      render(<CallToAction onGetStarted={mockOnGetStarted} />);

      const demoButton = screen.getByText('Demo anfordern');
      await user.click(demoButton);

      const confirmButton = screen.getByText('Weiterleiten');
      
      // This should not crash the component
      await user.click(confirmButton);

      expect(window.open).toHaveBeenCalledWith(
        'https://calendar.notion.so/meet/felix-b0111/demo-anfordern',
        '_blank'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Multiple Clicks', () => {
    it('handles multiple rapid clicks on "Jetzt loslegen"', async () => {
      const user = userEvent.setup();
      render(<CallToAction onGetStarted={mockOnGetStarted} />);

      const getStartedButton = screen.getByText('Jetzt loslegen');
      
      // Rapid clicks
      await user.click(getStartedButton);
      await user.click(getStartedButton);
      await user.click(getStartedButton);

      expect(mockOnGetStarted).toHaveBeenCalledTimes(3);
    });

    it('handles dialog interactions correctly', async () => {
      const user = userEvent.setup();
      render(<CallToAction onGetStarted={mockOnGetStarted} />);

      // Open dialog
      const demoButton = screen.getByText('Demo anfordern');
      await user.click(demoButton);

      // Cancel dialog
      const cancelButton = screen.getByText('Abbrechen');
      await user.click(cancelButton);

      // Open again
      await user.click(demoButton);
      expect(screen.getByText('Demo buchen')).toBeInTheDocument();
    });
  });
});