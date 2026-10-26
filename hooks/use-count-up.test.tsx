import { act, render, renderHook, screen } from '@testing-library/react'
import { useCountUp } from '@/hooks/use-count-up'
import { StatCard } from '@/components/common/stat-card'
import { SummaryCard } from '@/components/common/summary-card'

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }))
}

// Drives requestAnimationFrame by hand: each call advances the clock and runs the queued callbacks.
function installFakeFrames() {
  let now = 0
  let nextId = 1
  const queue = new Map<number, FrameRequestCallback>()
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    const id = nextId++
    queue.set(id, cb)
    return id
  })
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    queue.delete(id)
  })
  return (ms: number) => {
    now += ms
    const callbacks = [...queue.values()]
    queue.clear()
    act(() => callbacks.forEach((cb) => cb(now)))
  }
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('useCountUp', () => {
  it('starts at 0 and counts up to the target', () => {
    mockReducedMotion(false)
    const advance = installFakeFrames()
    const { result } = renderHook(() => useCountUp(100, { duration: 1000 }))

    expect(result.current).toBe(0)
    advance(0)
    advance(500)
    expect(result.current).toBeGreaterThan(50) // ease-out: past the halfway mark at half time
    expect(result.current).toBeLessThan(100)
    advance(600)
    expect(result.current).toBe(100)
  })

  it('counts from the last value, not from 0, when the target changes', () => {
    mockReducedMotion(false)
    const advance = installFakeFrames()
    const { result, rerender } = renderHook(({ target }) => useCountUp(target, { duration: 1000 }), {
      initialProps: { target: 100 },
    })
    advance(0)
    advance(1000)
    expect(result.current).toBe(100)

    rerender({ target: 200 })
    advance(0)
    advance(10)
    expect(result.current).toBeGreaterThanOrEqual(100)
    expect(result.current).toBeLessThan(200)
  })

  it('stays at 0 while disabled and starts once enabled', () => {
    mockReducedMotion(false)
    const advance = installFakeFrames()
    const { result, rerender } = renderHook(({ enabled }) => useCountUp(50, { duration: 1000, enabled }), {
      initialProps: { enabled: false },
    })
    advance(0)
    advance(2000)
    expect(result.current).toBe(0)

    rerender({ enabled: true })
    advance(0)
    advance(1000)
    expect(result.current).toBe(50)
  })

  it('jumps to the target when reduced motion is preferred', () => {
    mockReducedMotion(true)
    const { result } = renderHook(() => useCountUp(42))
    expect(result.current).toBe(42)
  })

  it('counts faster the second time the same memoryKey is shown', () => {
    mockReducedMotion(false)
    const advance = installFakeFrames()

    const first = renderHook(() => useCountUp(100, { memoryKey: 'repeat-test' }))
    advance(0)
    advance(450)
    expect(first.result.current).toBeLessThan(100) // first visit: 900 ms, not done at 450 ms
    advance(500)
    expect(first.result.current).toBe(100)
    first.unmount()

    const second = renderHook(() => useCountUp(100, { memoryKey: 'repeat-test' }))
    advance(0)
    advance(450)
    expect(second.result.current).toBe(100) // repeat visit: done after 450 ms
  })

  it('keeps the full length for a memoryKey it has not seen', () => {
    mockReducedMotion(false)
    const advance = installFakeFrames()
    const { result } = renderHook(() => useCountUp(100, { memoryKey: 'unseen-key' }))
    advance(0)
    advance(450)
    expect(result.current).toBeLessThan(100)
  })

  it('does not remember a count that was interrupted before it finished', () => {
    mockReducedMotion(false)
    const advance = installFakeFrames()
    const interrupted = renderHook(() => useCountUp(100, { memoryKey: 'interrupted-key' }))
    advance(0)
    advance(300)
    interrupted.unmount()

    const again = renderHook(() => useCountUp(100, { memoryKey: 'interrupted-key' }))
    advance(0)
    advance(450)
    expect(again.result.current).toBeLessThan(100)
  })

  it('cancels the pending frame on unmount', () => {
    mockReducedMotion(false)
    installFakeFrames()
    const { unmount } = renderHook(() => useCountUp(10))
    unmount()
    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })
})

describe('StatCard count-up', () => {
  it('counts a number up and ends on the formatted value', () => {
    mockReducedMotion(false)
    const advance = installFakeFrames()
    render(<StatCard title="Miete" value={1234.5} unit="€" decimals icon={null} />)

    expect(screen.getByText('0,00 €')).toBeInTheDocument()
    advance(0)
    advance(5000)
    expect(screen.getByText('1.234,50 €')).toBeInTheDocument()
  })

  it('counts every integer of a "a / b" value', () => {
    mockReducedMotion(false)
    const advance = installFakeFrames()
    render(<StatCard title="Aktiv / Ehemalig" value="12 / 3" icon={null} />)

    expect(screen.getByText('0 / 0')).toBeInTheDocument()
    advance(0)
    advance(5000)
    expect(screen.getByText('12 / 3')).toBeInTheDocument()
  })

  it('leaves other strings untouched', () => {
    mockReducedMotion(false)
    render(<StatCard title="Status" value="3,5 Jahre" icon={null} />)
    expect(screen.getByText('3,5 Jahre')).toBeInTheDocument()
  })

  it('renders no number while loading and counts once the data is there', () => {
    mockReducedMotion(false)
    const advance = installFakeFrames()
    const { rerender, container } = render(<StatCard title="Mieter" value="" icon={null} loading />)
    expect(container.textContent).toBe('Mieter')

    rerender(<StatCard title="Mieter" value={20} icon={null} />)
    advance(0)
    advance(5000)
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('uses tabular figures so the digits do not jitter while counting', () => {
    mockReducedMotion(true)
    render(<StatCard title="Mieter" value={5} icon={null} />)
    expect(screen.getByText('5')).toHaveClass('tabular-nums')
  })
})

describe('SummaryCard count-up', () => {
  it('counts a currency value up and keeps the hook order across the loading state', () => {
    mockReducedMotion(false)
    const advance = installFakeFrames()
    const { rerender } = render(<SummaryCard title="Einnahmen" value={0} icon={null} isLoading />)

    rerender(<SummaryCard title="Einnahmen" value={2500} icon={null} />)
    advance(0)
    advance(5000)
    expect(screen.getByText(/2\.500,00/)).toBeInTheDocument()
  })
})
