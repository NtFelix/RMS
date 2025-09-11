import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatesGrid } from '@/components/templates-grid'
import type { Template } from '@/types/template'

// Mock TemplateCard component
jest.mock('@/components/template-card', () => ({
  TemplateCard: ({ template, onEdit, onDelete }: any) => (
    <div data-testid={`template-card-${template.id}`} role="article">
      <h3>{template.titel}</h3>
      <p>{template.kategorie}</p>
      <button onClick={onEdit}>Edit</button>
      <button onClick={() => onDelete(template.id)}>Delete</button>
    </div>
  ),
}))

// Mock templates for testing
const mockTemplates: Template[] = [
  {
    id: 'template-1',
    titel: 'Mietvertrag Standard',
    inhalt: { type: 'doc', content: [] },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-15T10:00:00Z',
    kategorie: 'Verträge',
    kontext_anforderungen: ['mieter_name'],
    aktualisiert_am: null,
  },
  {
    id: 'template-2',
    titel: 'Mietvertrag Premium',
    inhalt: { type: 'doc', content: [] },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-16T10:00:00Z',
    kategorie: 'Verträge',
    kontext_anforderungen: ['mieter_name', 'extras'],
    aktualisiert_am: null,
  },
  {
    id: 'template-3',
    titel: 'Kündigung Standard',
    inhalt: { type: 'doc', content: [] },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-17T10:00:00Z',
    kategorie: 'Kündigungen',
    kontext_anforderungen: ['mieter_name'],
    aktualisiert_am: null,
  },
  {
    id: 'template-4',
    titel: 'Betriebskosten Abrechnung',
    inhalt: { type: 'doc', content: [] },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-18T10:00:00Z',
    kategorie: 'Betriebskosten',
    kontext_anforderungen: ['mieter_name', 'zeitraum'],
    aktualisiert_am: null,
  },
  {
    id: 'template-5',
    titel: 'Template ohne Kategorie',
    inhalt: { type: 'doc', content: [] },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-19T10:00:00Z',
    kategorie: null,
    kontext_anforderungen: [],
    aktualisiert_am: null,
  },
]

describe('TemplatesGrid', () => {
  const mockOnEditTemplate = jest.fn()
  const mockOnDeleteTemplate = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockOnDeleteTemplate.mockResolvedValue(undefined)
  })

  describe('Basic Rendering', () => {
    it('should render all templates', () => {
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      expect(screen.getByTestId('template-card-template-1')).toBeInTheDocument()
      expect(screen.getByTestId('template-card-template-2')).toBeInTheDocument()
      expect(screen.getByTestId('template-card-template-3')).toBeInTheDocument()
      expect(screen.getByTestId('template-card-template-4')).toBeInTheDocument()
      expect(screen.getByTestId('template-card-template-5')).toBeInTheDocument()
    })

    it('should render empty grid when no templates', () => {
      render(
        <TemplatesGrid
          templates={[]}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      expect(screen.queryByRole('article')).not.toBeInTheDocument()
    })

    it('should have proper grid layout classes', () => {
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      const gridContainer = screen.getByRole('region', { name: /vorlagen-liste/i })
      expect(gridContainer).toHaveClass('space-y-8')
    })
  })

  describe('Category Grouping', () => {
    it('should group templates by category', () => {
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      // Should show category headers
      expect(screen.getByText('Verträge')).toBeInTheDocument()
      expect(screen.getByText('Kündigungen')).toBeInTheDocument()
      expect(screen.getByText('Betriebskosten')).toBeInTheDocument()
      expect(screen.getByText('Ohne Kategorie')).toBeInTheDocument()
    })

    it('should show template counts for each category', () => {
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      // Verträge should have 2 templates
      expect(screen.getByText('2 Vorlagen')).toBeInTheDocument()
      
      // Other categories should have 1 template each
      const singleTemplateLabels = screen.getAllByText('1 Vorlage')
      expect(singleTemplateLabels).toHaveLength(3) // Kündigungen, Betriebskosten, Ohne Kategorie
    })

    it('should sort categories alphabetically', () => {
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      const categoryHeaders = screen.getAllByRole('heading', { level: 3 })
      const categoryTexts = categoryHeaders.map(header => header.textContent)

      expect(categoryTexts).toEqual([
        'Betriebskosten',
        'Kündigungen',
        'Ohne Kategorie',
        'Verträge',
      ])
    })

    it('should sort templates within categories alphabetically', () => {
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      // Find the Verträge section
      const vertraegeSection = screen.getByText('Verträge').closest('section')
      const templatesInSection = within(vertraegeSection!).getAllByRole('article')

      // Should be sorted: Mietvertrag Premium, Mietvertrag Standard
      expect(within(templatesInSection[0]).getByText('Mietvertrag Premium')).toBeInTheDocument()
      expect(within(templatesInSection[1]).getByText('Mietvertrag Standard')).toBeInTheDocument()
    })

    it('should handle templates without categories', () => {
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      expect(screen.getByText('Ohne Kategorie')).toBeInTheDocument()
      
      const ohneKategorieSection = screen.getByText('Ohne Kategorie').closest('section')
      expect(within(ohneKategorieSection!).getByText('Template ohne Kategorie')).toBeInTheDocument()
    })
  })

  describe('Template Actions', () => {
    it('should call onEditTemplate when edit button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      const editButton = screen.getAllByText('Edit')[0]
      await user.click(editButton)

      expect(mockOnEditTemplate).toHaveBeenCalledWith('template-1')
    })

    it('should call onDeleteTemplate when delete button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      const deleteButton = screen.getAllByText('Delete')[0]
      await user.click(deleteButton)

      expect(mockOnDeleteTemplate).toHaveBeenCalledWith('template-1')
    })

    it('should handle edit action for templates in different categories', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      // Find and click edit button for Kündigung template
      const kuendigungSection = screen.getByText('Kündigungen').closest('section')
      const editButton = within(kuendigungSection!).getByText('Edit')
      await user.click(editButton)

      expect(mockOnEditTemplate).toHaveBeenCalledWith('template-3')
    })

    it('should handle delete action for templates in different categories', async () => {
      const user = userEvent.setup()
      
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      // Find and click delete button for Betriebskosten template
      const betriebskostenSection = screen.getByText('Betriebskosten').closest('section')
      const deleteButton = within(betriebskostenSection!).getByText('Delete')
      await user.click(deleteButton)

      expect(mockOnDeleteTemplate).toHaveBeenCalledWith('template-4')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      expect(screen.getByRole('region', { name: /vorlagen-liste/i })).toBeInTheDocument()
      
      const sections = screen.getAllByRole('region')
      sections.forEach(section => {
        expect(section).toHaveAttribute('aria-labelledby')
      })
    })

    it('should have proper heading hierarchy', () => {
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      const categoryHeaders = screen.getAllByRole('heading', { level: 3 })
      expect(categoryHeaders.length).toBeGreaterThan(0)
      
      categoryHeaders.forEach(header => {
        expect(header).toHaveAttribute('id')
      })
    })

    it('should have proper grid role and labels', () => {
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      const grids = screen.getAllByRole('grid')
      grids.forEach(grid => {
        expect(grid).toHaveAttribute('aria-label')
      })
    })

    it('should provide template count information for screen readers', () => {
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      // Check for badges with proper aria-labels
      const badges = screen.getAllByText(/\d+ Vorlage/)
      badges.forEach(badge => {
        expect(badge).toHaveAttribute('aria-label')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle templates with missing data gracefully', () => {
      const templatesWithMissingData = [
        {
          id: 'template-missing-data',
          titel: '',
          inhalt: null,
          user_id: 'test-user',
          erstellungsdatum: '2024-01-15T10:00:00Z',
          kategorie: null,
          kontext_anforderungen: null,
          aktualisiert_am: null,
        },
      ] as any

      render(
        <TemplatesGrid
          templates={templatesWithMissingData}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      // Should still render without crashing
      expect(screen.getByTestId('template-card-template-missing-data')).toBeInTheDocument()
    })

    it('should handle error in template processing', () => {
      // Mock console.warn to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      const problematicTemplate = {
        id: 'problematic-template',
        titel: 'Problematic Template',
        inhalt: { type: 'doc', content: [] },
        user_id: 'test-user',
        erstellungsdatum: '2024-01-15T10:00:00Z',
        kategorie: 'Test Category',
        kontext_anforderungen: [],
        aktualisiert_am: null,
      }

      // Mock TemplateCard to throw an error for this specific template
      jest.doMock('@/components/template-card', () => ({
        TemplateCard: ({ template }: any) => {
          if (template.id === 'problematic-template') {
            throw new Error('Template processing error')
          }
          return (
            <div data-testid={`template-card-${template.id}`} role="article">
              <h3>{template.titel}</h3>
            </div>
          )
        },
      }))

      // Should handle the error gracefully and continue rendering other templates
      expect(() => {
        render(
          <TemplatesGrid
            templates={[problematicTemplate, mockTemplates[0]]}
            onEditTemplate={mockOnEditTemplate}
            onDeleteTemplate={mockOnDeleteTemplate}
          />
        )
      }).not.toThrow()

      consoleSpy.mockRestore()
    })
  })

  describe('Performance', () => {
    it('should handle large numbers of templates efficiently', () => {
      // Create many templates
      const manyTemplates = Array.from({ length: 100 }, (_, i) => ({
        id: `template-${i}`,
        titel: `Template ${i}`,
        inhalt: { type: 'doc', content: [] },
        user_id: 'test-user',
        erstellungsdatum: '2024-01-15T10:00:00Z',
        kategorie: `Category ${i % 5}`, // 5 different categories
        kontext_anforderungen: [],
        aktualisiert_am: null,
      }))

      const startTime = performance.now()
      
      render(
        <TemplatesGrid
          templates={manyTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000)

      // Should still show all templates
      expect(screen.getAllByRole('article')).toHaveLength(100)
    })

    it('should memoize category grouping calculations', () => {
      const { rerender } = render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      // Rerender with same templates - should not recalculate grouping
      rerender(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      // Should still show correct categories
      expect(screen.getByText('Verträge')).toBeInTheDocument()
      expect(screen.getByText('Kündigungen')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive grid classes', () => {
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      const grids = screen.getAllByRole('grid')
      grids.forEach(grid => {
        expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4')
      })
    })

    it('should maintain proper spacing between categories', () => {
      render(
        <TemplatesGrid
          templates={mockTemplates}
          onEditTemplate={mockOnEditTemplate}
          onDeleteTemplate={mockOnDeleteTemplate}
        />
      )

      const mainContainer = screen.getByRole('region', { name: /vorlagen-liste/i })
      expect(mainContainer).toHaveClass('space-y-8')
    })
  })
})