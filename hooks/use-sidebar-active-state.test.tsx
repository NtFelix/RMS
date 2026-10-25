import { act, renderHook } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { useActiveStateStore, useSidebarActiveState } from '@/hooks/use-active-state-manager'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

// The sidebar highlight must change in the render that sees the new pathname. If it waited for the store (which is
// updated in an effect), the old item would be painted for a frame after every navigation.
describe('useSidebarActiveState', () => {
  beforeEach(() => {
    useActiveStateStore.getState().reset()
  })

  it('marks the current route active on the very first render', () => {
    mockUsePathname.mockReturnValue('/mieter')
    const seen: boolean[] = []

    renderHook(() => {
      const result = useSidebarActiveState()
      seen.push(result.isRouteActive('/mieter'))
      return result
    })

    expect(seen[0]).toBe(true)
  })

  it('never renders the previous route as active after the pathname changed', () => {
    mockUsePathname.mockReturnValue('/haeuser')
    const seen: { mieter: boolean; haeuser: boolean }[] = []
    const { rerender } = renderHook(() => {
      const result = useSidebarActiveState()
      seen.push({ mieter: result.isRouteActive('/mieter'), haeuser: result.isRouteActive('/haeuser') })
      return result
    })
    seen.length = 0

    mockUsePathname.mockReturnValue('/mieter')
    rerender()

    expect(seen.length).toBeGreaterThan(0)
    seen.forEach((frame) => expect(frame).toEqual({ mieter: true, haeuser: false }))
  })

  it('matches nested routes and gives the active and inactive classes', () => {
    mockUsePathname.mockReturnValue('/dateien/some-folder')

    const { result } = renderHook(() => useSidebarActiveState())

    expect(result.current.isRouteActive('/dateien')).toBe(true)
    expect(result.current.isRouteActive('/dat')).toBe(false)
    expect(result.current.getActiveStateClasses('/dateien')).toBe('bg-accent text-accent-foreground')
    expect(result.current.getActiveStateClasses('/mieter')).toBe('text-muted-foreground')
  })

  it('does not re-render when the store is written, as it happens after every navigation', () => {
    mockUsePathname.mockReturnValue('/mieter')
    let renders = 0
    renderHook(() => {
      renders += 1
      return useSidebarActiveState()
    })
    const rendersAfterMount = renders

    act(() => {
      useActiveStateStore.getState().updateActiveDirectory('/dateien/some-folder')
      useActiveStateStore.getState().updateActiveRoute('/haeuser')
    })

    expect(renders).toBe(rendersAfterMount)
  })

  it('keeps the store in sync with the pathname and derives the route fields from it', () => {
    mockUsePathname.mockReturnValue('/dateien/some-folder')

    const { result } = renderHook(() => useSidebarActiveState())

    expect(result.current.currentRoute).toBe('/dateien/some-folder')
    expect(result.current.isCloudStorageActive).toBe(true)
    expect(useActiveStateStore.getState().activeState.currentRoute).toBe('/dateien/some-folder')
  })
})
