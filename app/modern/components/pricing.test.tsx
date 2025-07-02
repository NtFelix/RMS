"use client";

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Pricing from './pricing'; // Adjust path as needed

describe('Pricing Component', () => {
  const mockOnSelectPlan = jest.fn();

  beforeEach(() => {
    // Reset the mock before each test
    mockOnSelectPlan.mockClear();
  });

  it('renders the pricing component with default monthly view', () => {
    render(<Pricing onSelectPlan={mockOnSelectPlan} />);

    expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toHaveClass('bg-primary'); // Check active toggle

    // Check for one of the plan names
    expect(screen.getByText('Starter')).toBeInTheDocument();
    // Check for a monthly price (e.g., for Starter plan)
    expect(screen.getByText('$9')).toBeInTheDocument();
    expect(screen.getAllByText('/month').length).toBeGreaterThan(0);
  });

  it('switches to yearly view and displays yearly prices', () => {
    render(<Pricing onSelectPlan={mockOnSelectPlan} />);

    const yearlyButton = screen.getByText('Yearly (Save 20%)');
    fireEvent.click(yearlyButton);

    expect(yearlyButton).toHaveClass('bg-primary'); // Check active toggle
    // Check for a yearly price (e.g., for Starter plan: $90)
    expect(screen.getByText('$90')).toBeInTheDocument();
    expect(screen.getAllByText('/year').length).toBeGreaterThan(0);
  });

  it('calls onSelectPlan with the correct monthlyPriceId when a plan is selected (monthly view)', () => {
    render(<Pricing onSelectPlan={mockOnSelectPlan} />);

    // Get all "Get Started" buttons and click the first one (Starter plan)
    const getStartedButtons = screen.getAllByText('Get Started');
    fireEvent.click(getStartedButtons[0]);

    expect(mockOnSelectPlan).toHaveBeenCalledTimes(1);
    expect(mockOnSelectPlan).toHaveBeenCalledWith('price_starter_monthly');
  });

  it('calls onSelectPlan with the correct yearlyPriceId when a plan is selected (yearly view)', () => {
    render(<Pricing onSelectPlan={mockOnSelectPlan} />);

    const yearlyButton = screen.getByText('Yearly (Save 20%)');
    fireEvent.click(yearlyButton);

    // Get all "Get Started" buttons and click the second one (Professional plan)
    const getStartedButtons = screen.getAllByText('Get Started');
    fireEvent.click(getStartedButtons[1]); // Index 1 for Professional

    expect(mockOnSelectPlan).toHaveBeenCalledTimes(1);
    expect(mockOnSelectPlan).toHaveBeenCalledWith('price_professional_yearly');
  });

  it('displays "Most Popular" badge for the popular plan', () => {
    render(<Pricing onSelectPlan={mockOnSelectPlan} />);
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
    // Check it's associated with the "Professional" plan card
    const professionalCard = screen.getByText('Professional').closest('div[class*="card"]'); // Find card parent
    expect(professionalCard).toHaveTextContent('Most Popular');
  });
});
