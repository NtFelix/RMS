import { act, fireEvent, render, screen } from '@testing-library/react'
import { CloudStorage } from '@/components/cloud-storage/cloud-storage'

/**
 * A folder that could not be loaded (refused by the database, missing, technical error) is shown as an error and
 * never as an empty folder with upload / create actions. Children and data hooks are mocks, data is synthetic.
 */

const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }))

const mockOpenUploadModal = jest.fn()
const mockOpenCreateFolderModal = jest.fn()
const mockOpenCreateFileModal = jest.fn()
jest.mock('@/hooks/use-modal-store', () => {
  const state = () => ({
    openUploadModal: mockOpenUploadModal,
    openCreateFolderModal: mockOpenCreateFolderModal,
    openCreateFileModal: mockOpenCreateFileModal,
  })
  const useModalStore = Object.assign(() => state(), { getState: state })
  return { useModalStore }
})

let mockNavigationError: string | null = null
const mockNavigate = jest.fn()
jest.mock('@/lib/navigation-controller', () => ({
  useNavigation: () => ({
    isNavigating: false,
    error: mockNavigationError,
    navigate: mockNavigate,
    cancelAll: jest.fn(),
    stats: { retryCount: 0 },
    clearError: jest.fn(),
  }),
}))

jest.mock('@/hooks/use-storage-usage', () => ({
  useStorageUsage: () => ({ usage: 0, limit: 1000, isLoading: false, refresh: jest.fn() }),
}))
jest.mock('@/hooks/use-user-profile', () => ({ useUserProfile: () => ({ user: null }) }))
jest.mock('@/hooks/use-cloud-storage-navigation', () => ({ useCloudStorageNavigationStore: jest.fn() }))
jest.mock('@/lib/file-loader', () => ({ cancelAllPendingLoads: jest.fn() }))
jest.mock('@/lib/posthog-logger', () => ({ posthogLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))
jest.mock('@/components/cloud-storage/storage-loading-states', () => ({ FileGridSkeleton: () => <div>skeleton</div> }))
jest.mock('@/components/cloud-storage/cloud-storage-item-card', () => ({ CloudStorageItemCard: () => <div>card</div> }))
jest.mock('@/components/common/documents-summary-cards', () => ({
  DocumentsSummaryCards: ({ onUpload, onCreateFolder }: { onUpload: (files: File[]) => void; onCreateFolder: () => void }) => (
    <div>
      <button onClick={() => onUpload([])}>summary-upload</button>
      <button onClick={onCreateFolder}>summary-create-folder</button>
    </div>
  ),
}))
jest.mock('@/components/cloud-storage/cloud-storage-quick-actions', () => ({
  CloudStorageQuickActions: ({ onUpload, onCreateFolder, onCreateFile, isUploadDisabled, storageDisabledMessage }: any) => (
    <div>
      <button onClick={onUpload}>quick-upload</button>
      <button onClick={onCreateFolder}>quick-create-folder</button>
      <button onClick={onCreateFile}>quick-create-file</button>
      <span data-testid="upload-disabled">{String(isUploadDisabled)}</span>
      <span data-testid="disabled-message">{storageDisabledMessage}</span>
    </div>
  ),
}))

const ORG = 'org1'
const PATH = `org_${ORG}/shared/haus-a`
const REFUSED = 'Dieser Ordner ist nicht verfügbar oder Sie haben keine Berechtigung dafür.'

function renderStorage(props: Partial<React.ComponentProps<typeof CloudStorage>> = {}) {
  return render(<CloudStorage userId="u1" orgId={ORG} initialPath={PATH} {...props} />)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockNavigationError = null
})

describe('CloudStorage: a folder that failed to load', () => {
  it('shows the error instead of an empty folder, without any way to dismiss it into the empty state', () => {
    renderStorage({ initialError: REFUSED })

    expect(screen.getByText(REFUSED, { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Erneut versuchen/ })).toBeInTheDocument()
    expect(screen.queryByText(/Fehler ignorieren/)).not.toBeInTheDocument()
    expect(screen.queryByText('Noch keine Dateien')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Dateien hochladen/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ordner erstellen/ })).not.toBeInTheDocument()
  })

  it('does not open upload, create folder or create file for a refused folder (cards, quick actions)', () => {
    renderStorage({ initialError: REFUSED })

    for (const name of ['summary-upload', 'summary-create-folder', 'quick-upload', 'quick-create-folder', 'quick-create-file']) {
      fireEvent.click(screen.getByText(name))
    }

    expect(mockOpenUploadModal).not.toHaveBeenCalled()
    expect(mockOpenCreateFolderModal).not.toHaveBeenCalled()
    expect(mockOpenCreateFileModal).not.toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ description: REFUSED, variant: 'destructive' }))
    expect(screen.getByTestId('upload-disabled')).toHaveTextContent('true')
    expect(screen.getByTestId('disabled-message')).toHaveTextContent(REFUSED)
  })

  it('treats a navigation error the same way', () => {
    mockNavigationError = 'Navigation timeout'
    renderStorage()

    expect(screen.getByText('Navigation timeout', { selector: 'p' })).toBeInTheDocument()
    fireEvent.click(screen.getByText('quick-upload'))
    expect(mockOpenUploadModal).not.toHaveBeenCalled()
  })

  it('keeps writing possible and shows the empty state for a folder that loaded without error', () => {
    renderStorage()

    expect(screen.getByText('Noch keine Dateien')).toBeInTheDocument()
    fireEvent.click(screen.getByText('quick-upload'))
    expect(mockOpenUploadModal).toHaveBeenCalled()
    expect(screen.getByTestId('upload-disabled')).toHaveTextContent('false')
  })

  it('follows a new server-side result: the error of the props appears and disappears with them', () => {
    const { rerender } = renderStorage()
    expect(screen.queryByText(REFUSED, { selector: 'p' })).not.toBeInTheDocument()

    rerender(<CloudStorage userId="u1" orgId={ORG} initialPath={`${PATH}/gesperrt`} initialError={REFUSED} />)
    expect(screen.getByText(REFUSED, { selector: 'p' })).toBeInTheDocument()

    rerender(<CloudStorage userId="u1" orgId={ORG} initialPath={`${PATH}/offen`} />)
    expect(screen.queryByText(REFUSED, { selector: 'p' })).not.toBeInTheDocument()
  })

  it('a successful reload clears the error', async () => {
    mockNavigate.mockResolvedValue({ success: true, data: { files: [], folders: [], breadcrumbs: [], totalSize: 0 } })
    renderStorage({ initialError: REFUSED })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Erneut versuchen/ }))
    })

    expect(screen.queryByText(REFUSED, { selector: 'p' })).not.toBeInTheDocument()
  })
})
