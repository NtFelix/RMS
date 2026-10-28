import React from 'react';
import { render, screen } from '@testing-library/react';
import { User } from 'lucide-react';
import { SettingsSidebar } from './sidebar';
import { SettingsLayoutSkeleton } from './settings-layout-skeleton';
import { SETTINGS_CONTENT_CLASS, SETTINGS_LAYOUT_CLASS, SETTINGS_SIDEBAR_CLASS } from './settings-layout-classes';

jest.mock('next/navigation', () => ({
  usePathname: () => '/einstellungen/profil',
}));

// The skeleton is the Suspense fallback of the settings layout: it must keep the geometry of the loaded layout.
describe('SettingsLayoutSkeleton', () => {
  it('is announced as a busy status', () => {
    render(<SettingsLayoutSkeleton />);

    const status = screen.getByRole('status', { name: 'Wird geladen' });
    expect(status).toHaveAttribute('aria-busy', 'true');
  });

  it('uses the same container classes as the loaded layout', () => {
    const { container } = render(<SettingsLayoutSkeleton />);

    expect(container.firstElementChild).toHaveClass(...SETTINGS_LAYOUT_CLASS.split(' '));
    expect(container.querySelector(`.${CSS.escape('w-56')}`)).toHaveClass(...SETTINGS_SIDEBAR_CLASS.split(' '));
    expect(container.lastElementChild?.lastElementChild).toHaveClass(...SETTINGS_CONTENT_CLASS.split(' '));
  });

  it('renders the sidebar with the same classes as the real SettingsSidebar', () => {
    const { container } = render(
      <SettingsSidebar tabs={[{ value: 'profil', label: 'Profil', icon: User, group: 'Konto' }]} />,
    );

    expect(container.querySelector('nav')).toHaveClass(...SETTINGS_SIDEBAR_CLASS.split(' '));
  });

  it('shows the seven tabs that are always visible, without data-dependent ones', () => {
    const { container } = render(<SettingsLayoutSkeleton />);
    const sidebar = container.querySelector(`.${CSS.escape('w-56')}`) as HTMLElement;

    // search field + group label + seven tab placeholders
    expect(sidebar.querySelectorAll('.h-9')).toHaveLength(1 + 7);
  });
});
