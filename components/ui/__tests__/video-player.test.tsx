import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VideoPlayer } from '../video-player'

// Mock navigator.userAgent for mobile detection
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})

// Mock HTMLVideoElement methods
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: jest.fn().mockImplementation(() => Promise.resolve())
})

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: jest.fn()
})

Object.defineProperty(HTMLVideoElement.prototype, 'load', {
  writable: true,
  value: jest.fn()
})

describe('VideoPlayer', () => {
  const mockSrc = 'https://example.com/video.mp4'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders video element with correct attributes', () => {
    render(<VideoPlayer src={mockSrc} />)
    
    const video = document.querySelector('video')
    expect(video).toBeInTheDocument()
    expect(video).toHaveAttribute('src', mockSrc)
    expect(video).toHaveProperty('muted', true)
    expect(video).toHaveProperty('loop', true)
    expect(video).toHaveAttribute('playsinline')
  })

  it('does not show loading state initially with streaming', () => {
    render(<VideoPlayer src={mockSrc} />)
    
    // With preload="none", no loading state should show initially
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows play button when not autoplaying', async () => {
    render(<VideoPlayer src={mockSrc} autoplay={false} />)
    
    // With streaming, play button should be visible immediately
    await waitFor(() => {
      expect(screen.getByLabelText('Play video')).toBeInTheDocument()
    })
  })

  it('toggles play/pause when clicking controls', async () => {
    const mockPlay = jest.fn().mockResolvedValue(undefined)
    const mockPause = jest.fn()
    
    HTMLVideoElement.prototype.play = mockPlay
    HTMLVideoElement.prototype.pause = mockPause
    
    render(<VideoPlayer src={mockSrc} autoplay={false} />)
    
    // Simulate video loaded
    const video = document.querySelector('video')!
    fireEvent.loadedData(video)
    
    await waitFor(() => {
      const playButton = screen.getByLabelText('Play video')
      fireEvent.click(playButton)
      expect(mockPlay).toHaveBeenCalled()
    })
  })

  it('shows poster fallback on error when enabled', async () => {
    render(<VideoPlayer src={mockSrc} showPosterFallback={true} />)
    
    const video = document.querySelector('video')!
    fireEvent.error(video)
    
    await waitFor(() => {
      expect(screen.getByText('Demo Video')).toBeInTheDocument()
    })
  })

  it('uses low quality source when provided and on mobile', () => {
    // Mock mobile user agent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
    })

    const lowQualitySrc = 'https://example.com/video-low.mp4'
    render(<VideoPlayer src={mockSrc} srcLowQuality={lowQualitySrc} />)
    
    const video = document.querySelector('video')!
    expect(video).toHaveAttribute('src', lowQualitySrc)
  })

  it('uses metadata preload on desktop', () => {
    // Mock desktop user agent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })

    render(<VideoPlayer src={mockSrc} />)
    
    const video = document.querySelector('video')!
    expect(video).toHaveAttribute('preload', 'metadata')
  })

  it('uses none preload on mobile', () => {
    // Mock mobile user agent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
    })

    render(<VideoPlayer src={mockSrc} />)
    
    const video = document.querySelector('video')!
    expect(video).toHaveAttribute('preload', 'none')
  })

  it('shows buffering state when video is waiting', async () => {
    render(<VideoPlayer src={mockSrc} />)
    
    const video = document.querySelector('video')!
    fireEvent.waiting(video)
    
    await waitFor(() => {
      expect(screen.getByText('Buffering...')).toBeInTheDocument()
    })
  })

  it('auto-loads on desktop after delay', async () => {
    // Mock desktop user agent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })

    const mockLoad = jest.fn()
    HTMLVideoElement.prototype.load = mockLoad

    render(<VideoPlayer src={mockSrc} />)
    
    // Wait for the auto-load to trigger (1 second delay + some buffer)
    await waitFor(() => {
      expect(mockLoad).toHaveBeenCalled()
    }, { timeout: 2000 })
  })
})