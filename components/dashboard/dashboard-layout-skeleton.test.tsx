import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardLayoutSkeleton } from './dashboard-layout-skeleton';
import {
  DASHBOARD_CARD_CLASS,
  DASHBOARD_MAIN_CLASS,
  DASHBOARD_ROOT_CLASS,
  DASHBOARD_SIDEBAR_CLASS,
} from './dashboard-layout-classes';

// The skeleton is the Suspense fallback of the dashboard layout and the hydration fallback of DashboardLayout:
// it must keep the geometry of the loaded shell, which it does by sharing the class strings with it.
describe('DashboardLayoutSkeleton', () => {
  it('is announced as a busy status', () => {
    render(<DashboardLayoutSkeleton />);

    expect(screen.getByRole('status', { name: 'Wird geladen' })).toHaveAttribute('aria-busy', 'true');
  });

  it('uses the class strings of the loaded shell for root, sidebar, main area and content card', () => {
    const { container } = render(<DashboardLayoutSkeleton />);
    const root = container.firstElementChild as HTMLElement;

    expect(root).toHaveClass(...DASHBOARD_ROOT_CLASS.split(' '));
    expect(root.children[0]).toHaveClass(...DASHBOARD_SIDEBAR_CLASS.split(' '));
    expect(root.querySelector('main')).toHaveClass(...DASHBOARD_MAIN_CLASS.split(' '));
    expect(root.querySelector('main')?.firstElementChild).toHaveClass(...DASHBOARD_CARD_CLASS.split(' '));
  });

  it('switches desktop and mobile navigation with CSS only, so the prerendered HTML needs no JavaScript', () => {
    const { container } = render(<DashboardLayoutSkeleton />);

    expect(container.querySelector('.desktop-sidebar-responsive')).toBeInTheDocument();
    expect(container.querySelector('nav.mobile-nav-responsive')).toBeInTheDocument();
  });

  it('shows the real entries of the default shell, without the feature-flagged ones', () => {
    render(<DashboardLayoutSkeleton />);

    ['Dashboard', 'Suche', 'Organisationen', 'Häuser', 'Wohnungen', 'Mieter', 'Finanzen', 'Betriebskosten', 'Aufgaben'].forEach(
      (title) => expect(screen.getByText(title)).toBeInTheDocument(),
    );
    ['Dokumente', 'E-Mails', 'KI-Agenten'].forEach((title) => expect(screen.queryByText(title)).not.toBeInTheDocument());
  });

  it('collapses to icons at the tablet breakpoint with CSS only', () => {
    const { container } = render(<DashboardLayoutSkeleton />);
    const sidebar = container.firstElementChild?.children[0] as HTMLElement;

    expect(sidebar).toHaveClass('w-64', 'max-lg:w-[4.5rem]');
    expect(screen.getByText('Mieter')).toHaveClass('max-lg:hidden');
  });
});
