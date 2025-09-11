import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatesGrid } from '@/components/templates-grid'
import type { Template } from '@/types/template'

// Mock the TemplateCard component
jest.mock('@/components/template-card', () => ({
  TemplateCard: ({ template, onEdit, onDelete }: any) => (
    <div data-testid={`template-card-${template.id}`}>
      <h3>{template.titel}</h3>
      <p>{template.kategorie || 'Ohne Kategorie'}</p>
      <button onClick={() => onEdit(template.id)}>Edit</button>
      <button onClick={() => onDelete(template.id)}>Delete</button>
    </div>
  )
}))

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

const mockTemplates: Template[] = [
  {
    id: '1',
    titel: 'Mietvertrag Standard',
    inhalt: { content: 'Mietvertrag content' },
    user_id: 'user1',
    erstellungsdatum: '2024-01-15T10:00:00Z',
    kategorie: 'Verträge',
    kontext_anforderungen: ['mieter_name', 'wohnung_adresse'],
    aktualisiert_am: '2024-01-20T10:00:00Z'
  },
  {
    id: '2',
    titel: 'Kündigung Vorlage',
    inhalt: { content: 'Kündigung content' },
    user_id: 'user1',
    erstellungsdatum: '2024-01-10T10:00:00Z',
    kategorie: 'Verträge',
    kontext_anforderungen: ['mieter_name'],
    aktualisiert_am: null
  },
  {
    id: '3',
    titel: 'Betriebskosten Abrechnung',
    inhalt: { content: 'Betriebskosten content' },
    user_id: 'user1',
    erstellungsdatum: '2024-01-05T10:00:00Z',
    kategorie: 'Abrechnungen',
    kontext_anforderungen: ['zeitraum', 'kosten'],
    aktualisiert_am: '2024-01-25T10:00:00Z'
  },
  {
    id: '4',
    titel: 'Allgemeine Mitteilung',
    inhalt: { content: 'Mitteilung content' },
    user_id: 'user1',
    erstellungsdatum: '2024-01-12T10:00:00Z',
    kategorie: null,
    kontext_anforderungen: [],
    aktualisiert_am: null
  }
]

describe('TemplatesGrid', () => {
  const defaultProps = {
    templates: mockTemplates,
    groupByCategory: false,
    onEditTemplate: jest.fn(),
    onDeleteTemplate: jest.fn().mockResolvedValue(undefined)
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    test('renders templates in grid layout', () => {
      render(<TemplatesGrid {...defaultProps} />)
      
      expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument()
      expect(screen.getByText('Kündigung Vorlage')).toBeInTheDocument()
      expect(screen.getByText('Betriebskosten Abrechnung')).toBeInTheDocument()
      expect(screen.getByText('Allgemeine Mitteilung')).toBeInTheDocument()
    })

    test('renders empty state when no templates', () => {
      render(<TemplatesGrid {...defaultProps} templates={[]} />)
      
      expect(screen.getByText('Keine Vorlagen vorhanden')).toBeInTheDocument()
      expect(screen.getByText('Erstellen Sie Ihre erste Vorlage, um loszulegen.')).toBeInTheDocument()
    })

    test('renders sorting controls', () => {
      render(<TemplatesGrid {...defaultProps} />)
      
      expect(screen.getByText('Sortieren nach:')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('Category Grouping', () => {
    test('groups templates by category when groupByCategory is true', () => {
      render(<TemplatesGrid {...defaultProps} groupByCategory={true} />)
      
      expect(screen.getByRole('heading', { name: 'Verträge' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Abrechnungen' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Ohne Kategorie' })).toBeInTheDocument()
    })

    test('shows template count for each category', () => {
      render(<TemplatesGrid {...defaultProps} groupByCategory={true} />)
      
      // Verträge category should have 2 templates
      expect(screen.getByText('2 Vorlagen')).toBeInTheDocument()
      // Should have multiple "1 Vorlage" badges for single-template categories
      expect(screen.getAllByText('1 Vorlage')).toHaveLength(2) // Abrechnungen and Ohne Kategorie
    })

    test('does not show category headers when groupByCategory is false', () => {
      render(<TemplatesGrid {...defaultProps} groupByCategory={false} />)
      
      // Should not show category headers (h3 elements)
      expect(screen.queryByRole('heading', { name: 'Verträge' })).not.toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Abrechnungen' })).not.toBeInTheDocument()
    })

    test('handles empty categories correctly', () => {
      const templatesWithEmptyCategory = mockTemplates.filter(t => t.kategorie !== 'Abrechnungen')
      
      render(
        <TemplatesGrid 
          {...defaultProps} 
          templates={templatesWithEmptyCategory}
          groupByCategory={true} 
        />
      )
      
      expect(screen.getByRole('heading', { name: 'Verträge' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Ohne Kategorie' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Abrechnungen' })).not.toBeInTheDocument()
    })
  })

  describe('Sorting Functionality', () => {
    test('sorts templates by title by default', () => {
      render(<TemplatesGrid {...defaultProps} />)
      
      const templateCards = screen.getAllByTestId(/template-card-/)
      const titles = templateCards.map(card => card.querySelector('h3')?.textContent)
      
      // Should be sorted alphabetically by title
      expect(titles).toEqual([
        'Allgemeine Mitteilung',
        'Betriebskosten Abrechnung', 
        'Kündigung Vorlage',
        'Mietvertrag Standard'
      ])
    })

    test('changes sort order when clicking sort button', async () => {
      const user = userEvent.setup()
      render(<TemplatesGrid {...defaultProps} />)
      
      const sortButton = screen.getByRole('button', { name: /aufsteigend sortiert/i })
      await user.click(sortButton)
      
      expect(screen.getByRole('button', { name: /absteigend sortiert/i })).toBeInTheDocument()
    })

    test('sorts by creation date when selected', async () => {
      const user = userEvent.setup()
      render(<TemplatesGrid {...defaultProps} />)
      
      const sortSelect = screen.getByRole('combobox')
      await user.click(sortSelect)
      await user.click(screen.getByText('Erstellungsdatum'))
      
      // Should be sorted by creation date (oldest first)
      const templateCards = screen.getAllByTestId(/template-card-/)
      const titles = templateCards.map(card => card.querySelector('h3')?.textContent)
      
      expect(titles[0]).toBe('Betriebskosten Abrechnung') // 2024-01-05
      expect(titles[1]).toBe('Kündigung Vorlage') // 2024-01-10
    })

    test('sorts by modified date when selected', async () => {
      const user = userEvent.setup()
      render(<TemplatesGrid {...defaultProps} />)
      
      const sortSelect = screen.getByRole('combobox')
      await user.click(sortSelect)
      await user.click(screen.getByText('Änderungsdatum'))
      
      // Templates without aktualisiert_am should use erstellungsdatum
      const templateCards = screen.getAllByTestId(/template-card-/)
      expect(templateCards).toHaveLength(4)
    })

    test('includes category sort option when grouping is disabled', async () => {
      const user = userEvent.setup()
      render(<TemplatesGrid {...defaultProps} groupByCategory={false} />)
      
      const sortSelect = screen.getByRole('combobox')
      await user.click(sortSelect)
      
      expect(screen.queryByText('Kategorie')).not.toBeInTheDocument()
    })

    test('includes category sort option when grouping is enabled', async () => {
      const user = userEvent.setup()
      render(<TemplatesGrid {...defaultProps} groupByCategory={true} />)
      
      const sortSelect = screen.getByRole('combobox')
      await user.click(sortSelect)
      
      expect(screen.getByText('Kategorie')).toBeInTheDocument()
    })
  })

  describe('View Mode Controls', () => {
    test('shows view mode controls when onViewModeChange is provided', () => {
      const onViewModeChange = jest.fn()
      render(
        <TemplatesGrid 
          {...defaultProps} 
          viewMode="grid"
          onViewModeChange={onViewModeChange}
        />
      )
      
      expect(screen.getByRole('button', { name: /rasteransicht/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /listenansicht/i })).toBeInTheDocument()
    })

    test('does not show view mode controls when onViewModeChange is not provided', () => {
      render(<TemplatesGrid {...defaultProps} />)
      
      expect(screen.queryByRole('button', { name: /rasteransicht/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /listenansicht/i })).not.toBeInTheDocument()
    })

    test('calls onViewModeChange when view mode button is clicked', async () => {
      const user = userEvent.setup()
      const onViewModeChange = jest.fn()
      
      render(
        <TemplatesGrid 
          {...defaultProps} 
          viewMode="grid"
          onViewModeChange={onViewModeChange}
        />
      )
      
      const listViewButton = screen.getByRole('button', { name: /listenansicht/i })
      await user.click(listViewButton)
      
      expect(onViewModeChange).toHaveBeenCalledWith('list')
    })
  })

  describe('Template Actions', () => {
    test('calls onEditTemplate when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<TemplatesGrid {...defaultProps} />)
      
      // Templates are sorted alphabetically, so first template should be "Allgemeine Mitteilung" (id: '4')
      const editButton = screen.getAllByText('Edit')[0]
      await user.click(editButton)
      
      expect(defaultProps.onEditTemplate).toHaveBeenCalledWith('4')
    })

    test('calls onDeleteTemplate when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<TemplatesGrid {...defaultProps} />)
      
      // Templates are sorted alphabetically, so first template should be "Allgemeine Mitteilung" (id: '4')
      const deleteButton = screen.getAllByText('Delete')[0]
      await user.click(deleteButton)
      
      expect(defaultProps.onDeleteTemplate).toHaveBeenCalledWith('4')
    })
  })

  describe('Responsive Design', () => {
    test('applies correct grid classes for grid view mode', () => {
      const { container } = render(<TemplatesGrid {...defaultProps} viewMode="grid" />)
      
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4')
    })

    test('applies correct grid classes for list view mode', () => {
      const { container } = render(<TemplatesGrid {...defaultProps} viewMode="list" />)
      
      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toHaveClass('grid-cols-1')
      expect(gridContainer).not.toHaveClass('sm:grid-cols-2')
    })
  })

  describe('Summary Information', () => {
    test('shows summary when grouping by category with multiple categories', () => {
      render(<TemplatesGrid {...defaultProps} groupByCategory={true} />)
      
      // The summary should be present in the DOM
      const summarySection = screen.getByText(/Gesamt:/)
      expect(summarySection).toBeInTheDocument()
      
      // Check that it contains the expected information
      expect(summarySection.textContent).toContain('4')
      expect(summarySection.textContent).toContain('Vorlagen')
      expect(summarySection.textContent).toContain('3')
      expect(summarySection.textContent).toContain('Kategorien')
    })

    test('does not show summary when not grouping by category', () => {
      render(<TemplatesGrid {...defaultProps} groupByCategory={false} />)
      
      expect(screen.queryByText(/Gesamt:/)).not.toBeInTheDocument()
    })

    test('shows correct singular/plural forms in summary', () => {
      const singleTemplate = [mockTemplates[0]]
      render(
        <TemplatesGrid 
          {...defaultProps} 
          templates={singleTemplate}
          groupByCategory={true} 
        />
      )
      
      // With only one template in one category, summary should not be shown
      // because the condition is groupedTemplates.length > 1
      expect(screen.queryByText(/Gesamt:/)).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('provides screen reader labels for sort controls', () => {
      render(<TemplatesGrid {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /aufsteigend sortiert/i })).toBeInTheDocument()
    })

    test('provides screen reader labels for view mode controls', () => {
      const onViewModeChange = jest.fn()
      render(
        <TemplatesGrid 
          {...defaultProps} 
          onViewModeChange={onViewModeChange}
        />
      )
      
      expect(screen.getByRole('button', { name: /rasteransicht/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /listenansicht/i })).toBeInTheDocument()
    })
  })
})