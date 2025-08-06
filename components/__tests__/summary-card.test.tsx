import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SummaryCard, SummaryCardSkeleton } from '../summary-card';
import { Home, Users, Euro, SquareIcon } from 'lucide-react';

// Mock the format utility
jest.mock('@/utils/format', () => ({
  formatNumber: (value: number) => value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  formatCurrency: (value: number) => `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
}));

describe('SummaryCard', () => {
  const defaultProps = {
    title: 'Total Rent',
    value: 2500,
    icon: <Euro className="h-4 w-4" />,
  };

  it('renders basic card with title, value, and icon', () => {
    render(<SummaryCard {...defaultProps} />);
    
    expect(screen.getByText('Total Rent')).toBeInTheDocument();
    expect(screen.getByText('2.500,00 €')).toBeInTheDocument();
  });

  it('renders with custom value formatter', () => {
    render(
      <SummaryCard 
        {...defaultProps} 
        value="5 Apartments"
        valueFormatter={(val) => val.toString()}
      />
    );
    
    expect(screen.getByText('5 Apartments')).toBeInTheDocument();
  });

  it('shows hover details when hoverDetails prop is provided', async () => {
    const user = userEvent.setup();
    const hoverDetails = {
      average: 625,
      median: 600,
      breakdown: [
        { label: 'Apartment 1', value: 500 },
        { label: 'Apartment 2', value: 750 },
      ],
    };

    render(<SummaryCard {...defaultProps} hoverDetails={hoverDetails} />);
    
    expect(screen.getByText('Hover für Details')).toBeInTheDocument();
    
    // Hover over the card
    const card = screen.getByText('Total Rent').closest('[role="button"]');
    if (card) {
      await user.hover(card);
      
      await waitFor(() => {
        expect(screen.getByText('Total Rent - Details')).toBeInTheDocument();
        expect(screen.getByText('Durchschnitt:')).toBeInTheDocument();
        expect(screen.getByText('625,00 €')).toBeInTheDocument();
        expect(screen.getByText('Median:')).toBeInTheDocument();
        expect(screen.getByText('600,00 €')).toBeInTheDocument();
        expect(screen.getByText('Apartment 1:')).toBeInTheDocument();
        expect(screen.getByText('500,00 €')).toBeInTheDocument();
      });
    }
  });

  it('calls onClick handler when card is clicked', async () => {
    const user = userEvent.setup();
    const onClickMock = jest.fn();
    
    render(<SummaryCard {...defaultProps} onClick={onClickMock} />);
    
    // Find the card container with the onClick handler
    const card = screen.getByText('Total Rent').closest('[class*="cursor-pointer"]');
    if (card) {
      await user.click(card);
      expect(onClickMock).toHaveBeenCalledTimes(1);
    }
  });

  it('applies cursor-pointer class when onClick is provided', () => {
    const onClickMock = jest.fn();
    render(<SummaryCard {...defaultProps} onClick={onClickMock} />);
    
    // Find the card container (the one with the onClick handler)
    const card = screen.getByText('Total Rent').closest('[class*="cursor-pointer"]');
    expect(card).toHaveClass('cursor-pointer');
  });

  it('does not apply cursor-pointer class when onClick is not provided', () => {
    render(<SummaryCard {...defaultProps} />);
    
    // Find the card container
    const card = screen.getByText('Total Rent').closest('[class*="rounded-xl"]');
    expect(card).not.toHaveClass('cursor-pointer');
  });

  it('applies custom className', () => {
    render(<SummaryCard {...defaultProps} className="custom-class" />);
    
    // Find the card container
    const card = screen.getByText('Total Rent').closest('[class*="custom-class"]');
    expect(card).toHaveClass('custom-class');
  });

  it('renders loading skeleton when isLoading is true', () => {
    render(<SummaryCard {...defaultProps} isLoading={true} />);
    
    // Should not render the actual content
    expect(screen.queryByText('Total Rent')).not.toBeInTheDocument();
    expect(screen.queryByText('2.500,00 €')).not.toBeInTheDocument();
    
    // Should render skeleton elements
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows only average in hover details when only average is provided', async () => {
    const user = userEvent.setup();
    const hoverDetails = {
      average: 625,
    };

    render(<SummaryCard {...defaultProps} hoverDetails={hoverDetails} />);
    
    const card = screen.getByText('Total Rent').closest('[role="button"]');
    if (card) {
      await user.hover(card);
      
      await waitFor(() => {
        expect(screen.getByText('Durchschnitt:')).toBeInTheDocument();
        expect(screen.getByText('625,00 €')).toBeInTheDocument();
        expect(screen.queryByText('Median:')).not.toBeInTheDocument();
        expect(screen.queryByText('Aufschlüsselung:')).not.toBeInTheDocument();
      });
    }
  });

  it('shows breakdown section when breakdown is provided', async () => {
    const user = userEvent.setup();
    const hoverDetails = {
      breakdown: [
        { label: 'Category A', value: 1000 },
        { label: 'Category B', value: 1500 },
      ],
    };

    render(<SummaryCard {...defaultProps} hoverDetails={hoverDetails} />);
    
    const card = screen.getByText('Total Rent').closest('[role="button"]');
    if (card) {
      await user.hover(card);
      
      await waitFor(() => {
        expect(screen.getByText('Aufschlüsselung:')).toBeInTheDocument();
        expect(screen.getByText('Category A:')).toBeInTheDocument();
        expect(screen.getByText('1.000,00 €')).toBeInTheDocument();
        expect(screen.getByText('Category B:')).toBeInTheDocument();
        expect(screen.getByText('1.500,00 €')).toBeInTheDocument();
      });
    }
  });
});

describe('SummaryCardSkeleton', () => {
  it('renders skeleton loading state', () => {
    render(<SummaryCardSkeleton />);
    
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(4); // Title, icon, value, and description skeletons
  });

  it('applies custom className to skeleton', () => {
    render(<SummaryCardSkeleton className="custom-skeleton-class" />);
    
    const card = document.querySelector('.custom-skeleton-class');
    expect(card).toBeInTheDocument();
  });
});