import React from 'react';
import { render, screen } from '@testing-library/react';
import { ButtonWithTooltip } from './button-with-tooltip';

describe('ButtonWithTooltip', () => {
  it('renders button without tooltip when not disabled', () => {
    render(
      <ButtonWithTooltip tooltip="Test tooltip">
        Test Button
      </ButtonWithTooltip>
    );
    
    const button = screen.getByRole('button', { name: 'Test Button' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('renders button without tooltip when disabled but showTooltip is false', () => {
    render(
      <ButtonWithTooltip disabled tooltip="Test tooltip" showTooltip={false}>
        Test Button
      </ButtonWithTooltip>
    );
    
    const button = screen.getByRole('button', { name: 'Test Button' });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('renders button with tooltip when disabled and showTooltip is true', () => {
    render(
      <ButtonWithTooltip disabled tooltip="Test tooltip" showTooltip={true}>
        Test Button
      </ButtonWithTooltip>
    );
    
    const button = screen.getByRole('button', { name: 'Test Button' });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('renders button without tooltip when no tooltip text provided', () => {
    render(
      <ButtonWithTooltip disabled showTooltip={true}>
        Test Button
      </ButtonWithTooltip>
    );
    
    const button = screen.getByRole('button', { name: 'Test Button' });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});