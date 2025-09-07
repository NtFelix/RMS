import { useMobileNavStore } from '@/hooks/use-mobile-nav-store'

describe('Mobile Navigation Store Basic Tests', () => {
  beforeEach(() => {
    // Reset store state before each test
    useMobileNavStore.getState().closeAllDropdowns()
  })

  it('should have correct initial state', () => {
    const state = useMobileNavStore.getState()
    
    expect(state.isAddMenuOpen).toBe(false)
    expect(state.isMoreMenuOpen).toBe(false)
    expect(state.activeDropdown).toBe('none')
  })

  it('should open add menu and close other menus', () => {
    const { openAddMenu, openMoreMenu } = useMobileNavStore.getState()
    
    // First open more menu
    openMoreMenu()
    expect(useMobileNavStore.getState().isMoreMenuOpen).toBe(true)
    expect(useMobileNavStore.getState().activeDropdown).toBe('more')
    
    // Then open add menu - should close more menu
    openAddMenu()
    expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
    expect(useMobileNavStore.getState().isMoreMenuOpen).toBe(false)
    expect(useMobileNavStore.getState().activeDropdown).toBe('add')
  })

  it('should open more menu and close other menus', () => {
    const { openAddMenu, openMoreMenu } = useMobileNavStore.getState()
    
    // First open add menu
    openAddMenu()
    expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
    expect(useMobileNavStore.getState().activeDropdown).toBe('add')
    
    // Then open more menu - should close add menu
    openMoreMenu()
    expect(useMobileNavStore.getState().isMoreMenuOpen).toBe(true)
    expect(useMobileNavStore.getState().isAddMenuOpen).toBe(false)
    expect(useMobileNavStore.getState().activeDropdown).toBe('more')
  })

  it('should close all dropdowns', () => {
    const { openAddMenu, closeAllDropdowns } = useMobileNavStore.getState()
    
    // Open add menu
    openAddMenu()
    expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
    expect(useMobileNavStore.getState().activeDropdown).toBe('add')
    
    // Close all
    closeAllDropdowns()
    expect(useMobileNavStore.getState().isAddMenuOpen).toBe(false)
    expect(useMobileNavStore.getState().isMoreMenuOpen).toBe(false)
    expect(useMobileNavStore.getState().activeDropdown).toBe('none')
  })

  it('should close individual menus', () => {
    const { openAddMenu, closeAddMenu, openMoreMenu, closeMoreMenu } = useMobileNavStore.getState()
    
    // Test add menu
    openAddMenu()
    expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
    closeAddMenu()
    expect(useMobileNavStore.getState().isAddMenuOpen).toBe(false)
    expect(useMobileNavStore.getState().activeDropdown).toBe('none')
    
    // Test more menu
    openMoreMenu()
    expect(useMobileNavStore.getState().isMoreMenuOpen).toBe(true)
    closeMoreMenu()
    expect(useMobileNavStore.getState().isMoreMenuOpen).toBe(false)
    expect(useMobileNavStore.getState().activeDropdown).toBe('none')
  })
})