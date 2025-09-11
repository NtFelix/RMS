import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryFilter } from '../category-filter'
import type { TemplateWithMetadata } from '@/types/template-modal'

// Mock templates data for testing
const mockTemplates: TemplateWithMetadata[] = [
  {
    id: '1',
    titel: 'Mietvertrag Template',
    kategorie: 'Verträge',
    inhalt: {},
    user_id: 'user1',
    erstellungsdatum: '2024-01-01',
    aktualisiert_am: null,
    kontext_anforderungen: ['mieter_name', 'wohnung_adresse']
  },
  {
    id: '2',
    titel: 'Kündigung Template',
    kategorie: 'Verträge',
    inhalt: {},
    user_id: 'user1',
    erstellungsdatum: '2024-01-02',
    aktualisiert_am: null,
    kontext_anforderungen: ['mieter_name']
  },
  {
    id: '3',
    titel: 'Betriebskosten Template',
    kategorie: 'Betriebskosten',
    inhalt: {},
    user_id: 'user1',
    erstellungsdatum: '2024-01-03',
    aktualisiert_am: null,
    kontext_anforderungen: ['jahr', 'kosten']
  },
  {
    id: '4',
    titel: 'Uncategorized Template',
    kategorie: null,
    inhalt: {},
    user_id: 'user1',
    erstellungsdatum: '2024-01-04',
    aktualisiert_am: null,
    kontext_anforderungen: []
  }
]

describe('CategoryFilter', () => {
  const mockOnCategoryChange = jest.fn()

  beforeEach(() => {
    mockOnCategoryChange.mockClear()
  })

  test('renders with all categories option', () => {
    render(
      <CategoryFilter
        templates={mockTemplates}
        selectedCategory="all"
        onCategoryChange={mockOnCategoryChange}
      />
    )

    // Should show the select trigger
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  test('calculates category counts correctly', () => {
    render(
      <CategoryFilter
        templates={mockTemplates}
        selectedCategory="all"
        onCategoryChange={mockOnCategoryChange}
      />
    )

    // Click to open the dropdown
    fireEvent.click(screen.getByRole('combobox'))

    // Should show "Alle Kategorien" with total count (appears in both trigger and dropdown)
    expect(screen.getAllByText('Alle Kategorien')).toHaveLength(2)
    expect(screen.getAllByText('(4)')).toHaveLength(2)

    // Should show individual categories with counts
    expect(screen.getByText('Verträge')).toBeInTheDocument()
    expect(screen.getByText('(2)')).toBeInTheDocument()
    
    expect(screen.getByText('Betriebskosten')).toBeInTheDocument()
    expect(screen.getAllByText('(1)')).toHaveLength(2) // Both "Betriebskosten" and "Ohne Kategorie" have count 1
    
    expect(screen.getByText('Ohne Kategorie')).toBeInTheDocument()
  })

  test('handles empty templates array', () => {
    render(
      <CategoryFilter
        templates={[]}
        selectedCategory="all"
        onCategoryChange={mockOnCategoryChange}
      />
    )

    fireEvent.click(screen.getByRole('combobox'))

    // Should show "Alle Kategorien" with 0 count (appears in both trigger and dropdown)
    expect(screen.getAllByText('Alle Kategorien')).toHaveLength(2)
    expect(screen.getAllByText('(0)')).toHaveLength(2)

    // Should show "no categories available" message
    expect(screen.getByText('Keine Kategorien verfügbar')).toBeInTheDocument()
  })

  test('calls onCategoryChange when selection changes', () => {
    render(
      <CategoryFilter
        templates={mockTemplates}
        selectedCategory="all"
        onCategoryChange={mockOnCategoryChange}
      />
    )

    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(screen.getByText('Verträge'))

    expect(mockOnCategoryChange).toHaveBeenCalledWith('Verträge')
  })

  test('sorts categories alphabetically', () => {
    const templatesWithMixedCategories: TemplateWithMetadata[] = [
      { ...mockTemplates[0], kategorie: 'Zebra' },
      { ...mockTemplates[1], kategorie: 'Alpha' },
      { ...mockTemplates[2], kategorie: 'Beta' }
    ]

    render(
      <CategoryFilter
        templates={templatesWithMixedCategories}
        selectedCategory="all"
        onCategoryChange={mockOnCategoryChange}
      />
    )

    fireEvent.click(screen.getByRole('combobox'))

    const categoryOptions = screen.getAllByRole('option')
    // First should be "Alle Kategorien", then alphabetically sorted categories
    expect(categoryOptions[0]).toHaveTextContent('Alle Kategorien')
    expect(categoryOptions[1]).toHaveTextContent('Alpha')
    expect(categoryOptions[2]).toHaveTextContent('Beta')
    expect(categoryOptions[3]).toHaveTextContent('Zebra')
  })

  test('applies custom className', () => {
    const customClass = 'custom-test-class'
    
    render(
      <CategoryFilter
        templates={mockTemplates}
        selectedCategory="all"
        onCategoryChange={mockOnCategoryChange}
        className={customClass}
      />
    )

    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveClass(customClass)
  })

  test('uses custom placeholder', () => {
    const customPlaceholder = 'Custom placeholder'
    
    render(
      <CategoryFilter
        templates={mockTemplates}
        selectedCategory=""
        onCategoryChange={mockOnCategoryChange}
        placeholder={customPlaceholder}
      />
    )

    expect(screen.getByText(customPlaceholder)).toBeInTheDocument()
  })

  test('has proper accessibility attributes', () => {
    render(
      <CategoryFilter
        templates={mockTemplates}
        selectedCategory="all"
        onCategoryChange={mockOnCategoryChange}
      />
    )

    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAttribute('aria-label', 'Kategorie auswählen')
  })
})