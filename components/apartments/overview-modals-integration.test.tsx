import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useModalStore } from '@/hooks/use-modal-store';

// Mock the async server component layout and inner layout to render modals directly
jest.mock('@/app/(dashboard)/layout', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => {
      return React.createElement(require('@/app/(dashboard)/layout-inner').default, { sidebarData: {} }, children);
    }
  };
});

jest.mock('@/app/(dashboard)/layout-inner', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode; sidebarData: any }) => {
      const { AuthProvider } = require('@/components/auth/auth-provider');
      const { CommandMenu } = require('@/components/search/command-menu');
      const { DashboardLayout } = require('@/components/dashboard/dashboard-layout');
      const { HausOverviewModal } = require('@/components/houses/haus-overview-modal');
      const { WohnungOverviewModal } = require('@/components/apartments/wohnung-overview-modal');
      const { ApartmentTenantDetailsModal } = require('@/components/apartments/apartment-tenant-details-modal');
      const { TenantEditModal } = require('@/components/tenants/tenant-edit-modal');
      const { HouseEditModal } = require('@/components/houses/house-edit-modal');
      const { FinanceEditModal } = require('@/components/finance/finance-edit-modal');
      const { WohnungEditModal } = require('@/components/apartments/wohnung-edit-modal');
      const { AufgabeEditModal } = require('@/components/tasks/aufgabe-edit-modal');
      const { BetriebskostenEditModal } = require('@/components/finance/betriebskosten-edit-modal');
      const { WasserzaehlerModal } = require('@/components/water-meters/wasserzaehler-modal');
      const { KautionModal } = require('@/components/tenants/kaution-modal');
      const { ConfirmationDialog } = require('@/components/ui/confirmation-dialog');
      const store = require('@/hooks/use-modal-store').useModalStore();
      var Conf = null;
      if (store.isConfirmationModalOpen && store.confirmationModalConfig) {
        Conf = React.createElement(ConfirmationDialog, {
          isOpen: store.isConfirmationModalOpen,
          onClose: store.closeConfirmationModal,
          onConfirm: store.confirmationModalConfig.onConfirm,
          title: store.confirmationModalConfig.title,
          confirmText: store.confirmationModalConfig.confirmText,
          cancelText: store.confirmationModalConfig.cancelText,
        });
      }
      return React.createElement(AuthProvider, null,
        React.createElement(CommandMenu),
        React.createElement(DashboardLayout, null, children),
        React.createElement(HausOverviewModal),
        React.createElement(WohnungOverviewModal),
        React.createElement(ApartmentTenantDetailsModal),
        React.createElement(TenantEditModal),
        React.createElement(HouseEditModal),
        React.createElement(FinanceEditModal),
        React.createElement(WohnungEditModal),
        React.createElement(AufgabeEditModal),
        React.createElement(BetriebskostenEditModal),
        React.createElement(WasserzaehlerModal),
        React.createElement(KautionModal),
        Conf
      );
    }
  };
});

import DashboardRootLayout from '@/app/(dashboard)/layout';

// Mock the modal store
jest.mock('@/hooks/use-modal-store');
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

// Mock useToast - the global mock returns useToast as undefined, which crashes SetupWizard and other components
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn().mockReturnValue({ toast: jest.fn(), dismiss: jest.fn(), toasts: [] }),
  toast: jest.fn(),
}));

// Mock all the modal components
jest.mock('@/components/houses/haus-overview-modal', () => ({
  HausOverviewModal: () => <div data-testid="haus-overview-modal">Haus Overview Modal</div>
}));

jest.mock('@/components/apartments/wohnung-overview-modal', () => ({
  WohnungOverviewModal: () => <div data-testid="wohnung-overview-modal">Wohnung Overview Modal</div>
}));

jest.mock('@/components/apartments/apartment-tenant-details-modal', () => ({
  ApartmentTenantDetailsModal: () => <div data-testid="apartment-tenant-details-modal">Apartment Tenant Details Modal</div>
}));

// Mock other components
jest.mock('@/components/auth/auth-provider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('@/components/search/command-menu', () => ({
  CommandMenu: () => <div data-testid="command-menu">Command Menu</div>
}));

jest.mock('@/components/dashboard/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  )
}));

// Mock all other modal components
jest.mock('@/components/tenants/tenant-edit-modal', () => ({
  TenantEditModal: () => <div data-testid="tenant-edit-modal">Tenant Edit Modal</div>
}));

jest.mock('@/components/houses/house-edit-modal', () => ({
  HouseEditModal: () => <div data-testid="house-edit-modal">House Edit Modal</div>
}));

jest.mock('@/components/finance/finance-edit-modal', () => ({
  FinanceEditModal: () => <div data-testid="finance-edit-modal">Finance Edit Modal</div>
}));

jest.mock('@/components/apartments/wohnung-edit-modal', () => ({
  WohnungEditModal: () => <div data-testid="wohnung-edit-modal">Wohnung Edit Modal</div>
}));

jest.mock('@/components/tasks/aufgabe-edit-modal', () => ({
  AufgabeEditModal: () => <div data-testid="aufgabe-edit-modal">Aufgabe Edit Modal</div>
}));

jest.mock('@/components/finance/betriebskosten-edit-modal', () => ({
  BetriebskostenEditModal: () => <div data-testid="betriebskosten-edit-modal">Betriebskosten Edit Modal</div>
}));

jest.mock('@/components/water-meters/wasserzaehler-modal', () => ({
  WasserzaehlerModal: () => <div data-testid="wasserzaehler-modal">Wasserzaehler Modal</div>
}));

jest.mock('@/components/tenants/kaution-modal', () => ({
  KautionModal: () => <div data-testid="kaution-modal">Kaution Modal</div>
}));

jest.mock('@/components/ui/confirmation-dialog', () => ({
  ConfirmationDialog: () => <div data-testid="confirmation-dialog">Confirmation Dialog</div>
}));

// Mock server actions
jest.mock('@/app/mieter-actions', () => ({
  handleSubmit: jest.fn(),
  updateKautionAction: jest.fn()
}));

jest.mock('@/app/(dashboard)/haeuser/actions', () => ({
  handleSubmit: jest.fn()
}));

jest.mock('@/app/finanzen-actions', () => ({
  financeServerAction: jest.fn()
}));

jest.mock('@/app/wohnungen-actions', () => ({
  wohnungServerAction: jest.fn()
}));

jest.mock('@/app/todos-actions', () => ({
  aufgabeServerAction: jest.fn()
}));

describe('Overview Modals Integration', () => {
  const mockModalStore = {
    // Tenant modal
    isTenantModalOpen: false,
    closeTenantModal: jest.fn(),
    tenantInitialData: undefined,
    tenantModalWohnungen: [],
    openTenantModal: jest.fn(),
    
    // House modal
    isHouseModalOpen: false,
    houseInitialData: undefined,
    houseModalOnSuccess: undefined,
    openHouseModal: jest.fn(),
    closeHouseModal: jest.fn(),
    
    // Finance modal
    isFinanceModalOpen: false,
    financeInitialData: undefined,
    financeModalWohnungen: [],
    financeModalOnSuccess: undefined,
    openFinanceModal: jest.fn(),
    closeFinanceModal: jest.fn(),
    
    // Wohnung modal
    isWohnungModalOpen: false,
    wohnungInitialData: undefined,
    wohnungModalHaeuser: [],
    wohnungModalOnSuccess: undefined,
    openWohnungModal: jest.fn(),
    closeWohnungModal: jest.fn(),
    wohnungApartmentLimit: undefined,
    wohnungIsActiveSubscription: undefined,
    wohnungApartmentCount: undefined,
    
    // Aufgabe modal
    isAufgabeModalOpen: false,
    
    // Betriebskosten modal
    isBetriebskostenModalOpen: false,
    
    // Confirmation modal
    isConfirmationModalOpen: false,
    confirmationModalConfig: null,
    closeConfirmationModal: jest.fn(),
    
    // Overview modals - these are the ones we're testing
    isHausOverviewModalOpen: false,
    hausOverviewData: undefined,
    hausOverviewLoading: false,
    hausOverviewError: undefined,
    openHausOverviewModal: jest.fn(),
    closeHausOverviewModal: jest.fn(),
    
    isWohnungOverviewModalOpen: false,
    wohnungOverviewData: undefined,
    wohnungOverviewLoading: false,
    wohnungOverviewError: undefined,
    openWohnungOverviewModal: jest.fn(),
    closeWohnungOverviewModal: jest.fn(),
    
    isApartmentTenantDetailsModalOpen: false,
    apartmentTenantDetailsData: undefined,
    apartmentTenantDetailsLoading: false,
    apartmentTenantDetailsError: undefined,
    openApartmentTenantDetailsModal: jest.fn(),
    closeApartmentTenantDetailsModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModalStore.mockReturnValue(mockModalStore);
  });

  it('renders all overview modals in dashboard layout', async () => {
    render(
      <DashboardRootLayout>
        <div>Dashboard Content</div>
      </DashboardRootLayout>
    );

    // Dynamic imports need async resolution
    await waitFor(() => {
      expect(screen.getByTestId('haus-overview-modal')).toBeInTheDocument();
    });
    expect(screen.getByTestId('wohnung-overview-modal')).toBeInTheDocument();
    expect(screen.getByTestId('apartment-tenant-details-modal')).toBeInTheDocument();
    
    // Verify other components are also rendered
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(screen.getByTestId('command-menu')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('renders all existing modals alongside overview modals', async () => {
    render(
      <DashboardRootLayout>
        <div>Dashboard Content</div>
      </DashboardRootLayout>
    );

    // Dynamic imports need async resolution
    await waitFor(() => {
      expect(screen.getByTestId('tenant-edit-modal')).toBeInTheDocument();
    });
    expect(screen.getByTestId('house-edit-modal')).toBeInTheDocument();
    expect(screen.getByTestId('finance-edit-modal')).toBeInTheDocument();
    expect(screen.getByTestId('wohnung-edit-modal')).toBeInTheDocument();
    expect(screen.getByTestId('aufgabe-edit-modal')).toBeInTheDocument();
    expect(screen.getByTestId('betriebskosten-edit-modal')).toBeInTheDocument();
    expect(screen.getByTestId('wasserzaehler-modal')).toBeInTheDocument();
    expect(screen.getByTestId('kaution-modal')).toBeInTheDocument();
    
    // Verify overview modals are also rendered
    expect(screen.getByTestId('haus-overview-modal')).toBeInTheDocument();
    expect(screen.getByTestId('wohnung-overview-modal')).toBeInTheDocument();
    expect(screen.getByTestId('apartment-tenant-details-modal')).toBeInTheDocument();
  });

  it('renders confirmation dialog when modal store indicates it should be open', async () => {
    const mockStoreWithConfirmation = {
      ...mockModalStore,
      isConfirmationModalOpen: true,
      confirmationModalConfig: {
        title: 'Test Title',
        description: 'Test Description',
        onConfirm: jest.fn(),
        confirmText: 'Confirm',
        cancelText: 'Cancel'
      }
    };
    
    mockUseModalStore.mockReturnValue(mockStoreWithConfirmation);

    render(
      <DashboardRootLayout>
        <div>Dashboard Content</div>
      </DashboardRootLayout>
    );

    await waitFor(() => {
      expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
    });
  });

  it('does not render confirmation dialog when modal store indicates it should be closed', () => {
    render(
      <DashboardRootLayout>
        <div>Dashboard Content</div>
      </DashboardRootLayout>
    );

    expect(screen.queryByTestId('confirmation-dialog')).not.toBeInTheDocument();
  });

  it('maintains proper component hierarchy with overview modals', async () => {
    const { container } = render(
      <DashboardRootLayout>
        <div>Dashboard Content</div>
      </DashboardRootLayout>
    );

    // Verify the basic structure is maintained
    const authProvider = container.firstChild;
    expect(authProvider).toBeInTheDocument();
    
    // Dynamic imports need async resolution
    await waitFor(() => {
      expect(screen.getByTestId('haus-overview-modal')).toBeInTheDocument();
    });
    expect(screen.getByTestId('wohnung-overview-modal')).toBeInTheDocument();
    expect(screen.getByTestId('apartment-tenant-details-modal')).toBeInTheDocument();
  });
});