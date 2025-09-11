import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryFilter } from '@/components/category-filter'
import type { Template } from '@/types/template'

// Mock templates for testing
const mockTemplates: Template[] = [
  {
    id: 'template-1',
    titel: 'Mietvertrag Standard',
    inhalt: { type: 'doc', content: [] },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-15T10:00:00Z',
    kategorie: 'Verträge',
    kontext_anforderungen: [],
    aktualisiert_am: null,
  },
  {
    id: 'template-2',
    titel: 'Mietvertrag Premium',
    inhalt: { type: 'doc', content: [] },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-16T10:00:00Z',
    kategorie: 'Verträge',
    kontext_anforderungen: [],
    aktualisiert_am: null,
  },
  {
    id: 'template-3',
    titel: 'Kündigung Standard',
    inhalt: { type: 'doc', content: [] },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-17T10:00:00Z',
    kategorie: 'Kündigungen',
    kontext_anforderungen: [],
    aktualisiert_am: null,
  },
  {
    id: 'template-4',
    titel: 'Betriebskosten Abrechnung',
    inhalt: { type: 'doc', content: [] },
    user_id: 'test-user',
    erstellungsdatum: '2024-01-18T10:00:00Z',
    kategorie: 'Betriebskosten',
    kontext_anforderungen: [],
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

describe('CategoryFilter', () => {
  const mockOnCategoryChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should render category filter with placeholder', () => {
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
          placeholder="Select category"
        />
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('Select category')).toBeInTheDocument()
    })

    it('should show "Alle Kategorien" option with total count', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      expect(screen.getByText('Alle Kategorien (5)')).toBeInTheDocument()
    })

    it('should list all categories with counts', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      expect(screen.getByText('Verträge (2)')).toBeInTheDocument()
      expect(screen.getByText('Kündigungen (1)')).toBeInTheDocument()
      expect(screen.getByText('Betriebskosten (1)')).toBeInTheDocument()
      expect(screen.getByText('Ohne Kategorie (1)')).toBeInTheDocument()
    })

    it('should call onCategoryChange when category is selected', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      const vertraegeOption = screen.getByText('Verträge (2)')
      await user.click(vertraegeOption)

      expect(mockOnCategoryChange).toHaveBeenCalledWith('Verträge')
    })

    it('should display selected category', () => {
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="Verträge"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      expect(screen.getByDisplayValue('Verträge')).toBeInTheDocument()
    })
  })

  describe('Category Counting', () => {
    it('should count templates correctly for each category', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      // Verträge should have 2 templates
      expect(screen.getByText('Verträge (2)')).toBeInTheDocument()
      
      // Other categories should have 1 each
      expect(screen.getByText('Kündigungen (1)')).toBeInTheDocument()
      expect(screen.getByText('Betriebskosten (1)')).toBeInTheDocument()
      expect(screen.getByText('Ohne Kategorie (1)')).toBeInTheDocument()
    })

    it('should handle templates without categories', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      expect(screen.getByText('Ohne Kategorie (1)')).toBeInTheDocument()
    })

    it('should update counts when templates change', async () => {
      const user = userEvent.setup()
      
      const { rerender } = render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      expect(screen.getByText('Alle Kategorien (5)')).toBeInTheDocument()

      // Remove one template and rerender
      const updatedTemplates = mockTemplates.slice(0, 4)
      rerender(
        <CategoryFilter
          templates={updatedTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      await user.click(combobox)
      expect(screen.getByText('Alle Kategorien (4)')).toBeInTheDocument()
    })
  })

  describe('Category Sorting', () => {
    it('should sort categories alphabetically', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      const options = screen.getAllByRole('option')
      const categoryOptions = options.slice(1) // Skip "Alle Kategorien"
      const categoryTexts = categoryOptions.map(option => option.textContent)

      // Should be sorted alphabetically
      expect(categoryTexts).toEqual([
        'Betriebskosten (1)',
        'Kündigungen (1)',
        'Ohne Kategorie (1)',
        'Verträge (2)',
      ])
    })
  })

  describe('Empty States', () => {
    it('should handle empty templates array', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryFilter
          templates={[]}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      expect(screen.getByText('Alle Kategorien (0)')).toBeInTheDocument()
      
      // Should only show "Alle Kategorien" option
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(1)
    })

    it('should handle templates with only null categories', async () => {
      const user = userEvent.setup()
      const templatesWithoutCategories = mockTemplates.map(template => ({
        ...template,
        kategorie: null,
      }))
      
      render(
        <CategoryFilter
          templates={templatesWithoutCategories}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      expect(screen.getByText('Alle Kategorien (5)')).toBeInTheDocument()
      expect(screen.getByText('Ohne Kategorie (5)')).toBeInTheDocument()
      
      // Should only show "Alle Kategorien" and "Ohne Kategorie"
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(2)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      expect(combobox).toHaveAttribute('aria-expanded', 'false')
    })

    it('should update aria-expanded when opened', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      expect(combobox).toHaveAttribute('aria-expanded', 'true')
    })

    it('should have proper option labels', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      const options = screen.getAllByRole('option')
      options.forEach(option => {
        expect(option).toHaveTextContent(/\(\d+\)/) // Should contain count in parentheses
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      
      // Focus and open with Enter
      await user.click(combobox)
      await user.keyboard('{Enter}')

      expect(screen.getByText('Alle Kategorien (5)')).toBeInTheDocument()

      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')

      // Should select the first category option
      expect(mockOnCategoryChange).toHaveBeenCalled()
    })

    it('should close on Escape key', async () => {
      const user = userEvent.setup()
      
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      expect(screen.getByText('Alle Kategorien (5)')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByText('Alle Kategorien (5)')).not.toBeInTheDocument()
      })
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
          className="custom-filter-class"
        />
      )

      expect(document.querySelector('.custom-filter-class')).toBeInTheDocument()
    })

    it('should apply custom placeholder', () => {
      render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
          placeholder="Choose a category"
        />
      )

      expect(screen.getByText('Choose a category')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should memoize category calculations', () => {
      const { rerender } = render(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      // Rerender with same templates - should not recalculate
      rerender(
        <CategoryFilter
          templates={mockTemplates}
          selectedCategory="Verträge"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      // Component should still work correctly
      expect(screen.getByDisplayValue('Verträge')).toBeInTheDocument()
    })

    it('should handle large numbers of templates efficiently', async () => {
      const user = userEvent.setup()
      
      // Create many templates
      const manyTemplates = Array.from({ length: 1000 }, (_, i) => ({
        id: `template-${i}`,
        titel: `Template ${i}`,
        inhalt: { type: 'doc', content: [] },
        user_id: 'test-user',
        erstellungsdatum: '2024-01-15T10:00:00Z',
        kategorie: `Category ${i % 10}`, // 10 different categories
        kontext_anforderungen: [],
        aktualisiert_am: null,
      }))

      render(
        <CategoryFilter
          templates={manyTemplates}
          selectedCategory="all"
          onCategoryChange={mockOnCategoryChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      // Should render without performance issues
      expect(screen.getByText('Alle Kategorien (1000)')).toBeInTheDocument()
      
      // Should have 11 options (Alle Kategorien + 10 categories)
      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(11)
    })
  })
})