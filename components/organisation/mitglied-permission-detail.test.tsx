import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MitgliedPermissionDetail } from './mitglied-permission-detail';

jest.mock('@/lib/perms-actions', () => ({
  getMitgliedPermissionsAction: jest.fn().mockResolvedValue({ module: {}, objekte: { haeuser: null } }),
  getOrgHaeuserAction: jest.fn().mockResolvedValue([]),
  setMitgliedOverridesAction: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/organisation/policy-actions', () => ({
  getPoliciesAction: jest.fn().mockResolvedValue([]),
  getMitgliedPoliciesAction: jest.fn().mockResolvedValue([]),
  updateMitgliedPoliciesAction: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

describe('MitgliedPermissionDetail', () => {
  const defaultProps = {
    mitgliedId: 'member-1',
    rolle: 'admin' as const,
    status: 'aktiv' as const,
    memberName: 'Max Mustermann',
    email: 'max@example.com',
    hasVerwaltenPermission: true,
    currentUserId: 'user-self',
    selectedMemberUserId: 'user-other',
    onRoleChange: jest.fn(),
    onStatusChange: jest.fn(),
    onRemove: jest.fn(),
    isPending: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Admin-Mitglied (Gefahrenbereich)', () => {
    it('zeigt bei einem Administrator den Sperr-Hinweis und den Gefahrenbereich an', () => {
      render(<MitgliedPermissionDetail {...defaultProps} />);

      expect(screen.getByText('Rollenbasierter Vollzugriff')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Berechtigungen können nicht eingeschränkt werden. Um den Zugriff zu entziehen, stufe die Rolle herab oder deaktiviere das Mitglied.'
        )
      ).toBeInTheDocument();

      expect(screen.getByText('Gefahrenbereich')).toBeInTheDocument();
      expect(screen.getByText('Mitgliedsrolle')).toBeInTheDocument();
      expect(screen.getByText('Kontostatus')).toBeInTheDocument();
      expect(screen.getByText('Mitglied entfernen')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mitglied löschen' })).toBeInTheDocument();
    });

    it('ruft onRemove auf, wenn "Mitglied löschen" geklickt wird', () => {
      render(<MitgliedPermissionDetail {...defaultProps} />);

      const deleteBtn = screen.getByRole('button', { name: 'Mitglied löschen' });
      fireEvent.click(deleteBtn);

      expect(defaultProps.onRemove).toHaveBeenCalledWith('member-1', 'Max Mustermann');
    });

    it('zeigt den Gefahrenbereich bei Inhabern (Owner) NICHT an', () => {
      render(
        <MitgliedPermissionDetail
          {...defaultProps}
          rolle="owner"
        />
      );

      expect(screen.getByText('Rollenbasierter Vollzugriff')).toBeInTheDocument();
      expect(
        screen.getByText('Inhaber haben stets vollen Zugriff und können nicht eingeschränkt werden.')
      ).toBeInTheDocument();
      expect(screen.queryByText('Gefahrenbereich')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Mitglied löschen' })).not.toBeInTheDocument();
    });

    it('zeigt den Gefahrenbereich für den eigenen Account NICHT an', () => {
      render(
        <MitgliedPermissionDetail
          {...defaultProps}
          selectedMemberUserId="user-self"
          currentUserId="user-self"
        />
      );

      expect(screen.getByText('Rollenbasierter Vollzugriff')).toBeInTheDocument();
      expect(screen.queryByText('Gefahrenbereich')).not.toBeInTheDocument();
    });

    it('zeigt den Gefahrenbereich ohne hasVerwaltenPermission NICHT an', () => {
      render(
        <MitgliedPermissionDetail
          {...defaultProps}
          hasVerwaltenPermission={false}
        />
      );

      expect(screen.getByText('Rollenbasierter Vollzugriff')).toBeInTheDocument();
      expect(screen.queryByText('Gefahrenbereich')).not.toBeInTheDocument();
    });
  });
});
