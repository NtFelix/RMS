import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle } from 'lucide-react';

// Mock all dependencies
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({
    openWohnungModal: jest.fn(),
    openHouseModal: jest.fn(),
    openTenantModal: jest.fn(),
    openBetriebskostenModal: jest.fn(),
    getState: () => ({
      openFinanceModal: jest.fn(),
      openAufgabeModal: jest.fn(),
    }),
  }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string) => value,
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null })
        })
      })
    })
  })
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
    headers: { get: () => '0' },
  })
) as jest.Mock;

// Test component for layout structure
describe('Layout Components', () => {
  describe('Card Component', () => {
    it('renders with correct classes and children', () => {
      render(
        <Card data-testid="test-card">
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Test content</p>
          </CardContent>
        </Card>
      );

      const card = screen.getByTestId('test-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('rounded-lg border bg-card');
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders with updated layout classes for new design', () => {
      render(
        <Card data-testid="layout-card" className="overflow-hidden rounded-xl border-none shadow-md">
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <CardTitle>Management Title</CardTitle>
              <Button className="sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p>Content area</p>
          </CardContent>
        </Card>
      );

      const card = screen.getByTestId('layout-card');
      expect(card).toHaveClass('overflow-hidden', 'rounded-xl', 'border-none', 'shadow-md');
      
      // Check header layout
      const headerContainer = card.querySelector('.flex.flex-row.items-center.justify-between');
      expect(headerContainer).toBeInTheDocument();
      
      // Check button positioning
      const button = screen.getByRole('button', { name: /Add Item/i });
      expect(button).toHaveClass('sm:w-auto');
    });
  });

  describe('Button Component', () => {
    it('renders with correct variant and size', () => {
      render(
        <Button 
          variant="default" 
          size="default"
          data-testid="test-button"
        >
          Click me
        </Button>
      );

      const button = screen.getByTestId('test-button');
      expect(button).toHaveClass('bg-primary text-primary-foreground');
      expect(button).toHaveTextContent('Click me');
    });

    it('handles click events', async () => {
      const handleClick = jest.fn();
      render(
        <Button 
          onClick={handleClick}
          data-testid="test-button"
        >
          Click me
        </Button>
      );

      const button = screen.getByTestId('test-button');
      await userEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders add buttons with proper icon and responsive classes', () => {
      render(
        <Button className="sm:w-auto" data-testid="add-button">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Item
        </Button>
      );

      const button = screen.getByTestId('add-button');
      expect(button).toHaveClass('sm:w-auto');
      expect(button).toHaveTextContent('Add New Item');
      
      // Check icon is present
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('mr-2', 'h-4', 'w-4');
    });

    it('handles disabled state correctly', () => {
      render(
        <Button disabled data-testid="disabled-button">
          Disabled Button
        </Button>
      );

      const button = screen.getByTestId('disabled-button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50');
    });
  });

  describe('Dialog Component', () => {
    it('opens and closes correctly', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button data-testid="dialog-trigger">Open Dialog</Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-content">
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
              <DialogDescription>This is a test dialog for layout testing</DialogDescription>
            </DialogHeader>
            <p>Dialog Content</p>
          </DialogContent>
        </Dialog>
      );

      // Dialog should be closed initially
      expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument();

      // Open dialog
      const trigger = screen.getByTestId('dialog-trigger');
      await userEvent.click(trigger);

      // Dialog should be open
      const dialog = await screen.findByTestId('dialog-content');
      expect(dialog).toBeInTheDocument();

      // Close dialog (using escape key)
      await userEvent.keyboard('{Escape}');
      expect(dialog).not.toBeInTheDocument();
    });
  });

  describe('Header-Button Layout Structure', () => {
    it('renders inline header-button layout correctly', () => {
      render(
        <Card>
          <CardHeader>
            <div className="flex flex-row items-center justify-between" data-testid="header-container">
              <CardTitle>Test Management</CardTitle>
              <Button className="sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Test
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p>Content</p>
          </CardContent>
        </Card>
      );

      const headerContainer = screen.getByTestId('header-container');
      expect(headerContainer).toHaveClass('flex', 'flex-row', 'items-center', 'justify-between');
      
      const title = screen.getByText('Test Management');
      const button = screen.getByRole('button', { name: /Add Test/i });
      
      expect(title).toBeInTheDocument();
      expect(button).toBeInTheDocument();
    });

    it('maintains proper spacing in header layout', () => {
      const { container } = render(
        <div className="flex flex-col gap-8 p-8" data-testid="main-container">
          <Card className="overflow-hidden rounded-xl border-none shadow-md">
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <CardTitle>Management Section</CardTitle>
                <Button className="sm:w-auto">Add Item</Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div>Filters</div>
              <div>Table</div>
            </CardContent>
          </Card>
        </div>
      );

      const mainContainer = screen.getByTestId('main-container');
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'gap-8', 'p-8');
      
      const cardContent = container.querySelector('.flex.flex-col.gap-6');
      expect(cardContent).toBeInTheDocument();
    });
  });

  describe('Responsive Layout Classes', () => {
    it('applies correct responsive classes to buttons', () => {
      render(
        <Button className="sm:w-auto w-full" data-testid="responsive-button">
          Responsive Button
        </Button>
      );

      const button = screen.getByTestId('responsive-button');
      expect(button).toHaveClass('sm:w-auto', 'w-full');
    });

    it('applies correct responsive classes to containers', () => {
      render(
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="responsive-grid">
          <div>Item 1</div>
          <div>Item 2</div>
        </div>
      );

      const grid = screen.getByTestId('responsive-grid');
      expect(grid).toHaveClass('grid', 'gap-4', 'md:grid-cols-2', 'lg:grid-cols-4');
    });
  });

  describe('Accessibility', () => {
    it('button has no accessibility violations', async () => {
      const { container } = render(
        <Button>Accessible Button</Button>
      );
      const results = await axe(container);
      (expect(results) as any).toHaveNoViolations();
    });

    it('dialog has no accessibility violations when open', async () => {
      const { container } = render(
        <Dialog open={true}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
              <DialogDescription>This is a test dialog for accessibility testing</DialogDescription>
            </DialogHeader>
            <p>This is a test dialog</p>
          </DialogContent>
        </Dialog>
      );
      const results = await axe(container);
      (expect(results) as any).toHaveNoViolations();
    });

    it('card layout has no accessibility violations', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <CardTitle>Accessible Management</CardTitle>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p>Accessible content</p>
          </CardContent>
        </Card>
      );
      const results = await axe(container);
      (expect(results) as any).toHaveNoViolations();
    });
  });

  describe('Component Integration', () => {
    it('integrates all layout components correctly', () => {
      render(
        <div className="flex flex-col gap-8 p-8">
          <Card className="overflow-hidden rounded-xl border-none shadow-md">
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <CardTitle>Integrated Layout Test</CardTitle>
                <Button className="sm:w-auto">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div>Filter Component</div>
              <div role="table">Table Component</div>
            </CardContent>
          </Card>
        </div>
      );

      // Check all components are rendered
      expect(screen.getByText('Integrated Layout Test')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add New/i })).toBeInTheDocument();
      expect(screen.getByText('Filter Component')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});
