import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardLayoutSkeleton } from './dashboard-layout-skeleton';
import {
  DASHBOARD_CONTAINER_CLASS,
  DASHBOARD_FRAME_CLASS,
  DASHBOARD_MAIN_CLASS,
  DASHBOARD_RAIL_CLASS,
  DASHBOARD_ROOT_CLASS,
} from './dashboard-layout-classes';

// The skeleton is the Suspense fallback of the dashboard layout and the hydration fallback of DashboardLayout:
// it must keep the geometry of the loaded shell, which it does by sharing the class strings with it.
describe('DashboardLayoutSkeleton', () => {
  it('is announced as a busy status', () => {
    render(<DashboardLayoutSkeleton />);

    expect(screen.getByRole('status', { name: 'Wird geladen' })).toHaveAttribute('aria-busy', 'true');
  });

  it('uses the class strings of the loaded shell for root, icon rail, frame, container and main area', () => {
    const { container } = render(<DashboardLayoutSkeleton />);
    const root = container.firstElementChild as HTMLElement;

    expect(root).toHaveClass(...DASHBOARD_ROOT_CLASS.split(' '));
    expect(root.children[0]).toHaveClass(...DASHBOARD_RAIL_CLASS.split(' '));
    expect(root.children[1]).toHaveClass(...DASHBOARD_FRAME_CLASS.split(' '));
    expect(root.children[1].firstElementChild).toHaveClass(...DASHBOARD_CONTAINER_CLASS.split(' '));
    expect(root.querySelector('main')).toHaveClass(...DASHBOARD_MAIN_CLASS.split(' '));
  });

  it('keeps the icon rail on every viewport (no bottom navigation placeholder, no responsive switching)', () => {
    const { container } = render(<DashboardLayoutSkeleton />);

    expect(container.querySelector('nav')).not.toBeInTheDocument();
    expect(container.querySelector('.desktop-sidebar-responsive, .mobile-nav-responsive')).not.toBeInTheDocument();
    expect(container.querySelector('aside')).not.toHaveClass('hidden');
  });

  it('shows the real entries of the default shell as icons, without the feature-flagged ones', () => {
    render(<DashboardLayoutSkeleton />);

    ['Dashboard', 'Suche', 'Organisationen', 'Häuser', 'Wohnungen', 'Mieter', 'Finanzen', 'Betriebskosten', 'Aufgaben'].forEach(
      (title) => expect(screen.getByText(title)).toBeInTheDocument(),
    );
    ['Dokumente', 'E-Mails', 'KI-Agenten', 'Kontakte'].forEach((title) => expect(screen.queryByText(title)).not.toBeInTheDocument());
  });

  it('shows the navigation as one labelled list without group separators', () => {
    const { container } = render(<DashboardLayoutSkeleton />);

    expect(container.querySelectorAll('aside .h-px')).toHaveLength(0);
    expect(container.querySelector('aside')).toHaveTextContent('Betriebskosten');
  });
});
