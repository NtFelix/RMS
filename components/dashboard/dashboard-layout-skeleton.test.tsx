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

  it('renders one placeholder per navigation entry of the default shell', () => {
    const { container } = render(<DashboardLayoutSkeleton />);
    const sidebar = container.firstElementChild?.children[0] as HTMLElement;

    expect(sidebar.querySelectorAll('.h-10.rounded-xl')).toHaveLength(9);
  });
});
