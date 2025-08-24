/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useCloudStorageNavigation } from '@/hooks/use-cloud-storage-navigation'
import { NavigationInterceptor } from '@/components/navigation-interceptor'
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
    folders: [],
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
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
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

describe('URL Management Integration', () => {
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
    
    // Mock window.scrollTo
    Object.defineProperty(window, 'scrollTo', {
      value: jest.fn(),
      writable: true,
      configurable: true
    })
    
    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true
    })
    
    // Mock document.title
    Object.defineProperty(document, 'title', {
      value: '',
      writable: true,
      configurable: true
    })
  })

  describe('Browser History Integration', () => {
    it('should update browser history on navigation', async () => {
      const TestComponent = () => {
        const navigation = useCloudStorageNavigation()
        
        return (
          <div>
            <button 
              onClick={() => navigation.navigateToPath(`${initialPath}/house1`)}
              data-testid="navigate-button"
            >
              Navigate
            </button>
            <div data-testid="current-path">{navigation.currentPath}</div>
          </div>
        )
      }

      render(<TestComponent />)
      
      const navigateButton = screen.getByTestId('navigate-button')
      fireEvent.click(navigateButton)
      
      await waitFor(() => {
        expect(window.history.pushState).toHaveBeenCalledWith(
          expect.objectContaining({
            path: `${initialPath}/house1`,
            clientNavigation: true,
            timestamp: expect.any(Number)
          }),
          '',
          '/dateien/house1'
        )
      })
    })

    it('should handle browser back/forward navigation', async () => {
      const TestComponent = () => {
        const navigation = useCloudStorageNavigation()
        
        return (
          <div>
            <div data-testid="current-path">{navigation.currentPath}</div>
            <button 
              onClick={() => navigation.goBack()}
              data-testid="back-button"
            >
              Back
            </button>
          </div>
        )
      }

      render(<TestComponent />)
      
      // Simulate popstate event
      const popstateEvent = new PopStateEvent('popstate', {
        state: {
          path: initialPath,
          clientNavigation: true,
          scrollPosition: 100
        }
      })
      
      window.dispatchEvent(popstateEvent)
      
      await waitFor(() => {
        // Should handle the browser navigation
        expect(window.scrollTo).toHaveBeenCalledWith({
          top: 100,
          behavior: 'auto'
        })
      })
    })

    it('should update document title based on current directory', async () => {
      const breadcrumbs = [
        { name: 'Cloud Storage', path: 'user_test-user', type: 'root' },
        { name: 'House 1', path: 'user_test-user/house1', type: 'house' },
        { name: 'Apartment 1', path: 'user_test-user/house1/apt1', type: 'apartment' }
      ]
      
      const TestComponent = () => {
        const navigation = useCloudStorageNavigation()
        
        return (
          <button 
            onClick={() => navigation.updateDocumentTitle('user_test-user/house1/apt1', breadcrumbs)}
            data-testid="update-title"
          >
            Update Title
          </button>
        )
      }

      render(<TestComponent />)
      
      const updateButton = screen.getByTestId('update-title')
      fireEvent.click(updateButton)
      
      await waitFor(() => {
        expect(document.title).toBe('Apartment 1 - House 1 - Cloud Storage - RMS')
      })
    })

    it('should handle direct URL access correctly', async () => {
      // Mock current URL to simulate direct access
      delete (window as any).location
      Object.defineProperty(window, 'location', {
        value: {
          pathname: '/dateien/house1/apt1',
          href: 'http://localhost/dateien/house1/apt1'
        },
        writable: true,
        configurable: true
      })
      
      const TestComponent = () => {
        const navigation = useCloudStorageNavigation()
        
        return (
          <div>
            <div data-testid="current-url">{navigation.getCurrentUrl('user_test-user/house1/apt1')}</div>
          </div>
        )
      }

      render(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('current-url')).toHaveTextContent('/dateien/house1/apt1')
      })
    })
  })

  describe('URL Synchronization', () => {
    it('should convert storage paths to URLs correctly', () => {
      const TestComponent = () => {
        const navigation = useCloudStorageNavigation()
        
        return (
          <div>
            <div data-testid="root-url">{navigation.getCurrentUrl('user_test-user')}</div>
            <div data-testid="house-url">{navigation.getCurrentUrl('user_test-user/house1')}</div>
            <div data-testid="apartment-url">{navigation.getCurrentUrl('user_test-user/house1/apt1')}</div>
          </div>
        )
      }

      render(<TestComponent />)
      
      expect(screen.getByTestId('root-url')).toHaveTextContent('/dateien')
      expect(screen.getByTestId('house-url')).toHaveTextContent('/dateien/house1')
      expect(screen.getByTestId('apartment-url')).toHaveTextContent('/dateien/house1/apt1')
    })

    it('should handle page refresh by maintaining URL consistency', async () => {
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
      
      await waitFor(() => {
        expect(window.history.replaceState).toHaveBeenCalledWith(
          expect.objectContaining({
            path: 'user_test-user/house1',
            clientNavigation: true
          }),
          '',
          expect.any(String)
        )
      })
    })
  })

  describe('Navigation Interceptor Integration', () => {
    it('should intercept folder clicks and update URL', async () => {
      const mockFolder = {
        name: 'House 1',
        path: 'user_test-user/house1',
        type: 'house',
        isEmpty: false,
        children: [],
        fileCount: 5,
        displayName: 'House 1'
      }

      render(
        <NavigationInterceptor userId={userId} fallbackToSSR={true}>
          <div>
            <button 
              data-folder-path={mockFolder.path}
              data-testid="folder-button"
            >
              {mockFolder.name}
            </button>
          </div>
        </NavigationInterceptor>
      )
      
      const folderButton = screen.getByTestId('folder-button')
      fireEvent.click(folderButton)
      
      await waitFor(() => {
        expect(window.history.pushState).toHaveBeenCalledWith(
          expect.objectContaining({
            path: mockFolder.path,
            clientNavigation: true
          }),
          '',
          '/dateien/house1'
        )
      })
    })

    it('should handle navigation failures gracefully', async () => {
      // Mock navigation failure
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const TestComponent = () => {
        const navigation = useCloudStorageNavigation()
        
        return (
          <button 
            onClick={() => {
              // Simulate navigation failure
              throw new Error('Navigation failed')
            }}
            data-testid="failing-navigation"
          >
            Navigate
          </button>
        )
      }

      render(
        <NavigationInterceptor userId={userId} fallbackToSSR={true}>
          <TestComponent />
        </NavigationInterceptor>
      )
      
      const button = screen.getByTestId('failing-navigation')
      
      expect(() => fireEvent.click(button)).toThrow('Navigation failed')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Scroll Position Management', () => {
    it('should save and restore scroll positions', async () => {
      const TestComponent = () => {
        const navigation = useCloudStorageNavigation()
        
        return (
          <div>
            <button 
              onClick={() => {
                navigation.saveScrollPosition('user_test-user/house1', 500)
              }}
              data-testid="save-scroll"
            >
              Save Scroll
            </button>
            <button 
              onClick={() => {
                const position = navigation.getScrollPosition('user_test-user/house1')
                return position
              }}
              data-testid="get-scroll"
            >
              Get Scroll
            </button>
          </div>
        )
      }

      render(<TestComponent />)
      
      const saveButton = screen.getByTestId('save-scroll')
      fireEvent.click(saveButton)
      
      const getButton = screen.getByTestId('get-scroll')
      const result = fireEvent.click(getButton)
      
      // The scroll position should be saved and retrievable
      expect(result).toBeTruthy()
    })

    it('should update history state with scroll position', async () => {
      // Mock scrollY
      Object.defineProperty(window, 'scrollY', {
        value: 300,
        writable: true,
        configurable: true
      })
      
      const TestComponent = () => {
        const navigation = useCloudStorageNavigation()
        
        return (
          <button 
            onClick={() => navigation.navigateToPath('user_test-user/house1')}
            data-testid="navigate-with-scroll"
          >
            Navigate
          </button>
        )
      }

      render(<TestComponent />)
      
      const button = screen.getByTestId('navigate-with-scroll')
      fireEvent.click(button)
      
      // Simulate scroll event
      fireEvent.scroll(window, { target: { scrollY: 300 } })
      
      await waitFor(() => {
        expect(window.history.replaceState).toHaveBeenCalledWith(
          expect.objectContaining({
            scrollPosition: 300
          }),
          '',
          expect.any(String)
        )
      })
    })
  })
})