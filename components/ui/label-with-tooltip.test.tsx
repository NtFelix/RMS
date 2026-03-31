import React from 'react';
import { render, screen } from '@testing-library/react';
import { LabelWithTooltip } from './label-with-tooltip';

describe('LabelWithTooltip', () => {
  it('renders label with correct text and htmlFor attribute', () => {
    render(
      <LabelWithTooltip htmlFor="test-input" infoText="Test tooltip">
        Test Label
      </LabelWithTooltip>
    );
    
    const label = screen.getByText('Test Label');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', 'test-input');
  });

  it('renders info tooltip with correct info text', () => {
    render(
      <LabelWithTooltip htmlFor="test-input" infoText="Test tooltip">
        Test Label
      </LabelWithTooltip>
    );
    
    // InfoTooltip renders an Info icon (SVG)
    const infoIcon = document.querySelector('.lucide-info');
    expect(infoIcon).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    render(
      <LabelWithTooltip 
        htmlFor="test-input" 
        infoText="Test tooltip" 
        className="custom-class"
      >
        Test Label
      </LabelWithTooltip>
    );
    
    const container = screen.getByText('Test Label').parentElement;
    expect(container).toHaveClass('flex', 'items-center', 'custom-class');
  });

  it('renders without custom className', () => {
    render(
      <LabelWithTooltip htmlFor="test-input" infoText="Test tooltip">
        Test Label
      </LabelWithTooltip>
    );
    
    const container = screen.getByText('Test Label').parentElement;
    expect(container).toHaveClass('flex', 'items-center');
    expect(container).not.toHaveClass('custom-class');
  });
});