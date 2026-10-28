import { act, renderHook } from '@testing-library/react'
import { useMediaQuery } from '@/hooks/use-media-query'

function mockMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<() => void>()
  window.matchMedia = jest.fn().mockImplementation(() => ({
    get matches() {
      return matches
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }))
  return {
    set(next: boolean) {
      matches = next
      listeners.forEach((listener) => listener())
    },
    listenerCount: () => listeners.size,
  }
}

describe('useMediaQuery', () => {
  it('returns the real value on the first client render, not false', () => {
    mockMatchMedia(true)
    const seen: boolean[] = []

    renderHook(() => {
      const matches = useMediaQuery('(max-width: 767px)')
      seen.push(matches)
      return matches
    })

    expect(seen[0]).toBe(true)
  })

  it('follows changes of the query and unsubscribes on unmount', () => {
    const media = mockMatchMedia(false)
    const { result, unmount } = renderHook(() => useMediaQuery('(max-width: 767px)'))
    expect(result.current).toBe(false)

    act(() => media.set(true))
    expect(result.current).toBe(true)

    unmount()
    expect(media.listenerCount()).toBe(0)
  })
})
