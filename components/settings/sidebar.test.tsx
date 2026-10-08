import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsSidebar } from './sidebar';
import { User, Key, Bot } from 'lucide-react';

jest.mock('next/navigation', () => ({
  usePathname: () => '/einstellungen/mcp',
}));

describe('SettingsSidebar', () => {
  const mockTabs = [
    { value: 'profil', label: 'Profil', icon: User, group: 'Konto' },
    { value: 'api-keys', label: 'API-Keys', icon: Key, group: 'Organisation' },
    { value: 'mcp', label: 'MCP-Server', icon: Bot, group: 'Organisation' },
  ];

  it('renders grouped headers and active tab styling', () => {
    render(<SettingsSidebar tabs={mockTabs} />);

    expect(screen.getByText('Konto')).toBeInTheDocument();
    expect(screen.getByText('Organisation')).toBeInTheDocument();
    expect(screen.getByText('Profil')).toBeInTheDocument();
    expect(screen.getByText('API-Keys')).toBeInTheDocument();
    expect(screen.getByText('MCP-Server')).toBeInTheDocument();
  });

  it('filters tabs based on search input', () => {
    render(<SettingsSidebar tabs={mockTabs} />);

    const searchInput = screen.getByPlaceholderText('Suchen...');
    fireEvent.change(searchInput, { target: { value: 'mcp' } });

    expect(screen.getByText('MCP-Server')).toBeInTheDocument();
    expect(screen.queryByText('Profil')).not.toBeInTheDocument();
    expect(screen.queryByText('Konto')).not.toBeInTheDocument();
    expect(screen.getByText('Organisation')).toBeInTheDocument();
  });

  it('shows no results message when search query does not match', () => {
    render(<SettingsSidebar tabs={mockTabs} />);

    const searchInput = screen.getByPlaceholderText('Suchen...');
    fireEvent.change(searchInput, { target: { value: 'xyz_unknown' } });

    expect(screen.getByText('Keine Ergebnisse')).toBeInTheDocument();
  });

  it('renders only Konto group when Organisation tabs are not present', () => {
    const kontoOnlyTabs = [
      { value: 'profil', label: 'Profil', icon: User, group: 'Konto' },
    ];
    render(<SettingsSidebar tabs={kontoOnlyTabs} />);

    expect(screen.getByText('Konto')).toBeInTheDocument();
    expect(screen.queryByText('Organisation')).not.toBeInTheDocument();
    expect(screen.queryByText('MCP-Server')).not.toBeInTheDocument();
    expect(screen.queryByText('API-Keys')).not.toBeInTheDocument();
  });
});
