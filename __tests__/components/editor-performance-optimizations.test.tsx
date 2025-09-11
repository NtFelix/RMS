/**
 * Tests for editor performance optimizations
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import '@testing-library/jest-dom'

import { TiptapTemplateEditor } from '@/components/editor/tiptap-template-editor'
import { EditorLoadingState, InitializationProgress, PerformanceIndicator } from '@/components/editor/editor-loading-states'
import { VirtualScrollEditor, contentToVirtualItems } from '@/components/editor/virtual-scroll-editor'
import { useOptimizedEditorInitialization } from '@/hooks/use-optimized-editor-initialization'
import { usePerformanceMonitor } from '@/hooks/use-editor-performance'

// Mock TipTap editor
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
    commands: {
      setContent: jest.fn(() => true),
      insertContent: jest.fn()
    },
    getJSON: jest.fn(() => ({
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }]
    })),
    destroy: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  })),
  EditorContent: ({ editor, className }: any) => (
    <div className={className} data-testid="editor-content">
      Editor Content
    </div>
  ),
  Editor: jest.fn()
}))

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1024 * 1024 * 10 // 10MB
    }
  }
})

describe('Editor Performance Optimizations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('EditorLoadingState', () => {
    it('should render initializing state correctly', () => {
      render(
        <EditorLoadingState
          stage="initializing"
          progress={25}
          message="Editor wird geladen..."
        />
      )

      expect(screen.getByText('Editor wird initialisiert...')).toBeInTheDocument()
      expect(screen.getByText('Editor wird geladen...')).toBeInTheDocument()
    })

    it('should render parsing state with progress', () => {
      render(
        <EditorLoadingState
          stage="parsing"
          progress={50}
          showProgress={true}
        />
      )

      expect(screen.getByText('Inhalt wird verarbeitet...')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('should render error state with retry button', () => {
      const mockReload = jest.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      })

      render(
        <EditorLoadingState
          stage="error"
          error="Test error message"
        />
      )

      expect(screen.getByText('Fehler beim Laden')).toBeInTheDocument()
      expect(screen.getByText('Test error message')).toBeInTheDocument()
      
      const retryButton = screen.getByText('Seite neu laden')
      fireEvent.click(retryButton)
      expect(mockReload).toHaveBeenCalled()
    })

    it('should render ready state', () => {
      render(
        <EditorLoadingState
          stage="ready"
          message="Editor ist bereit"
        />
      )

      expect(screen.getByText('Editor bereit')).toBeInTheDocument()
      expect(screen.getByText('Editor ist bereit')).toBeInTheDocument()
    })
  })

  describe('InitializationProgress', () => {
    const mockSteps = [
      { id: 'step1', label: 'Schritt 1', completed: true },
      { id: 'step2', label: 'Schritt 2', completed: false, error: false },
      { id: 'step3', label: 'Schritt 3', completed: false, error: true }
    ]

    it('should render all steps with correct states', () => {
      render(
        <InitializationProgress
          steps={mockSteps}
          currentStep="step2"
        />
      )

      expect(screen.getByText('Schritt 1')).toBeInTheDocument()
      expect(screen.getByText('Schritt 2')).toBeInTheDocument()
      expect(screen.getByText('Schritt 3')).toBeInTheDocument()
      
      expect(screen.getByText('Fertig')).toBeInTheDocument()
      expect(screen.getByText('Aktiv')).toBeInTheDocument()
      expect(screen.getByText('Fehler')).toBeInTheDocument()
    })
  })

  describe('PerformanceIndicator', () => {
    it('should render performance metrics in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const mockMetrics = {
        initTime: 150.5,
        parseTime: 25.3,
        renderTime: 45.7,
        memoryUsage: 1024 * 1024 * 15
      }

      render(<PerformanceIndicator metrics={mockMetrics} />)

      expect(screen.getByText('Init: 150.5ms')).toBeInTheDocument()
      expect(screen.getByText('Parse: 25.3ms')).toBeInTheDocument()
      expect(screen.getByText('Render: 45.7ms')).toBeInTheDocument()
      expect(screen.getByText('Memory: 15.0MB')).toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })

    it('should not render in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const mockMetrics = {
        initTime: 150.5,
        parseTime: 25.3
      }

      const { container } = render(<PerformanceIndicator metrics={mockMetrics} />)
      expect(container.firstChild).toBeNull()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('VirtualScrollEditor', () => {
    const mockItems = [
      {
        id: 'item1',
        height: 50,
        content: <div>Item 1</div>
      },
      {
        id: 'item2',
        height: 75,
        content: <div>Item 2</div>
      },
      {
        id: 'item3',
        height: 60,
        content: <div>Item 3</div>
      }
    ]

    it('should render virtual scroll container', () => {
      render(
        <VirtualScrollEditor
          items={mockItems}
          containerHeight={200}
          itemHeight={50}
        />
      )

      // Should render the container
      const container = screen.getByRole('generic')
      expect(container).toHaveStyle({ height: '200px' })
    })

    it('should handle scroll events', async () => {
      const mockOnScroll = jest.fn()
      
      render(
        <VirtualScrollEditor
          items={mockItems}
          containerHeight={200}
          itemHeight={50}
          onScroll={mockOnScroll}
        />
      )

      const container = screen.getByRole('generic')
      
      await act(async () => {
        fireEvent.scroll(container, { target: { scrollTop: 100, scrollHeight: 300 } })
      })

      await waitFor(() => {
        expect(mockOnScroll).toHaveBeenCalledWith(100, 300)
      })
    })
  })

  describe('contentToVirtualItems', () => {
    it('should convert editor content to virtual items', () => {
      const mockContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Test Heading' }]
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Test paragraph content' }]
          }
        ]
      }

      const items = contentToVirtualItems(mockContent, 50)

      expect(items).toHaveLength(2)
      expect(items[0].id).toBe('node-0')
      expect(items[0].height).toBe(80) // Heading level 1
      expect(items[1].id).toBe('node-1')
      expect(items[1].height).toBeGreaterThan(50) // Paragraph with text
    })

    it('should handle empty content', () => {
      const items = contentToVirtualItems(null, 50)
      expect(items).toHaveLength(0)
    })

    it('should estimate heights based on content type', () => {
      const mockContent = {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 } },
          { type: 'heading', attrs: { level: 2 } },
          { type: 'heading', attrs: { level: 3 } },
          { type: 'bulletList', content: [{}, {}, {}] },
          { type: 'blockquote' },
          { type: 'codeBlock', content: [{ text: 'line1\nline2\nline3' }] }
        ]
      }

      const items = contentToVirtualItems(mockContent, 50)

      expect(items[0].height).toBe(80) // H1
      expect(items[1].height).toBe(70) // H2
      expect(items[2].height).toBe(60) // H3
      expect(items[3].height).toBe(110) // List with 3 items: 3*30+20
      expect(items[4].height).toBe(80) // Blockquote
      expect(items[5].height).toBe(100) // Code block: 3*20+40
    })
  })

  describe('TiptapTemplateEditor with optimizations', () => {
    it('should render with performance monitoring enabled', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(
        <TiptapTemplateEditor
          initialContent={{ type: 'doc', content: [] }}
          enablePerformanceMonitoring={true}
          optimizeForLargeDocuments={true}
        />
      )

      // Should show loading state initially
      await waitFor(() => {
        expect(screen.getByText(/wird geladen/i)).toBeInTheDocument()
      })

      process.env.NODE_ENV = originalEnv
    })

    it('should render with virtual scrolling enabled', async () => {
      const largeContent = {
        type: 'doc',
        content: Array.from({ length: 100 }, (_, i) => ({
          type: 'paragraph',
          content: [{ type: 'text', text: `Paragraph ${i + 1}` }]
        }))
      }

      render(
        <TiptapTemplateEditor
          initialContent={largeContent}
          enableVirtualScrolling={true}
          virtualScrollHeight={400}
          optimizeForLargeDocuments={true}
        />
      )

      // Should eventually render the editor
      await waitFor(() => {
        expect(screen.getByTestId('editor-content')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should handle deferred initialization', async () => {
      render(
        <TiptapTemplateEditor
          initialContent={{ type: 'doc', content: [] }}
          deferInitialization={true}
          optimizeForLargeDocuments={true}
        />
      )

      // Should show initialization progress
      await waitFor(() => {
        expect(screen.getByText(/wird geladen/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance monitoring hook', () => {
    it('should track render performance', () => {
      const TestComponent = () => {
        const monitor = usePerformanceMonitor('TestComponent', true)
        return <div>Render count: {monitor.renderCount}</div>
      }

      const { rerender } = render(<TestComponent />)
      expect(screen.getByText('Render count: 1')).toBeInTheDocument()

      rerender(<TestComponent />)
      expect(screen.getByText('Render count: 2')).toBeInTheDocument()
    })

    it('should record timing metrics', () => {
      const TestComponent = () => {
        const monitor = usePerformanceMonitor('TestComponent', true)
        
        React.useEffect(() => {
          monitor.recordInitTime(100)
          monitor.recordParseTime(50)
          monitor.recordRenderTime(25)
        }, [monitor])

        const metrics = monitor.getMetrics()
        return (
          <div>
            <div>Init: {metrics.initTime}</div>
            <div>Parse: {metrics.parseTime}</div>
            <div>Render: {metrics.renderTime}</div>
          </div>
        )
      }

      render(<TestComponent />)
      
      expect(screen.getByText('Init: 100')).toBeInTheDocument()
      expect(screen.getByText('Parse: 50')).toBeInTheDocument()
      expect(screen.getByText('Render: 25')).toBeInTheDocument()
    })
  })
})

describe('Integration Tests', () => {
  it('should handle complete editor initialization flow', async () => {
    const mockOnContentChange = jest.fn()
    
    render(
      <TiptapTemplateEditor
        initialContent={{
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Test content' }]
            }
          ]
        }}
        onContentChange={mockOnContentChange}
        optimizeForLargeDocuments={true}
        enablePerformanceMonitoring={true}
      />
    )

    // Should show loading initially
    expect(screen.getByText(/wird geladen/i)).toBeInTheDocument()

    // Should eventually show the editor
    await waitFor(() => {
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('should handle error recovery during initialization', async () => {
    // Mock a parsing error
    const mockContent = 'invalid json content'
    
    render(
      <TiptapTemplateEditor
        initialContent={mockContent}
        optimizeForLargeDocuments={true}
      />
    )

    // Should show error state or recovery
    await waitFor(() => {
      // Either shows error or recovers with empty content
      const hasError = screen.queryByText(/fehler/i)
      const hasEditor = screen.queryByTestId('editor-content')
      expect(hasError || hasEditor).toBeTruthy()
    }, { timeout: 3000 })
  })
})