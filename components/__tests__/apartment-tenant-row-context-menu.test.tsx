import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ApartmentTenantRowContextMenu } from '../apartment-tenant-row-context-menu'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Mock the context menu components
jest.mock('@/components/ui/context-menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="context-menu">{children}</div>,
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="context-menu-trigger">{children}</div>,
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="context-menu-content">{children}</div>,
  ContextMenuItem: ({ children, onClick, disabled, className }: { 
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    className?: string
  }) => (
    <button 
      data-testid="context-menu-item" 
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
  ContextMenuSeparator: () => <div data-testid="context-menu-separator" />,
}))

describe('ApartmentTenantRowContextMenu', () => {
  const mockOpenApartmentTenantDetailsModal = jest.fn()
  const mockOnEditApartment = jest.fn()
  const mockOnEditTenant = jest.fn()

  const defaultProps = {
    apartmentId: 'apartment-1',
    tenantId: 'tenant-1',
    apartmentData: {
      id: 'apartment-1',
      name: 'Wohnung 1A',
      groesse: 75,
      miete: 800
    },
    tenantData: {
      id: 'tenant-1',
      name: 'Max Mustermann',
      email: 'max@example.com',
      telefon: '0123456789',
      einzug: '2023-01-01'
    },
    onEditApartment: mockOnEditApartment,
    onEditTenant: mockOnEditTenant,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseModalStore.mockReturnValue({
      openApartmentTenantDetailsModal: mockOpenApartmentTenantDetailsModal,
    } as any)
  })

  it('renders context menu with all menu items', () => {
    render(
      <ApartmentTenantRowContextMenu {...defaultProps}>
        <div>Test Child</div>
      </ApartmentTenantRowContextMenu>
    )

    expect(screen.getByTestId('context-menu')).toBeInTheDocument()
    expect(screen.getByTestId('context-menu-trigger')).toBeInTheDocument()
    expect(screen.getByTestId('context-menu-content')).toBeInTheDocument()
    expect(screen.getByText('Test Child')).toBeInTheDocument()

    // Check for menu items
    const menuItems = screen.getAllByTestId('context-menu-item')
    expect(menuItems).toHaveLength(3)
    
    expect(screen.getByText('Wohnung bearbeiten')).toBeInTheDocument()
    expect(screen.getByText('Mieter bearbeiten')).toBeInTheDocument()
    expect(screen.getByText('Details anzeigen')).toBeInTheDocument()
  })

  it('calls onEditApartment when edit apartment is clicked', () => {
    render(
      <ApartmentTenantRowContextMenu {...defaultProps}>
        <div>Test Child</div>
      </ApartmentTenantRowContextMenu>
    )

    const editApartmentButton = screen.getByText('Wohnung bearbeiten').closest('button')
    fireEvent.click(editApartmentButton!)

    expect(mockOnEditApartment).toHaveBeenCalledTimes(1)
  })

  it('calls onEditTenant when edit tenant is clicked and tenant exists', () => {
    render(
      <ApartmentTenantRowContextMenu {...defaultProps}>
        <div>Test Child</div>
      </ApartmentTenantRowContextMenu>
    )

    const editTenantButton = screen.getByText('Mieter bearbeiten').closest('button')
    fireEvent.click(editTenantButton!)

    expect(mockOnEditTenant).toHaveBeenCalledTimes(1)
  })

  it('disables edit tenant button when no tenant exists', () => {
    const propsWithoutTenant = {
      ...defaultProps,
      tenantId: undefined,
      tenantData: undefined,
    }

    render(
      <ApartmentTenantRowContextMenu {...propsWithoutTenant}>
        <div>Test Child</div>
      </ApartmentTenantRowContextMenu>
    )

    const editTenantButton = screen.getByText('Mieter bearbeiten').closest('button')
    expect(editTenantButton).toBeDisabled()
    expect(editTenantButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
  })

  it('calls openApartmentTenantDetailsModal when view details is clicked', () => {
    render(
      <ApartmentTenantRowContextMenu {...defaultProps}>
        <div>Test Child</div>
      </ApartmentTenantRowContextMenu>
    )

    const viewDetailsButton = screen.getByText('Details anzeigen').closest('button')
    fireEvent.click(viewDetailsButton!)

    expect(mockOpenApartmentTenantDetailsModal).toHaveBeenCalledWith('apartment-1', 'tenant-1')
  })

  it('calls openApartmentTenantDetailsModal with undefined tenantId when no tenant exists', () => {
    const propsWithoutTenant = {
      ...defaultProps,
      tenantId: undefined,
      tenantData: undefined,
    }

    render(
      <ApartmentTenantRowContextMenu {...propsWithoutTenant}>
        <div>Test Child</div>
      </ApartmentTenantRowContextMenu>
    )

    const viewDetailsButton = screen.getByText('Details anzeigen').closest('button')
    fireEvent.click(viewDetailsButton!)

    expect(mockOpenApartmentTenantDetailsModal).toHaveBeenCalledWith('apartment-1', undefined)
  })

  it('renders with proper styling classes', () => {
    render(
      <ApartmentTenantRowContextMenu {...defaultProps}>
        <div>Test Child</div>
      </ApartmentTenantRowContextMenu>
    )

    const menuItems = screen.getAllByTestId('context-menu-item')
    
    // Check that all menu items have the proper styling classes
    menuItems.forEach(item => {
      expect(item).toHaveClass('flex', 'items-center', 'gap-2', 'cursor-pointer')
    })

    // Check that disabled tenant edit button has disabled styling
    const propsWithoutTenant = {
      ...defaultProps,
      tenantId: undefined,
    }

    render(
      <ApartmentTenantRowContextMenu {...propsWithoutTenant}>
        <div>Test Child 2</div>
      </ApartmentTenantRowContextMenu>
    )

    const disabledTenantButton = screen.getAllByText('Mieter bearbeiten')[1].closest('button')
    expect(disabledTenantButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
  })

  it('renders separator between menu sections', () => {
    render(
      <ApartmentTenantRowContextMenu {...defaultProps}>
        <div>Test Child</div>
      </ApartmentTenantRowContextMenu>
    )

    expect(screen.getByTestId('context-menu-separator')).toBeInTheDocument()
  })
})