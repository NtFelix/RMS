/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CloudStorageEnhanced } from '@/components/cloud-storage-enhanced'

// Mock Next.js router
const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}))

// Mock Supabase
jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } } })
    }
  })
}))

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

// Mock modal store
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({
    openUploadModal: jest.fn()
  })
}))

// Mock cloud storage store
jest.mock('@/hooks/use-cloud-storage-store', () => ({
  useCloudStorageStore: () => ({
    files: [],
    folders: [
      {
        name: 'House 1',
        path: 'user_test-user/house1',
        type: 'house',
        isEmpty: false,
        children: [],
        fileCount: 5,
        displayName: 'House 1'
      }
    ],
    isLoading: false,
    error: null,
    breadcrumbs: [
      { name: 'Cloud Storage', path: 'user_test-user', type: 'root' }
    ],
    setCurrentPath: jest.fn(),
    setFiles: jest.fn(),
    setFolders: jest.fn(),
    setBreadcrumbs: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    refreshCurrentPath: jest.fn(),
    downloadFile: jest.fn(),
    deleteFile: jest.fn()
  })
}))

// Mock directory cache
jest.mock('@/lib/directory-cache', () => ({
  getDirectoryCache: () => ({
    get: jest.fn().mockReturnValue({
      files: [],
      folders: [],
      breadcrumbs: [
        { name: 'Cloud Storage', path: 'user_test-user', type: 'root' },
        { name: 'House 1', path: 'user_test-user/house1', type: 'house' }
      ],
      timestamp: Date.now()
    }),
    set: jest.fn(),
    has: jest.fn().mockReturnValue(true),
    invalidate: jest.fn(),
    clear: jest.fn(),
    preload: jest.fn()
  })
}))

// Mock actions
jest.mock('@/app/(dashboard)/dateien/actions', () => ({
  loadFilesForPath: jest.fn().mockResolvedValue({
    files: [],
    folders: [],
    error: null
  })
}))

describe('URL Management End-to-End', () => {
  const userId = 'test-user'
  const initialPath = `user_${userId}`
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: {
        pushState: jest.fn(),
        replaceState: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        state: null
      },
      writable: true,
      configurable: true
    })
    
    // Mock window.location
    delete (window as any).location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/dateien',
        href: 'http://localhost/dateien'
      },
      writable: true,
      configurable: true
    })
    
    // Mock document.title
    Object.defineProperty(document, 'title', {
      value: '',
      writable: true,
      configurable: true
    })
    
    // Mock window.scrollY and scrollTo
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true
    })
    
    Object.defineProperty(window, 'scrollTo', {
      value: jest.fn(),
      writable: true,
      configurable: true
    })
  })

  it('should initialize with correct URL and document title', async () => {
    const initialBreadcrumbs = [
      { name: 'Cloud Storage', path: 'user_test-user', type: 'root' }
    ]

    render(
      <CloudStorageEnhanced
        userId={userId}
        initialPath={initialPath}
        initialFiles={[]}
        initialFolders={[]}
        initialBreadcrumbs={initialBreadcrumbs}
        isSSR={true}
        enableClientNavigation={true}
      />
    )
    
    await waitFor(() => {
      // Should set up browser history state
      expect(window.history.replaceState).toHaveBeenCalledWith(
        expect.objectContaining({
          path: initialPath,
          clientNavigation: true
        }),
        '',
        expect.any(String)
      )
    })
    
    // Should update document title
    expect(document.title).toBe('Cloud Storage - RMS')
  })

  it('should handle folder navigation with URL updates', async () => {
    const initialBreadcrumbs = [
      { name: 'Cloud Storage', path: 'user_test-user', type: 'root' }
    ]

    render(
      <CloudStorageEnhanced
        userId={userId}
        initialPath={initialPath}
        initialFiles={[]}
        initialFolders={[
          {
            name: 'House 1',
            path: 'user_test-user/house1',
            type: 'house',
            isEmpty: false,
            children: [],
            fileCount: 5,
            displayName: 'House 1'
          }
        ]}
        initialBreadcrumbs={initialBreadcrumbs}
        isSSR={true}
        enableClientNavigation={true}
      />
    )
    
    // Find and click on a folder
    const folderElement = screen.getByText('House 1')
    expect(folderElement).toBeInTheDocument()
    
    // The folder should have the data-folder-path attribute
    const folderCard = folderElement.closest('[data-folder-path]')
    expect(folderCard).toHaveAttribute('data-folder-path', 'user_test-user/house1')
    
    // Click the folder
    fireEvent.click(folderCard!)
    
    await waitFor(() => {
      // Should update browser history
      expect(window.history.pushState).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'user_test-user/house1',
          clientNavigation: true
        }),
        '',
        '/dateien/house1'
      )
    })
  })

  it('should handle breadcrumb navigation', async () => {
    const initialBreadcrumbs = [
      { name: 'Cloud Storage', path: 'user_test-user', type: 'root' },
      { name: 'House 1', path: 'user_test-user/house1', type: 'house' }
    ]

    render(
      <CloudStorageEnhanced
        userId={userId}
        initialPath="user_test-user/house1"
        initialFiles={[]}
        initialFolders={[]}
        initialBreadcrumbs={initialBreadcrumbs}
        isSSR={true}
        enableClientNavigation={true}
      />
    )
    
    // Find the root breadcrumb
    const rootBreadcrumb = screen.getByText('Cloud Storage')
    expect(rootBreadcrumb).toBeInTheDocument()
    
    // Click the root breadcrumb
    fireEvent.click(rootBreadcrumb)
    
    await waitFor(() => {
      // Should navigate back to root
      expect(window.history.pushState).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'user_test-user',
          clientNavigation: true
        }),
        '',
        '/dateien'
      )
    })
  })

  it('should maintain URL consistency on component mount', async () => {
    const initialBreadcrumbs = [
      { name: 'Cloud Storage', path: 'user_test-user', type: 'root' },
      { name: 'House 1', path: 'user_test-user/house1', type: 'house' }
    ]

    // Mock current URL to match the initial path
    delete (window as any).location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/dateien/house1',
        href: 'http://localhost/dateien/house1'
      },
      writable: true,
      configurable: true
    })

    render(
      <CloudStorageEnhanced
        userId={userId}
        initialPath="user_test-user/house1"
        initialFiles={[]}
        initialFolders={[]}
        initialBreadcrumbs={initialBreadcrumbs}
        isSSR={true}
        enableClientNavigation={true}
      />
    )
    
    await waitFor(() => {
      // Should set up browser history state correctly
      expect(window.history.replaceState).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'user_test-user/house1',
          clientNavigation: true
        }),
        '',
        '/dateien/house1'
      )
    })
    
    // Should update document title with current directory
    expect(document.title).toBe('House 1 - Cloud Storage - RMS')
  })

  it('should handle empty state correctly', async () => {
    const initialBreadcrumbs = [
      { name: 'Cloud Storage', path: 'user_test-user', type: 'root' }
    ]

    render(
      <CloudStorageEnhanced
        userId={userId}
        initialPath={initialPath}
        initialFiles={[]}
        initialFolders={[]}
        initialBreadcrumbs={initialBreadcrumbs}
        isSSR={true}
        enableClientNavigation={true}
      />
    )
    
    // Should show empty state
    expect(screen.getByText('Noch keine Dateien')).toBeInTheDocument()
    expect(screen.getByText('Laden Sie Ihre ersten Dateien hoch, um zu beginnen.')).toBeInTheDocument()
    
    // Should still set up URL management
    await waitFor(() => {
      expect(window.history.replaceState).toHaveBeenCalled()
    })
  })
})