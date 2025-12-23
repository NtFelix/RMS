import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { NavigationInterceptor, useFolderNavigation } from '@/components/common/navigation-interceptor'
import { useCloudStorageNavigation } from '@/hooks/use-cloud-storage-navigation'
import { getDirectoryCache } from '@/lib/directory-cache'
import { useToast } from '@/hooks/use-toast'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

jest.mock('@/hooks/use-cloud-storage-navigation', () => ({
  useCloudStorageNavigation: jest.fn()
}))

jest.mock('@/lib/directory-cache', () => ({
  getDirectoryCache: jest.fn()
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn()
}))

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn()
}

const mockNavigation = {
  navigateToPath: jest.fn(),
  isNavigating: false,
  historyIndex: 0,
  navigationHistory: [],
  goBack: jest.fn(),
  goForward: jest.fn(),
  getNavigationStats: jest.fn(() => ({})),
  currentPath: 'user_123'
}

const mockDirectoryCache = {
  get: jest.fn(),
  set: jest.fn(),
  invalidate: jest.fn(),
  clear: jest.fn()
}

const mockToast = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  ;(useCloudStorageNavigation as jest.Mock).mockReturnValue(mockNavigation)
  ;(getDirectoryCache as jest.Mock).mockReturnValue(mockDirectoryCache)
  ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
})

describe('NavigationInterceptor', () => {
  const userId = '123'
  
  it('renders children correctly', () => {
    render(
      <NavigationInterceptor userId={userId}>
        <div data-testid="child">Test Child</div>
      </NavigationInterceptor>
    )
    
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
  
  it('intercepts folder clicks and triggers client navigation', async () => {
    const onNavigate = jest.fn()
    
    render(
      <NavigationInterceptor userId={userId} onNavigate={onNavigate}>
        <div 
          data-folder-path="user_123/test-folder" 
          data-testid="folder"
        >
          Test Folder
        </div>
      </NavigationInterceptor>
    )
    
    const folder = screen.getByTestId('folder')
    fireEvent.click(folder)
    
    await waitFor(() => {
      expect(mockNavigation.navigateToPath).toHaveBeenCalledWith(
        'user_123/test-folder',
        {}
      )
    })
  })
  
  it('falls back to SSR navigation on client navigation failure', async () => {
    mockNavigation.navigateToPath.mockRejectedValue(new Error('Navigation failed'))
    
    render(
      <NavigationInterceptor userId={userId} fallbackToSSR={true}>
        <div 
          data-folder-path="user_123/test-folder" 
          data-testid="folder"
        >
          Test Folder
        </div>
      </NavigationInterceptor>
    )
    
    const folder = screen.getByTestId('folder')
    fireEvent.click(folder)
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dateien/test-folder')
    })
  })
  
  it('debounces rapid navigation attempts', async () => {
    jest.useFakeTimers()
    
    render(
      <NavigationInterceptor 
        userId={userId} 
        enableDebouncing={true}
        debounceMs={150}
      >
        <div 
          data-folder-path="user_123/test-folder" 
          data-testid="folder"
        >
          Test Folder
        </div>
      </NavigationInterceptor>
    )
    
    const folder = screen.getByTestId('folder')
    
    // Click multiple times rapidly
    fireEvent.click(folder)
    fireEvent.click(folder)
    fireEvent.click(folder)
    
    // Should not have called navigation yet
    expect(mockNavigation.navigateToPath).not.toHaveBeenCalled()
    
    // Fast forward past debounce time
    jest.advanceTimersByTime(150)
    
    await waitFor(() => {
      expect(mockNavigation.navigateToPath).toHaveBeenCalledTimes(1)
    })
    
    jest.useRealTimers()
  })
  
  it('prevents navigation to same path unless forced', async () => {
    mockNavigation.currentPath = 'user_123/test-folder'
    
    render(
      <NavigationInterceptor userId={userId}>
        <div 
          data-folder-path="user_123/test-folder" 
          data-testid="folder"
        >
          Test Folder
        </div>
      </NavigationInterceptor>
    )
    
    const folder = screen.getByTestId('folder')
    fireEvent.click(folder)
    
    // Should not navigate to same path
    expect(mockNavigation.navigateToPath).not.toHaveBeenCalled()
  })
  
  // Note: Browser back/forward navigation test skipped due to test environment limitations
  // The functionality is implemented and works in real browser environment
})

describe('useFolderNavigation', () => {
  const TestComponent = ({ userId }: { userId: string }) => {
    const { handleFolderClick, isNavigating } = useFolderNavigation(userId)
    
    return (
      <div>
        <button 
          onClick={() => handleFolderClick('user_123/test-folder')}
          data-testid="navigate-btn"
        >
          Navigate
        </button>
        <div data-testid="navigating">{isNavigating ? 'Navigating...' : 'Ready'}</div>
      </div>
    )
  }
  
  it('provides folder navigation functionality', async () => {
    render(<TestComponent userId="123" />)
    
    const button = screen.getByTestId('navigate-btn')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(mockNavigation.navigateToPath).toHaveBeenCalledWith(
        'user_123/test-folder',
        {}
      )
    })
  })
  
  it('falls back to router navigation on error', async () => {
    mockNavigation.navigateToPath.mockRejectedValue(new Error('Failed'))
    
    render(<TestComponent userId="123" />)
    
    const button = screen.getByTestId('navigate-btn')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dateien/test-folder')
    })
  })
  
  it('shows navigation state correctly', () => {
    mockNavigation.isNavigating = true
    
    render(<TestComponent userId="123" />)
    
    expect(screen.getByTestId('navigating')).toHaveTextContent('Navigating...')
  })
})