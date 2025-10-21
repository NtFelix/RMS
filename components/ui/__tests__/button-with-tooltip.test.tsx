import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ButtonWithTooltip } from '../button-with-tooltip';

describe('ButtonWithTooltip', () => {
  it('renders button without tooltip when not disabled', () => {
    render(
      <ButtonWithTooltip tooltip="Test tooltip">
        Test Button
      </ButtonWithTooltip>
    );
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.queryByText('Test tooltip')).not.toBeInTheDocument();
  });

  it('renders button without tooltip when disabled but showTooltip is false', () => {
    render(
      <ButtonWithTooltip disabled tooltip="Test tooltip" showTooltip={false}>
        Test Button
      </ButtonWithTooltip>
    );
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.queryByText('Test tooltip')).not.toBeInTheDocument();
  });

  it('renders button with tooltip when disabled and showTooltip is true', async () => {
    const user = userEvent.setup();
    
    render(
      <ButtonWithTooltip disabled tooltip="Test tooltip" showTooltip={true}>
        Test Button
      </ButtonWithTooltip>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    // Hover over the button to trigger tooltip
    await user.hover(button);
    
    // Wait for tooltip to appear (using getAllByText since Radix renders multiple instances)
    await waitFor(() => {
      expect(screen.getAllByText('Test tooltip')).toHaveLength(2);
    });
  });

  it('renders button without tooltip when no tooltip text provided', () => {
    render(
      <ButtonWithTooltip disabled showTooltip={true}>
        Test Button
      </ButtonWithTooltip>
    );
    
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip with apartment limit message', async () => {
    const user = userEvent.setup();
    const limitMessage = "Sie haben die maximale Anzahl an Wohnungen (5) für Ihr aktuelles Abonnement erreicht.";
    
    render(
      <ButtonWithTooltip 
        disabled 
        tooltip={limitMessage} 
        showTooltip={true}
      >
        Wohnung hinzufügen
      </ButtonWithTooltip>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    // Hover over the button
    await user.hover(button);
    
    // Wait for tooltip with limit message to appear (using getAllByText since Radix renders multiple instances)
    await waitFor(() => {
      expect(screen.getAllByText(limitMessage)).toHaveLength(2);
    });
  });

  it('shows tooltip with trial limit message', async () => {
    const user = userEvent.setup();
    const trialMessage = "Maximale Anzahl an Wohnungen (3) für Ihre Testphase erreicht.";
    
    render(
      <ButtonWithTooltip 
        disabled 
        tooltip={trialMessage} 
        showTooltip={true}
      >
        Wohnung hinzufügen
      </ButtonWithTooltip>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    // Hover over the button
    await user.hover(button);
    
    // Wait for tooltip with trial message to appear (using getAllByText since Radix renders multiple instances)
    await waitFor(() => {
      expect(screen.getAllByText(trialMessage)).toHaveLength(2);
    });
  });

  it('does not show tooltip when button is enabled', async () => {
    const user = userEvent.setup();
    
    render(
      <ButtonWithTooltip 
        disabled={false}
        tooltip="This should not show" 
        showTooltip={false}
      >
        Wohnung hinzufügen
      </ButtonWithTooltip>
    );
    
    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
    
    // Hover over the button
    await user.hover(button);
    
    // Tooltip should not appear
    await waitFor(() => {
      expect(screen.queryByText('This should not show')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });
});