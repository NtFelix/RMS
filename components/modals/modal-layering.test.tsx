import React from 'react';
import { render, screen } from '@testing-library/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Mock Radix UI Dialog to test z-index behavior
jest.mock('@radix-ui/react-dialog', () => {
  const MockOverlay = React.forwardRef<HTMLDivElement, { className?: string }>(
    ({ className, ...props }, ref) => (
      <div 
        ref={ref} 
        data-testid="dialog-overlay" 
        className={className}
        {...props}
      />
    )
  );
  MockOverlay.displayName = 'Overlay';

  const MockContent = React.forwardRef<HTMLDivElement, { className?: string; children: React.ReactNode }>(
    ({ className, children, ...props }, ref) => (
      <div 
        ref={ref} 
        data-testid="dialog-content" 
        className={className}
        {...props}
      >
        {children}
      </div>
    )
  );
  MockContent.displayName = 'Content';

  const MockTitle = React.forwardRef<HTMLHeadingElement, { children: React.ReactNode }>(
    ({ children }, ref) => (
      <h2 ref={ref} data-testid="dialog-title">{children}</h2>
    )
  );
  MockTitle.displayName = 'Title';

  const MockDescription = React.forwardRef<HTMLParagraphElement, { children: React.ReactNode }>(
    ({ children }, ref) => (
      <p ref={ref} data-testid="dialog-description">{children}</p>
    )
  );
  MockDescription.displayName = 'Description';

  return {
    Root: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
      open ? <div data-testid="dialog-root">{children}</div> : null,
    Portal: ({ children }: { children: React.ReactNode }) => 
      <div data-testid="dialog-portal">{children}</div>,
    Overlay: MockOverlay,
    Content: MockContent,
    Close: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
      <button data-testid="dialog-close" onClick={onClick}>{children}</button>
    ),
    Title: MockTitle,
    Description: MockDescription,
  };
});

describe('Modal Layering', () => {
  it('applies correct z-index classes for modal layering', () => {
    render(
      <Dialog open={true}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Test Modal</DialogTitle>
            <DialogDescription>Test modal for layering tests</DialogDescription>
          </DialogHeader>
          <div>Overview Modal Content</div>
        </DialogContent>
      </Dialog>
    );

    const overlay = screen.getByTestId('dialog-overlay');
    const content = screen.getByTestId('dialog-content');

    // Check that the overlay has z-50 class (from dialog.tsx)
    expect(overlay).toHaveClass('z-50');
    
    // Check that the content also has z-50 class (from dialog.tsx)
    expect(content).toHaveClass('z-50');
  });

  it('handles multiple modals with proper layering', () => {
    render(
      <div>
        {/* First modal (overview) */}
        <Dialog open={true}>
          <DialogContent className="max-w-6xl" data-testid="overview-modal">
            <DialogHeader>
              <DialogTitle>Overview Modal</DialogTitle>
              <DialogDescription>Overview modal for testing</DialogDescription>
            </DialogHeader>
            <div>Overview Modal</div>
          </DialogContent>
        </Dialog>
        
        {/* Second modal (details) that should layer on top */}
        <Dialog open={true}>
          <DialogContent className="max-w-4xl" data-testid="details-modal">
            <DialogHeader>
              <DialogTitle>Details Modal</DialogTitle>
              <DialogDescription>Details modal for testing</DialogDescription>
            </DialogHeader>
            <div>Details Modal</div>
          </DialogContent>
        </Dialog>
      </div>
    );

    const overviewModal = screen.getByTestId('overview-modal');
    const detailsModal = screen.getByTestId('details-modal');

    // Both modals should be present
    expect(overviewModal).toBeInTheDocument();
    expect(detailsModal).toBeInTheDocument();

    // Both should have the same z-index class, but the second one rendered
    // will naturally appear on top due to DOM order
    expect(overviewModal).toHaveClass('z-50');
    expect(detailsModal).toHaveClass('z-50');
  });

  it('applies correct max-width classes for different modal sizes', () => {
    const { rerender } = render(
      <Dialog open={true}>
        <DialogContent className="max-w-6xl" data-testid="large-modal">
          <DialogHeader>
            <DialogTitle>Large Modal</DialogTitle>
            <DialogDescription>Large modal for size testing</DialogDescription>
          </DialogHeader>
          <div>Large Modal (6xl)</div>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByTestId('large-modal')).toHaveClass('max-w-6xl');

    rerender(
      <Dialog open={true}>
        <DialogContent className="max-w-4xl" data-testid="medium-modal">
          <DialogHeader>
            <DialogTitle>Medium Modal</DialogTitle>
            <DialogDescription>Medium modal for size testing</DialogDescription>
          </DialogHeader>
          <div>Medium Modal (4xl)</div>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByTestId('medium-modal')).toHaveClass('max-w-4xl');
  });

  it('maintains proper modal structure with portal rendering', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Modal</DialogTitle>
            <DialogDescription>Test modal for portal structure testing</DialogDescription>
          </DialogHeader>
          <div>Modal Content</div>
        </DialogContent>
      </Dialog>
    );

    // Verify the portal structure
    expect(screen.getByTestId('dialog-portal')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
    
    // Verify content is rendered
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });
});