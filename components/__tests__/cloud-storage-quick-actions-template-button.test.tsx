import { render, screen } from '@testing-library/react'
import { CloudStorageQuickActions } from '@/components/cloud-storage-quick-actions'

// Mock PostHog
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: jest.fn(() => false),
}))

// Mock Radix UI components to simplify testing
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => (
    <div data-testid="dropdown-item" onClick={onClick}>{children}</div>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
}))

describe('CloudStorageQuickActions - Template Button Integration', () => {
  const defaultProps = {
    onUpload: jest.fn(),
    onCreateFolder: jest.fn(),
    onCreateFile: jest.fn(),
    onCreateTemplate: jest.fn(),
    onSearch: jest.fn(),
    onSort: jest.fn(),
    onViewMode: jest.fn(),
    onFilter: jest.fn(),
    viewMode: 'grid' as const,
    searchQuery: '',
    selectedCount: 0,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show template creation button when in templates folder', () => {
    render(
      <CloudStorageQuickActions
        {...defaultProps}
        currentPath="user_123/Vorlagen"
      />
    )

    // Check if "Vorlage erstellen" option is rendered
    expect(screen.getByText('Vorlage erstellen')).toBeInTheDocument()
  })

  it('should show template creation button when at root level', () => {
    render(
      <CloudStorageQuickActions
        {...defaultProps}
        currentPath="user_123"
      />
    )

    // Check if "Vorlage erstellen" option is rendered
    expect(screen.getByText('Vorlage erstellen')).toBeInTheDocument()
  })

  it('should not show template creation button when not in templates context', () => {
    render(
      <CloudStorageQuickActions
        {...defaultProps}
        currentPath="user_123/SomeOtherFolder"
      />
    )

    // Check if "Vorlage erstellen" option is NOT rendered
    expect(screen.queryByText('Vorlage erstellen')).not.toBeInTheDocument()
  })

  it('should not show template creation button when onCreateTemplate is not provided', () => {
    render(
      <CloudStorageQuickActions
        {...defaultProps}
        onCreateTemplate={undefined}
        currentPath="user_123/Vorlagen"
      />
    )

    // Check if "Vorlage erstellen" option is NOT rendered when callback is not provided
    expect(screen.queryByText('Vorlage erstellen')).not.toBeInTheDocument()
  })

  it('should show template creation button in template category folders', () => {
    render(
      <CloudStorageQuickActions
        {...defaultProps}
        currentPath="user_123/Vorlagen/Mietverträge"
      />
    )

    // Check if "Vorlage erstellen" option is rendered in category folders
    expect(screen.getByText('Vorlage erstellen')).toBeInTheDocument()
  })

  it('should maintain existing functionality for other buttons', () => {
    render(
      <CloudStorageQuickActions
        {...defaultProps}
        currentPath="user_123/Vorlagen"
      />
    )

    // Check that existing buttons are still present
    expect(screen.getByText('Dateien hochladen')).toBeInTheDocument()
    expect(screen.getByText('Ordner erstellen')).toBeInTheDocument()
    expect(screen.getByText('Vorlage erstellen')).toBeInTheDocument()
  })

  it('should render the main add button', () => {
    render(
      <CloudStorageQuickActions
        {...defaultProps}
        currentPath="user_123"
      />
    )

    // Check that the main "Hinzufügen" button is rendered
    expect(screen.getByText('Hinzufügen')).toBeInTheDocument()
  })
})