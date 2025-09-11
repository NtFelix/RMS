import { render, screen } from '@testing-library/react'
import { TemplatesLoadingSkeleton, TemplateOperationLoading } from '@/components/templates-loading-skeleton'

describe('TemplatesLoadingSkeleton', () => {
  describe('Basic Rendering', () => {
    it('should render default number of skeleton cards', () => {
      render(<TemplatesLoadingSkeleton />)

      // Default should be 8 skeleton cards
      const skeletonCards = screen.getAllByTestId(/skeleton-card-\d+/)
      expect(skeletonCards).toHaveLength(8)
    })

    it('should render custom number of skeleton cards', () => {
      render(<TemplatesLoadingSkeleton count={12} />)

      const skeletonCards = screen.getAllByTestId(/skeleton-card-\d+/)
      expect(skeletonCards).toHaveLength(12)
    })

    it('should render with category headers when showCategories is true', () => {
      render(<TemplatesLoadingSkeleton showCategories={true} />)

      // Should show category skeleton headers
      const categorySkeletons = screen.getAllByTestId(/skeleton-category-\d+/)
      expect(categorySkeletons.length).toBeGreaterThan(0)
    })

    it('should not render category headers when showCategories is false', () => {
      render(<TemplatesLoadingSkeleton showCategories={false} />)

      // Should not show category skeleton headers
      const categorySkeletons = screen.queryAllByTestId(/skeleton-category-\d+/)
      expect(categorySkeletons).toHaveLength(0)
    })
  })

  describe('Skeleton Structure', () => {
    it('should have proper skeleton card structure', () => {
      render(<TemplatesLoadingSkeleton count={1} />)

      const skeletonCard = screen.getByTestId('skeleton-card-0')
      
      // Should have card structure
      expect(skeletonCard).toHaveClass('animate-pulse')
      
      // Should have header, content, and footer sections
      const header = skeletonCard.querySelector('[data-testid="skeleton-header"]')
      const content = skeletonCard.querySelector('[data-testid="skeleton-content"]')
      const footer = skeletonCard.querySelector('[data-testid="skeleton-footer"]')
      
      expect(header).toBeInTheDocument()
      expect(content).toBeInTheDocument()
      expect(footer).toBeInTheDocument()
    })

    it('should have proper skeleton elements in header', () => {
      render(<TemplatesLoadingSkeleton count={1} />)

      const skeletonCard = screen.getByTestId('skeleton-card-0')
      const header = skeletonCard.querySelector('[data-testid="skeleton-header"]')
      
      // Should have title and badge skeletons
      const titleSkeleton = header?.querySelector('[data-testid="skeleton-title"]')
      const badgeSkeleton = header?.querySelector('[data-testid="skeleton-badge"]')
      
      expect(titleSkeleton).toBeInTheDocument()
      expect(badgeSkeleton).toBeInTheDocument()
    })

    it('should have proper skeleton elements in content', () => {
      render(<TemplatesLoadingSkeleton count={1} />)

      const skeletonCard = screen.getByTestId('skeleton-card-0')
      const content = skeletonCard.querySelector('[data-testid="skeleton-content"]')
      
      // Should have multiple content lines
      const contentLines = content?.querySelectorAll('[data-testid^="skeleton-line"]')
      expect(contentLines?.length).toBeGreaterThan(0)
    })

    it('should have proper skeleton elements in footer', () => {
      render(<TemplatesLoadingSkeleton count={1} />)

      const skeletonCard = screen.getByTestId('skeleton-card-0')
      const footer = skeletonCard.querySelector('[data-testid="skeleton-footer"]')
      
      // Should have button skeleton
      const buttonSkeleton = footer?.querySelector('[data-testid="skeleton-button"]')
      expect(buttonSkeleton).toBeInTheDocument()
    })
  })

  describe('Category Skeletons', () => {
    it('should render category header skeletons', () => {
      render(<TemplatesLoadingSkeleton showCategories={true} count={8} />)

      const categorySkeletons = screen.getAllByTestId(/skeleton-category-\d+/)
      
      categorySkeletons.forEach(categorySkeleton => {
        expect(categorySkeleton).toHaveClass('animate-pulse')
        
        // Should have category title and count skeletons
        const titleSkeleton = categorySkeleton.querySelector('[data-testid="skeleton-category-title"]')
        const countSkeleton = categorySkeleton.querySelector('[data-testid="skeleton-category-count"]')
        
        expect(titleSkeleton).toBeInTheDocument()
        expect(countSkeleton).toBeInTheDocument()
      })
    })

    it('should group skeleton cards under category headers', () => {
      render(<TemplatesLoadingSkeleton showCategories={true} count={8} />)

      // Should have category sections
      const categorySections = screen.getAllByTestId(/skeleton-category-section-\d+/)
      expect(categorySections.length).toBeGreaterThan(0)

      // Each section should contain skeleton cards
      categorySections.forEach(section => {
        const cardsInSection = section.querySelectorAll('[data-testid^="skeleton-card"]')
        expect(cardsInSection.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive grid classes', () => {
      render(<TemplatesLoadingSkeleton />)

      const gridContainer = screen.getByTestId('skeleton-grid')
      expect(gridContainer).toHaveClass(
        'grid',
        'grid-cols-1',
        'md:grid-cols-2',
        'lg:grid-cols-3',
        'xl:grid-cols-4',
        'gap-4'
      )
    })

    it('should maintain proper spacing', () => {
      render(<TemplatesLoadingSkeleton showCategories={true} />)

      const mainContainer = screen.getByTestId('skeleton-container')
      expect(mainContainer).toHaveClass('space-y-8')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for loading state', () => {
      render(<TemplatesLoadingSkeleton />)

      const loadingRegion = screen.getByRole('status')
      expect(loadingRegion).toHaveAttribute('aria-label', 'Vorlagen werden geladen')
    })

    it('should announce loading state for screen readers', () => {
      render(<TemplatesLoadingSkeleton />)

      expect(screen.getByText('Vorlagen werden geladen...')).toBeInTheDocument()
    })

    it('should have proper aria-hidden for decorative elements', () => {
      render(<TemplatesLoadingSkeleton count={1} />)

      const skeletonElements = screen.getAllByTestId(/skeleton-/)
      skeletonElements.forEach(element => {
        // Decorative skeleton elements should be hidden from screen readers
        if (!element.hasAttribute('role')) {
          expect(element).toHaveAttribute('aria-hidden', 'true')
        }
      })
    })
  })

  describe('Animation', () => {
    it('should have pulse animation on skeleton elements', () => {
      render(<TemplatesLoadingSkeleton count={1} />)

      const skeletonCard = screen.getByTestId('skeleton-card-0')
      expect(skeletonCard).toHaveClass('animate-pulse')
    })

    it('should have consistent animation timing', () => {
      render(<TemplatesLoadingSkeleton count={3} />)

      const skeletonCards = screen.getAllByTestId(/skeleton-card-\d+/)
      
      skeletonCards.forEach(card => {
        expect(card).toHaveClass('animate-pulse')
      })
    })
  })

  describe('Performance', () => {
    it('should handle large numbers of skeleton cards efficiently', () => {
      const startTime = performance.now()
      
      render(<TemplatesLoadingSkeleton count={100} />)
      
      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(100)

      // Should render all skeleton cards
      const skeletonCards = screen.getAllByTestId(/skeleton-card-\d+/)
      expect(skeletonCards).toHaveLength(100)
    })
  })
})

describe('TemplateOperationLoading', () => {
  describe('Basic Rendering', () => {
    it('should render operation loading with default message', () => {
      render(<TemplateOperationLoading operation="save" />)

      expect(screen.getByText(/wird gespeichert/i)).toBeInTheDocument()
    })

    it('should render operation loading with template name', () => {
      render(
        <TemplateOperationLoading 
          operation="delete" 
          templateName="Test Template"
        />
      )

      expect(screen.getByText(/test template.*wird gelöscht/i)).toBeInTheDocument()
    })

    it('should render different operations correctly', () => {
      const operations = [
        { operation: 'save', expectedText: /wird gespeichert/i },
        { operation: 'delete', expectedText: /wird gelöscht/i },
        { operation: 'create', expectedText: /wird erstellt/i },
        { operation: 'load', expectedText: /wird geladen/i },
      ] as const

      operations.forEach(({ operation, expectedText }) => {
        const { unmount } = render(
          <TemplateOperationLoading operation={operation} />
        )

        expect(screen.getByText(expectedText)).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('Loading Indicators', () => {
    it('should show loading spinner', () => {
      render(<TemplateOperationLoading operation="save" />)

      const spinner = screen.getByTestId('loading-spinner')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('animate-spin')
    })

    it('should have proper loading animation', () => {
      render(<TemplateOperationLoading operation="save" />)

      const loadingContainer = screen.getByTestId('operation-loading')
      expect(loadingContainer).toHaveClass('animate-pulse')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<TemplateOperationLoading operation="save" />)

      const loadingRegion = screen.getByRole('status')
      expect(loadingRegion).toHaveAttribute('aria-live', 'polite')
    })

    it('should announce operation status for screen readers', () => {
      render(
        <TemplateOperationLoading 
          operation="delete" 
          templateName="Test Template"
        />
      )

      const announcement = screen.getByText(/test template.*wird gelöscht/i)
      expect(announcement).toBeInTheDocument()
    })

    it('should have proper loading description', () => {
      render(<TemplateOperationLoading operation="save" />)

      const loadingRegion = screen.getByRole('status')
      expect(loadingRegion).toHaveAttribute('aria-describedby')
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(
        <TemplateOperationLoading 
          operation="save" 
          className="custom-loading-class"
        />
      )

      const loadingContainer = screen.getByTestId('operation-loading')
      expect(loadingContainer).toHaveClass('custom-loading-class')
    })

    it('should have proper default styling', () => {
      render(<TemplateOperationLoading operation="save" />)

      const loadingContainer = screen.getByTestId('operation-loading')
      expect(loadingContainer).toHaveClass(
        'flex',
        'items-center',
        'justify-center',
        'p-4'
      )
    })
  })

  describe('Operation Types', () => {
    it('should handle unknown operations gracefully', () => {
      render(<TemplateOperationLoading operation="unknown" as any />)

      // Should show generic loading message
      expect(screen.getByText(/wird verarbeitet/i)).toBeInTheDocument()
    })

    it('should handle empty template name', () => {
      render(
        <TemplateOperationLoading 
          operation="delete" 
          templateName=""
        />
      )

      expect(screen.getByText(/wird gelöscht/i)).toBeInTheDocument()
    })

    it('should handle long template names', () => {
      const longName = 'Very Long Template Name That Might Cause Layout Issues'
      
      render(
        <TemplateOperationLoading 
          operation="save" 
          templateName={longName}
        />
      )

      expect(screen.getByText(new RegExp(longName, 'i'))).toBeInTheDocument()
    })
  })

  describe('Internationalization', () => {
    it('should use German text for operations', () => {
      const germanTexts = [
        { operation: 'save', text: 'gespeichert' },
        { operation: 'delete', text: 'gelöscht' },
        { operation: 'create', text: 'erstellt' },
        { operation: 'load', text: 'geladen' },
      ] as const

      germanTexts.forEach(({ operation, text }) => {
        const { unmount } = render(
          <TemplateOperationLoading operation={operation} />
        )

        expect(screen.getByText(new RegExp(text, 'i'))).toBeInTheDocument()
        unmount()
      })
    })
  })
})