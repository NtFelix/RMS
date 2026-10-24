import React from 'react';
import { render, screen } from '@testing-library/react';
import AgentenLoading from './agenten/loading';
import EinstellungenLoading from './einstellungen/loading';
import SucheLoading from './suche/loading';

// Routes whose page awaits request data before rendering must not fall back to the dashboard home skeleton
// ((dashboard)/loading.tsx), so each of them has a loading state that mirrors its own layout.
describe('route loading states', () => {
  it.each([
    ['suche', SucheLoading],
    ['agenten', AgentenLoading],
  ])('%s announces itself as a busy status', (_name, Loading) => {
    render(<Loading />);

    expect(screen.getByRole('status', { name: 'Wird geladen' })).toHaveAttribute('aria-busy', 'true');
  });

  it('einstellungen renders the settings section skeleton, not the dashboard home grid', () => {
    const { container } = render(<EinstellungenLoading />);

    expect(container.firstElementChild).toHaveClass('space-y-6');
    expect(container.querySelector('.md\\:auto-rows-\\[140px\\]')).not.toBeInTheDocument();
  });
});
