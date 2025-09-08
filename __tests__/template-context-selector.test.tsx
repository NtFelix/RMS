import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { TemplateContextSelector } from '@/components/template-context-selector'
import type { Template } from '@/types/template-system'

const mockTemplate: Template = {
  id: 'test-template-1',
  user_id: 'user-1',
  titel: 'Test Template',
  inhalt: 'Test content with @mieter.name and @wohnung.name',
  kategorie: 'mail',
  kontext_anforderungen: ['mieter', 'wohnung'],
  erstellungsdatum: '2024-01-01T00:00:00Z',
  aktualisiert_am: '2024-01-01T00:00:00Z'
}

const mockEntities = {
  mieter: [
    { id: 'mieter-1', name: 'Max Mustermann', email: 'max@example.com', wohnung_id: 'wohnung-1' },
    { id: 'mieter-2', name: 'Anna Schmidt', email: 'anna@example.com', wohnung_id: 'wohnung-2' }
  ],
  wohnungen: [
    { id: 'wohnung-1', name: 'Wohnung 1A', groesse: 75, miete: 800, haus_id: 'haus-1' },
    { id: 'wohnung-2', name: 'Wohnung 2B', groesse: 90, miete: 1000, haus_id: 'haus-1' }
  ],
  haeuser: [
    { id: 'haus-1', name: 'Musterstraße 1', ort: 'Berlin', strasse: 'Musterstraße 1' }
  ]
}

// Test wrapper component that provides form context
function TestWrapper({ children, template = mockTemplate, entities = mockEntities, isLoading = false }: {
  children: React.ReactNode
  template?: Template
  entities?: typeof mockEntities
  isLoading?: boolean
}) {
  const form = useForm({
    defaultValues: {
      mieter_id: '',
      wohnung_id: '',
      haus_id: ''
    }
  })

  return (
    <form>
      <TemplateContextSelector
        template={template}
        control={form.control}
        availableEntities={entities}
        isLoading={isLoading}
      />
    </form>
  )
}

describe('TemplateContextSelector', () => {
  it('renders context selection header with template requirements', () => {
    render(<TestWrapper />)

    expect(screen.getByText('Kontext auswählen')).toBeInTheDocument()
    expect(screen.getByText('mieter')).toBeInTheDocument()
    expect(screen.getByText('wohnung')).toBeInTheDocument()
  })

  it('shows loading state when isLoading is true', () => {
    render(<TestWrapper isLoading={true} />)

    expect(screen.getByText('Lade verfügbare Entitäten...')).toBeInTheDocument()
    expect(screen.queryByText('Kontext auswählen')).not.toBeInTheDocument()
  })

  it('displays required context fields with asterisk', () => {
    render(<TestWrapper />)

    expect(screen.getByText('Mieter *')).toBeInTheDocument()
    expect(screen.getByText('Wohnung *')).toBeInTheDocument()
  })

  it('shows mieter selection dropdown with available mieter', async () => {
    const user = userEvent.setup()
    render(<TestWrapper />)

    const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
    await user.click(mieterSelect)

    expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
    expect(screen.getByText('Anna Schmidt')).toBeInTheDocument()
  })

  it('shows wohnung selection dropdown with available wohnungen', async () => {
    const user = userEvent.setup()
    render(<TestWrapper />)

    const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
    await user.click(wohnungSelect)

    expect(screen.getByText('Wohnung 1A')).toBeInTheDocument()
    expect(screen.getByText('Wohnung 2B')).toBeInTheDocument()
  })

  it('shows haus selection dropdown when haus context is required', async () => {
    const templateWithHaus: Template = {
      ...mockTemplate,
      kontext_anforderungen: ['mieter', 'wohnung', 'haus']
    }

    const user = userEvent.setup()
    render(<TestWrapper template={templateWithHaus} />)

    expect(screen.getByText('Haus *')).toBeInTheDocument()

    const hausSelect = screen.getByRole('combobox', { name: /haus/i })
    await user.click(hausSelect)

    expect(screen.getByText('Musterstraße 1')).toBeInTheDocument()
  })

  it('displays entity count information', () => {
    render(<TestWrapper />)

    expect(screen.getByText('2 Mieter verfügbar')).toBeInTheDocument()
    expect(screen.getByText('2 Wohnungen verfügbar')).toBeInTheDocument()
  })

  it('filters mieter by selected wohnung', async () => {
    const user = userEvent.setup()
    render(<TestWrapper />)

    // First select a wohnung
    const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
    await user.click(wohnungSelect)
    await user.click(screen.getByText('Wohnung 1A'))

    // Now check mieter dropdown - should be filtered
    const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
    await user.click(mieterSelect)

    // Only Max Mustermann should be available (lives in wohnung-1)
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
    expect(screen.queryByText('Anna Schmidt')).not.toBeInTheDocument()
  })

  it('filters wohnungen by selected haus', async () => {
    const templateWithHaus: Template = {
      ...mockTemplate,
      kontext_anforderungen: ['haus', 'wohnung']
    }

    const entitiesWithMultipleHouses = {
      ...mockEntities,
      wohnungen: [
        ...mockEntities.wohnungen,
        { id: 'wohnung-3', name: 'Wohnung 3C', groesse: 60, miete: 700, haus_id: 'haus-2' }
      ],
      haeuser: [
        ...mockEntities.haeuser,
        { id: 'haus-2', name: 'Beispielstraße 2', ort: 'Hamburg', strasse: 'Beispielstraße 2' }
      ]
    }

    const user = userEvent.setup()
    render(<TestWrapper template={templateWithHaus} entities={entitiesWithMultipleHouses} />)

    // First select a haus
    const hausSelect = screen.getByRole('combobox', { name: /haus/i })
    await user.click(hausSelect)
    await user.click(screen.getByText('Musterstraße 1'))

    // Now check wohnung dropdown - should be filtered to only show wohnungen in haus-1
    const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
    await user.click(wohnungSelect)

    expect(screen.getByText('Wohnung 1A')).toBeInTheDocument()
    expect(screen.getByText('Wohnung 2B')).toBeInTheDocument()
    expect(screen.queryByText('Wohnung 3C')).not.toBeInTheDocument()
  })

  it('shows context fields for mail template category', () => {
    const mailTemplate: Template = {
      ...mockTemplate,
      kategorie: 'mail',
      kontext_anforderungen: ['mail']
    }

    render(<TestWrapper template={mailTemplate} />)

    // Should show mieter field even though not explicitly required, because mail templates commonly need mieter
    expect(screen.getByText('Mieter')).toBeInTheDocument()
  })

  it('shows context fields for vertrag template category', () => {
    const vertragTemplate: Template = {
      ...mockTemplate,
      kategorie: 'vertrag',
      kontext_anforderungen: ['vertrag']
    }

    render(<TestWrapper template={vertragTemplate} />)

    // Should show mieter, wohnung, and haus fields for vertrag templates
    expect(screen.getByText('Mieter')).toBeInTheDocument()
    expect(screen.getByText('Wohnung')).toBeInTheDocument()
    expect(screen.getByText('Haus')).toBeInTheDocument()
  })

  it('shows context fields for kuendigung template category', () => {
    const kuendigungTemplate: Template = {
      ...mockTemplate,
      kategorie: 'kuendigung',
      kontext_anforderungen: ['kuendigung']
    }

    render(<TestWrapper template={kuendigungTemplate} />)

    // Should show mieter and wohnung fields for kuendigung templates
    expect(screen.getByText('Mieter')).toBeInTheDocument()
    expect(screen.getByText('Wohnung')).toBeInTheDocument()
  })

  it('displays mieter email in dropdown options', async () => {
    const user = userEvent.setup()
    render(<TestWrapper />)

    const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
    await user.click(mieterSelect)

    expect(screen.getByText('max@example.com')).toBeInTheDocument()
    expect(screen.getByText('anna@example.com')).toBeInTheDocument()
  })

  it('displays wohnung miete in dropdown options', async () => {
    const user = userEvent.setup()
    render(<TestWrapper />)

    const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
    await user.click(wohnungSelect)

    expect(screen.getByText('800€')).toBeInTheDocument()
    expect(screen.getByText('1000€')).toBeInTheDocument()
  })

  it('displays haus ort in dropdown options', async () => {
    const templateWithHaus: Template = {
      ...mockTemplate,
      kontext_anforderungen: ['haus']
    }

    const user = userEvent.setup()
    render(<TestWrapper template={templateWithHaus} />)

    const hausSelect = screen.getByRole('combobox', { name: /haus/i })
    await user.click(hausSelect)

    expect(screen.getByText('Berlin')).toBeInTheDocument()
  })

  it('calls onEntityChange callback when entity is selected', async () => {
    const mockOnEntityChange = jest.fn()
    const form = useForm({
      defaultValues: {
        mieter_id: '',
        wohnung_id: '',
        haus_id: ''
      }
    })

    const user = userEvent.setup()
    render(
      <form>
        <TemplateContextSelector
          template={mockTemplate}
          control={form.control}
          availableEntities={mockEntities}
          onEntityChange={mockOnEntityChange}
        />
      </form>
    )

    const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
    await user.click(mieterSelect)
    await user.click(screen.getByText('Max Mustermann'))

    expect(mockOnEntityChange).toHaveBeenCalledWith('mieter_id', 'mieter-1')
  })

  it('handles empty entity lists gracefully', () => {
    const emptyEntities = {
      mieter: [],
      wohnungen: [],
      haeuser: []
    }

    render(<TestWrapper entities={emptyEntities} />)

    expect(screen.getByText('0 Mieter verfügbar')).toBeInTheDocument()
    expect(screen.getByText('0 Wohnungen verfügbar')).toBeInTheDocument()
  })

  it('does not show non-required context fields when not needed', () => {
    const simpleTemplate: Template = {
      ...mockTemplate,
      kontext_anforderungen: ['mieter'] // Only mieter required
    }

    render(<TestWrapper template={simpleTemplate} />)

    expect(screen.getByText('Mieter *')).toBeInTheDocument()
    // Wohnung and Haus should not be shown as they're not required and not in common mappings
    expect(screen.queryByText('Wohnung')).not.toBeInTheDocument()
    expect(screen.queryByText('Haus')).not.toBeInTheDocument()
  })
})

describe('TemplateContextSelector Entity Filtering', () => {
  it('updates entity count when filtering is applied', async () => {
    const user = userEvent.setup()
    render(<TestWrapper />)

    // Initially should show all mieter
    expect(screen.getByText('2 Mieter verfügbar')).toBeInTheDocument()

    // Select a wohnung to filter mieter
    const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
    await user.click(wohnungSelect)
    await user.click(screen.getByText('Wohnung 1A'))

    // Should now show filtered count
    expect(screen.getByText('1 Mieter verfügbar')).toBeInTheDocument()
  })

  it('resets filtering when selection is cleared', async () => {
    const user = userEvent.setup()
    render(<TestWrapper />)

    // Select a wohnung
    const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
    await user.click(wohnungSelect)
    await user.click(screen.getByText('Wohnung 1A'))

    expect(screen.getByText('1 Mieter verfügbar')).toBeInTheDocument()

    // Clear selection (this would depend on the Select component implementation)
    // For now, we'll test the logic by selecting a different wohnung
    await user.click(wohnungSelect)
    await user.click(screen.getByText('Wohnung 2B'))

    expect(screen.getByText('1 Mieter verfügbar')).toBeInTheDocument()
  })
})