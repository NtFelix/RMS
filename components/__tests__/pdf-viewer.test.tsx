import { render, screen } from '@testing-library/react'
import { PDFViewer } from '../pdf-viewer'

// Mock PDF.js dynamic import
jest.mock('pdfjs-dist', () => ({
  __esModule: true,
  default: {
    GlobalWorkerOptions: {
      workerSrc: ''
    },
    getDocument: jest.fn(() => ({
      promise: Promise.resolve({
        numPages: 3,
        getPage: jest.fn(() => Promise.resolve({
          getViewport: jest.fn(() => ({ width: 800, height: 600 })),
          render: jest.fn(() => ({ promise: Promise.resolve() }))
        })),
        destroy: jest.fn()
      })
    })),
    version: '5.4.54'
  },
  GlobalWorkerOptions: {
    workerSrc: ''
  },
  getDocument: jest.fn(() => ({
    promise: Promise.resolve({
      numPages: 3,
      getPage: jest.fn(() => Promise.resolve({
        getViewport: jest.fn(() => ({ width: 800, height: 600 })),
        render: jest.fn(() => ({ promise: Promise.resolve() }))
      })),
      destroy: jest.fn()
    })
  })),
  version: '5.4.54'
}))

// Mock canvas context
const mockGetContext = jest.fn(() => ({
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  drawImage: jest.fn(),
}))

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockGetContext,
})

describe('PDFViewer', () => {
  const defaultProps = {
    fileUrl: 'https://example.com/test.pdf',
    fileName: 'test.pdf',
    onDownload: jest.fn(),
    onError: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(<PDFViewer {...defaultProps} />)
    
    expect(screen.getByText('Lade PDF...')).toBeInTheDocument()
  })

  it('renders PDF viewer controls', async () => {
    render(<PDFViewer {...defaultProps} />)
    
    // Wait for loading to complete by looking for download text
    await screen.findByText('Download')
    
    // Check for navigation controls
    expect(screen.getByText('Download')).toBeInTheDocument()
    expect(screen.getByText('von 3')).toBeInTheDocument()
  })

  it('calls onDownload when download button is clicked', async () => {
    const onDownload = jest.fn()
    render(<PDFViewer {...defaultProps} onDownload={onDownload} />)
    
    // Wait for loading to complete and click download
    const downloadButton = await screen.findByText('Download')
    downloadButton.click()
    
    expect(onDownload).toHaveBeenCalled()
  })

  it('displays file name in status bar', async () => {
    render(<PDFViewer {...defaultProps} />)
    
    // Wait for component to load
    await screen.findByText('test.pdf')
    
    expect(screen.getByText('test.pdf')).toBeInTheDocument()
  })
})