import { render, screen } from '@testing-library/react';
import { SummaryCards } from '../summary-cards';

// Mock the useIsMobile hook
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(),
}));

const { useIsMobile } = require('@/hooks/use-mobile');

describe('SummaryCards', () => {
  const defaultProps = {
    totalArea: 1500,
    apartmentCount: 10,
    tenantCount: 8,
    totalCosts: 25000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all summary cards with correct data', () => {
    useIsMobile.mockReturnValue(false);
    
    render(<SummaryCards {...defaultProps} />);
    
    expect(screen.getByText('Gesamtfläche')).toBeInTheDocument();
    expect(screen.getByText('1.500 m²')).toBeInTheDocument();
    
    expect(screen.getByText('Wohnungen')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    
    expect(screen.getByText('Mieter')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    
    expect(screen.getByText('Gesamtkosten')).toBeInTheDocument();
    expect(screen.getByText('25.000,00 €')).toBeInTheDocument();
  });

  it('applies desktop grid layout when not on mobile', () => {
    useIsMobile.mockReturnValue(false);
    
    const { container } = render(<SummaryCards {...defaultProps} />);
    
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveClass('md:grid-cols-2');
    expect(gridContainer).toHaveClass('lg:grid-cols-4');
    expect(gridContainer).not.toHaveClass('grid-cols-1');
  });

  it('applies mobile single column layout when on mobile', () => {
    useIsMobile.mockReturnValue(true);
    
    const { container } = render(<SummaryCards {...defaultProps} />);
    
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveClass('grid-cols-1');
    expect(gridContainer).not.toHaveClass('md:grid-cols-2');
    expect(gridContainer).not.toHaveClass('lg:grid-cols-4');
  });

  it('applies minimum height to cards on mobile for touch targets', () => {
    useIsMobile.mockReturnValue(true);
    
    const { container } = render(<SummaryCards {...defaultProps} />);
    
    const cards = container.querySelectorAll('[class*="min-h-"]');
    expect(cards.length).toBe(4); // All 4 cards should have min-height
    cards.forEach(card => {
      expect(card).toHaveClass('min-h-[88px]');
    });
  });

  it('does not apply minimum height to cards on desktop', () => {
    useIsMobile.mockReturnValue(false);
    
    const { container } = render(<SummaryCards {...defaultProps} />);
    
    const cards = container.querySelectorAll('[class*="min-h-"]');
    expect(cards.length).toBe(0); // No cards should have min-height on desktop
  });

  it('formats numbers correctly using German locale', () => {
    useIsMobile.mockReturnValue(false);
    
    render(<SummaryCards totalArea={1234567} apartmentCount={123} tenantCount={456} totalCosts={1234567.89} />);
    
    expect(screen.getByText('1.234.567 m²')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
    expect(screen.getByText('456')).toBeInTheDocument();
    expect(screen.getByText('1.234.567,89 €')).toBeInTheDocument();
  });
});