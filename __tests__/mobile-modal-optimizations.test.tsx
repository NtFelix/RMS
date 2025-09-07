import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// Mock the useIsMobile hook
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => true, // Always return true for mobile tests
}));

// Test component that uses the optimized modal components
const TestModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Test Modal</DialogTitle>
          <DialogDescription>Test modal for mobile optimizations</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            data-testid="test-input"
            placeholder="Test input"
          />
          <Select>
            <SelectTrigger data-testid="test-select">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

describe('Mobile Modal Optimizations', () => {
  it('should render modal with mobile-optimized sizing', () => {
    render(<TestModal open={true} onOpenChange={() => {}} />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    
    // Check that the modal content has mobile-first classes
    expect(modal).toHaveClass('h-full', 'max-h-screen', 'p-4');
  });

  it('should have touch-friendly input elements', () => {
    render(<TestModal open={true} onOpenChange={() => {}} />);
    
    const input = screen.getByTestId('test-input');
    expect(input).toHaveClass('min-h-[44px]');
    
    const select = screen.getByTestId('test-select');
    expect(select).toHaveClass('min-h-[44px]');
  });

  it('should have touch-friendly buttons', () => {
    render(<TestModal open={true} onOpenChange={() => {}} />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('min-h-[44px]');
    });
  });

  it('should have proper mobile footer layout', () => {
    render(<TestModal open={true} onOpenChange={() => {}} />);
    
    // Find the footer by looking for the container with both buttons
    const cancelButton = screen.getByText('Cancel');
    const saveButton = screen.getByText('Save');
    const footer = cancelButton.closest('div');
    
    expect(footer).toHaveClass('flex', 'flex-col', 'gap-3');
  });

  it('should have touch-friendly close button', () => {
    render(<TestModal open={true} onOpenChange={() => {}} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toHaveClass('min-h-[44px]', 'min-w-[44px]');
  });

  it('should handle modal interactions properly', async () => {
    const mockOnOpenChange = jest.fn();
    render(<TestModal open={true} onOpenChange={mockOnOpenChange} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should maintain proper scrolling behavior', () => {
    render(<TestModal open={true} onOpenChange={() => {}} />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('overflow-y-auto');
  });
});

describe('Mobile Form Elements', () => {
  it('should render input with mobile-friendly sizing', () => {
    render(<Input data-testid="mobile-input" />);
    
    const input = screen.getByTestId('mobile-input');
    expect(input).toHaveClass('min-h-[44px]', 'text-base');
  });

  it('should render button with mobile-friendly sizing', () => {
    render(<Button data-testid="mobile-button">Test Button</Button>);
    
    const button = screen.getByTestId('mobile-button');
    expect(button).toHaveClass('min-h-[44px]');
  });

  it('should render select with mobile-friendly sizing', () => {
    render(
      <Select>
        <SelectTrigger data-testid="mobile-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="test">Test</SelectItem>
        </SelectContent>
      </Select>
    );
    
    const select = screen.getByTestId('mobile-select');
    expect(select).toHaveClass('min-h-[44px]', 'text-base');
  });
});