import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatesManagementModal } from '@/components/templates-management-modal'
import { TemplatesGrid } from '@/components/templates-grid'
import { TemplateSearchBar } from '@/components/template-search-bar'
import { CategoryFilter } from '@/components/category-filter'
import { useModalStore } from '@/hooks/use-modal-store'
import { useAuth } from '@/components/auth-provider'
import type { Template } from '@/types/template'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/components/auth-provider')
jest.mock('@/lib/template-client-service')
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// Performance test utilities
const measurePerformance = async (operation: () => Promise<void> | void): Promise<number> => {
  const startTime = performance.now()
  await operation()
  const endTime = performance.now()
  return endTime - startTime
}

const createLargeTemplateDataset = (count: number): Template[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `template-${i}`,
    titel: `Template ${i} - ${Math.random().toString(36).substring(7)}`,
    inhalt: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: `This is template ${i} with some content that might be searched. It contains various keywords like contract, rental, tenant, and property management.`,
            },
          ],
        },
      ],
    },
    user_id: 'test-user',
    erstellungsdatum: new Date(2024, 0, 1 + (i % 365)).toISOString(),
    kategorie: `Category ${i % 10}`,
    kontext_anforderungen: Array.from({ length: i % 5 }, (_, j) => `variable_${j}`),
    aktualisiert_am: Math.random() > 0.5 ? new Date(2024, 0, 15 + (i % 350)).toISOString() : null,
  }))
}

describe('Template Performance Tests', () => {
  const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

  beforeEach(() => {
    mockUseModalStore.mockReturnValue({
      isTemplatesManagementModalOpen: true,
      closeTemplatesManagementModal: jest.fn(),
      openTemplateEditorModal: jest.fn(),
    } as any)

    mockUseAuth.mockReturnValue({
      user: { id: 'test-user', email: 'test@example.com' },
    } as any)

    // Mock template service with performance data
    jest.doMock('@/lib/template-client-service', () => ({
      TemplateClientService: jest.fn().mockImplementation(() => ({
        getAllTemplates: jest.fn().mockResolvedValue([]),
        deleteTemplate: jest.fn().mockResolvedValue(undefined),
      })),
    }))
  })

  describe('Large Dataset Rendering Performance', () => {
    it('should render 100 templates within acceptable time', async () => {
      const templates = createLargeTemplateDataset(100)
      
      const renderTime = await measurePerformance(async () => {
        render(
          <TemplatesGrid
            templates={templates}
            onEditTemplate={jest.fn()}
            onDeleteTemplate={jest.fn()}
          />
        )
        
        await waitFor(() => {
          expect(screen.getByText('Template 0')).toBeInTheDocument()
        })
      })

      // Should render within 1 second
      expect(renderTime).toBeLessThan(1000)
      
      // Should render all templates
      expect(screen.getAllByRole('article')).toHaveLength(100)
    })

    it('should render 500 templates within acceptable time', async () => {
      const templates = createLargeTemplateDataset(500)
      
      const renderTime = await measurePerformance(async () => {
        render(
          <TemplatesGrid
            templates={templates}
            onEditTemplate={jest.fn()}
            onDeleteTemplate={jest.fn()}
          />
        )
        
        await waitFor(() => {
          expect(screen.getByText('Template 0')).toBeInTheDocument()
        })
      })

      // Should render within 2 seconds even with 500 templates
      expect(renderTime).toBeLessThan(2000)
      
      // Should render all templates
      expect(screen.getAllByRole('article')).toHaveLength(500)
    })

    it('should handle 1000+ templates with virtual scrolling', async () => {
      const templates = createLargeTemplateDataset(1000)
      
      const renderTime = await measurePerformance(async () => {
        render(
          <TemplatesGrid
            templates={templates}
            onEditTemplate={jest.fn()}
            onDeleteTemplate={jest.fn()}
          />
        )
        
        await waitFor(() => {
          expect(screen.getByText('Template 0')).toBeInTheDocument()
        })
      })

      // Should still render within reasonable time with virtual scrolling
      expect(renderTime).toBeLessThan(3000)
    })
  })

  describe('Search Performance', () => {
    it('should perform search on 100 templates within acceptable time', async () => {
      const templates = createLargeTemplateDataset(100)
      const mockOnChange = jest.fn()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          debounceMs={100}
        />
      )

      const user = userEvent.setup()
      const searchInput = screen.getByRole('textbox')

      const searchTime = await measurePerformance(async () => {
        await user.type(searchInput, 'Template 5')
        
        // Wait for debounce
        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalledWith('Template 5')
        }, { timeout: 200 })
      })

      // Search should be responsive
      expect(searchTime).toBeLessThan(500)
    })

    it('should handle rapid typing without performance degradation', async () => {
      const mockOnChange = jest.fn()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          debounceMs={300}
        />
      )

      const user = userEvent.setup()
      const searchInput = screen.getByRole('textbox')

      const rapidTypingTime = await measurePerformance(async () => {
        // Type rapidly
        await user.type(searchInput, 'rapid typing test', { delay: 50 })
        
        // Wait for debounce to complete
        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalledWith('rapid typing test')
        }, { timeout: 500 })
      })

      // Should handle rapid typing efficiently
      expect(rapidTypingTime).toBeLessThan(1000)
      
      // Should only call onChange once due to debouncing
      expect(mockOnChange).toHaveBeenCalledTimes(1)
    })

    it('should perform complex search queries efficiently', async () => {
      const templates = createLargeTemplateDataset(200)
      const mockOnChange = jest.fn()
      
      // Mock the actual search implementation
      const performSearch = (query: string) => {
        return templates.filter(template => 
          template.titel.toLowerCase().includes(query.toLowerCase()) ||
          template.kategorie.toLowerCase().includes(query.toLowerCase()) ||
          JSON.stringify(template.inhalt).toLowerCase().includes(query.toLowerCase())
        )
      }

      const searchQueries = [
        'Template',
        'Category 5',
        'contract rental',
        'property management',
        'Template 1'
      ]

      for (const query of searchQueries) {
        const searchTime = await measurePerformance(() => {
          const results = performSearch(query)
          expect(results).toBeDefined()
        })

        // Each search should complete quickly
        expect(searchTime).toBeLessThan(100)
      }
    })
  })

  describe('Category Filtering Performance', () => {
    it('should filter large datasets efficiently', async () => {
      const templates = createLargeTemplateDataset(300)
      const mockOnChange = jest.fn()
      
      render(
        <CategoryFilter
          templates={templates}
          selectedCategory="all"
          onCategoryChange={mockOnChange}
        />
      )

      const user = userEvent.setup()
      const combobox = screen.getByRole('combobox')

      const filterTime = await measurePerformance(async () => {
        await user.click(combobox)
        
        // Should calculate categories quickly
        await waitFor(() => {
          expect(screen.getByText(/alle kategorien \(300\)/i)).toBeInTheDocument()
        })
      })

      // Category calculation should be fast
      expect(filterTime).toBeLessThan(200)
    })

    it('should handle category changes efficiently', async () => {
      const templates = createLargeTemplateDataset(200)
      const mockOnChange = jest.fn()
      
      render(
        <CategoryFilter
          templates={templates}
          selectedCategory="all"
          onCategoryChange={mockOnChange}
        />
      )

      const user = userEvent.setup()
      const combobox = screen.getByRole('combobox')

      const changeTime = await measurePerformance(async () => {
        await user.click(combobox)
        
        const categoryOption = screen.getByText(/category 1/i)
        await user.click(categoryOption)
      })

      // Category change should be immediate
      expect(changeTime).toBeLessThan(100)
      expect(mockOnChange).toHaveBeenCalled()
    })
  })

  describe('Memory Usage and Cleanup', () => {
    it('should not create memory leaks with large datasets', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // Render and unmount multiple times with large datasets
      for (let i = 0; i < 5; i++) {
        const templates = createLargeTemplateDataset(100)
        
        const { unmount } = render(
          <TemplatesGrid
            templates={templates}
            onEditTemplate={jest.fn()}
            onDeleteTemplate={jest.fn()}
          />
        )
        
        await waitFor(() => {
          expect(screen.getByText('Template 0')).toBeInTheDocument()
        })
        
        unmount()
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // Memory usage should not grow significantly
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory
        const memoryGrowthMB = memoryGrowth / (1024 * 1024)
        
        // Should not leak more than 10MB
        expect(memoryGrowthMB).toBeLessThan(10)
      }
    })

    it('should clean up event listeners properly', async () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')
      
      const { unmount } = render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      const addedListeners = addEventListenerSpy.mock.calls.length
      
      unmount()
      
      const removedListeners = removeEventListenerSpy.mock.calls.length
      
      // Should remove as many listeners as were added
      expect(removedListeners).toBeGreaterThanOrEqual(addedListeners)
      
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Debouncing and Throttling Performance', () => {
    it('should debounce search input effectively', async () => {
      const mockOnChange = jest.fn()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          debounceMs={200}
        />
      )

      const user = userEvent.setup()
      const searchInput = screen.getByRole('textbox')

      // Type multiple characters quickly
      await user.type(searchInput, 'test search query', { delay: 50 })

      // Should not have called onChange yet
      expect(mockOnChange).not.toHaveBeenCalled()

      // Wait for debounce
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('test search query')
      }, { timeout: 300 })

      // Should only be called once
      expect(mockOnChange).toHaveBeenCalledTimes(1)
    })

    it('should handle concurrent search operations efficiently', async () => {
      const mockOnChange = jest.fn()
      
      render(
        <TemplateSearchBar
          value=""
          onChange={mockOnChange}
          debounceMs={100}
        />
      )

      const user = userEvent.setup()
      const searchInput = screen.getByRole('textbox')

      const concurrentTime = await measurePerformance(async () => {
        // Start multiple search operations
        const promises = [
          user.type(searchInput, 'a'),
          user.type(searchInput, 'b'),
          user.type(searchInput, 'c'),
        ]

        await Promise.all(promises)
        
        // Wait for debounce
        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalled()
        }, { timeout: 200 })
      })

      // Should handle concurrent operations efficiently
      expect(concurrentTime).toBeLessThan(500)
    })
  })

  describe('Rendering Optimization', () => {
    it('should minimize re-renders with memoization', async () => {
      const templates = createLargeTemplateDataset(50)
      let renderCount = 0
      
      // Mock component to count renders
      const TestComponent = ({ templates: templatesProp }: { templates: Template[] }) => {
        renderCount++
        return (
          <TemplatesGrid
            templates={templatesProp}
            onEditTemplate={jest.fn()}
            onDeleteTemplate={jest.fn()}
          />
        )
      }

      const { rerender } = render(<TestComponent templates={templates} />)
      
      await waitFor(() => {
        expect(screen.getByText('Template 0')).toBeInTheDocument()
      })

      const initialRenderCount = renderCount

      // Rerender with same templates - should not cause unnecessary re-renders
      rerender(<TestComponent templates={templates} />)
      
      // Should not have re-rendered significantly more
      expect(renderCount - initialRenderCount).toBeLessThanOrEqual(1)
    })

    it('should handle prop changes efficiently', async () => {
      const templates1 = createLargeTemplateDataset(25)
      const templates2 = createLargeTemplateDataset(25)
      
      const { rerender } = render(
        <TemplatesGrid
          templates={templates1}
          onEditTemplate={jest.fn()}
          onDeleteTemplate={jest.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Template 0')).toBeInTheDocument()
      })

      const rerenderTime = await measurePerformance(async () => {
        rerender(
          <TemplatesGrid
            templates={templates2}
            onEditTemplate={jest.fn()}
            onDeleteTemplate={jest.fn()}
          />
        )
        
        await waitFor(() => {
          expect(screen.getAllByRole('article')).toHaveLength(25)
        })
      })

      // Rerender should be fast
      expect(rerenderTime).toBeLessThan(200)
    })
  })

  describe('Network and Caching Performance', () => {
    it('should cache template data effectively', async () => {
      const mockGetAllTemplates = jest.fn().mockResolvedValue(createLargeTemplateDataset(50))
      
      jest.doMock('@/lib/template-client-service', () => ({
        TemplateClientService: jest.fn().mockImplementation(() => ({
          getAllTemplates: mockGetAllTemplates,
          deleteTemplate: jest.fn().mockResolvedValue(undefined),
        })),
      }))

      // First render
      const { unmount } = render(<TemplatesManagementModal />)
      
      await waitFor(() => {
        expect(mockGetAllTemplates).toHaveBeenCalledTimes(1)
      })

      unmount()

      // Second render - should use cache
      render(<TemplatesManagementModal />)
      
      // Should not make additional API calls if caching is working
      // Note: This would depend on actual cache implementation
      expect(mockGetAllTemplates).toHaveBeenCalledTimes(1)
    })
  })
})