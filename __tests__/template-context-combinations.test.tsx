/**
 * Template Context Combinations Tests
 * Tests for template processing with various context combinations
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateUsageModal } from '@/components/template-usage-modal'
import { TemplatePreview } from '@/components/template-preview'
import { useModalStore } from '@/hooks/use-modal-store'
import { templateProcessor } from '@/lib/template-system/template-processor'
import type { Template, TemplateContext, TemplateProcessingResult } from '@/types/template-system'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/lib/template-system/template-processor')
jest.mock('@/lib/template-system/placeholder-engine')

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockTemplateProcessor = templateProcessor as jest.Mocked<typeof templateProcessor>

// Mock fetch globally
global.fetch = jest.fn()

// Mock ResizeObserver and IntersectionObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

describe('Template Context Combinations Tests', () => {
  const mockCloseModal = jest.fn()
  const mockOnGenerate = jest.fn()
  const mockOnValidationChange = jest.fn()

  // Test entities with various data completeness levels
  const completeEntities = {
    mieter: {
      id: 'mieter-1',
      name: 'Max Mustermann',
      email: 'max@example.com',
      telefonnummer: '+49 123 456789',
      einzug: '2023-01-15',
      auszug: '2024-12-31',
      nebenkosten: [
        { id: '1', amount: '150.00', date: '2024-01-01' },
        { id: '2', amount: '75.50', date: '2024-02-01' }
      ]
    },
    wohnung: {
      id: 'wohnung-1',
      name: 'Wohnung 2A',
      groesse: 85,
      miete: 1200,
      haus_id: 'haus-1',
      status: 'vermietet'
    },
    haus: {
      id: 'haus-1',
      name: 'Musterhaus',
      strasse: 'Musterstraße 123',
      ort: 'Berlin',
      size: '450',
      rent: '4800'
    },
    vermieter: {
      id: 'user-1',
      name: 'Anna Vermieter',
      email: 'anna@vermieter.de'
    }
  }

  const partialEntities = {
    mieter: {
      id: 'mieter-2',
      name: 'Anna Schmidt'
      // Missing email, telefonnummer, dates
    },
    wohnung: {
      id: 'wohnung-2',
      name: 'Wohnung 1B',
      groesse: 60,
      miete: 900
      // Missing haus_id, status
    },
    haus: {
      id: 'haus-2',
      name: 'Beispielhaus'
      // Missing strasse, ort, size, rent
    },
    vermieter: {
      id: 'user-1',
      name: 'Anna Vermieter'
      // Missing email
    }
  }

  const emptyEntities = {
    mieter: { id: 'mieter-3' },
    wohnung: { id: 'wohnung-3' },
    haus: { id: 'haus-3' },
    vermieter: { id: 'user-1' }
  }

  // Test templates with different context requirements
  const templates: Record<string, Template> = {
    comprehensive: {
      id: 'template-comprehensive',
      user_id: 'user-1',
      titel: 'Comprehensive Template',
      inhalt: `
Sehr geehrte/r @mieter.name,

Mieterdaten:
- Name: @mieter.name
- E-Mail: @mieter.email
- Telefon: @mieter.telefon
- Einzug: @mieter.einzug
- Auszug: @mieter.auszug
- Nebenkosten: @mieter.nebenkosten

Wohnungsdaten:
- Name: @wohnung.name
- Adresse: @wohnung.adresse
- Größe: @wohnung.groesse
- Miete: @wohnung.miete

Hausdaten:
- Name: @haus.name
- Ort: @haus.ort
- Straße: @haus.strasse
- Größe: @haus.groesse

Vermieter:
- Name: @vermieter.name
- E-Mail: @vermieter.email

Datum: @datum (@datum.lang)
Monat: @monat (@monat.name)
Jahr: @jahr
      `.trim(),
      kategorie: 'vertrag',
      kontext_anforderungen: ['mieter', 'wohnung', 'haus'],
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z'
    },
    minimal: {
      id: 'template-minimal',
      user_id: 'user-1',
      titel: 'Minimal Template',
      inhalt: 'Hallo @mieter.name, heute ist @datum.',
      kategorie: 'mail',
      kontext_anforderungen: ['mieter'],
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z'
    },
    dateOnly: {
      id: 'template-date-only',
      user_id: 'user-1',
      titel: 'Date Only Template',
      inhalt: 'Heute ist @datum (@datum.lang). Monat: @monat.name, Jahr: @jahr.',
      kategorie: 'mail',
      kontext_anforderungen: [],
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z'
    },
    mixed: {
      id: 'template-mixed',
      user_id: 'user-1',
      titel: 'Mixed Context Template',
      inhalt: '@mieter.name wohnt in @wohnung.name (@haus.ort) seit @mieter.einzug. Vermieter: @vermieter.name (@vermieter.email). Datum: @datum',
      kategorie: 'vertrag',
      kontext_anforderungen: ['mieter', 'wohnung', 'haus'],
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Default template processor mocks
    mockTemplateProcessor.getUsedPlaceholders.mockReturnValue([])
    mockTemplateProcessor.validateContext.mockReturnValue({
      isValid: true,
      missingContext: []
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Complete Context Data', () => {
    it('should process template with all complete context data', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const context: TemplateContext = {
        ...completeEntities,
        datum: new Date('2024-02-09T10:00:00Z')
      }

      const expectedResult: TemplateProcessingResult = {
        processedContent: `
Sehr geehrte/r Max Mustermann,

Mieterdaten:
- Name: Max Mustermann
- E-Mail: max@example.com
- Telefon: +49 123 456789
- Einzug: 15.01.2023
- Auszug: 31.12.2024
- Nebenkosten: 225,50 €

Wohnungsdaten:
- Name: Wohnung 2A
- Adresse: Wohnung 2A, Musterstraße 123, Berlin
- Größe: 85 m²
- Miete: 1.200,00 €

Hausdaten:
- Name: Musterhaus
- Ort: Berlin
- Straße: Musterstraße 123
- Größe: 450

Vermieter:
- Name: Anna Vermieter
- E-Mail: anna@vermieter.de

Datum: 09.02.2024 (09. Februar 2024)
Monat: Februar
Jahr: 2024
        `.trim(),
        unresolvedPlaceholders: [],
        success: true
      }

      mockTemplateProcessor.processTemplate.mockReturnValue(expectedResult)

      render(
        <TemplatePreview
          template={templates.comprehensive}
          context={context}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledWith(
          templates.comprehensive.inhalt,
          context
        )
      })

      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith({
          isValid: true,
          errors: [],
          warnings: [],
          placeholders: expect.any(Array)
        })
      })

      expect(screen.getByText(/Erfolgreich verarbeitet/)).toBeInTheDocument()
    })

    it('should handle template usage with complete entities', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: templates.comprehensive,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading with complete data
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([completeEntities.mieter])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([completeEntities.wohnung])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([completeEntities.haus])
        })

      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: 'Processed content with all placeholders resolved',
        unresolvedPlaceholders: [],
        success: true
      })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Select all required entities
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      await user.click(screen.getByText('Max Mustermann'))

      const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
      await user.click(wohnungSelect)
      await user.click(screen.getByText('Wohnung 2A'))

      const hausSelect = screen.getByRole('combobox', { name: /haus/i })
      await user.click(hausSelect)
      await user.click(screen.getByText('Musterhaus'))

      // Generate document
      await waitFor(() => {
        const generateButton = screen.getByText('Dokument erstellen')
        expect(generateButton).not.toBeDisabled()
      })

      await user.click(screen.getByText('Dokument erstellen'))

      await waitFor(() => {
        expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledWith(
          templates.comprehensive.inhalt,
          expect.objectContaining({
            mieter: completeEntities.mieter,
            wohnung: completeEntities.wohnung,
            haus: completeEntities.haus
          })
        )
        expect(mockOnGenerate).toHaveBeenCalledWith('Processed content with all placeholders resolved')
      })
    })
  })

  describe('Partial Context Data', () => {
    it('should handle template processing with partial context data', async () => {
      const context: TemplateContext = {
        ...partialEntities,
        datum: new Date('2024-02-09T10:00:00Z')
      }

      const expectedResult: TemplateProcessingResult = {
        processedContent: `
Sehr geehrte/r Anna Schmidt,

Mieterdaten:
- Name: Anna Schmidt
- E-Mail: [Mieter E-Mail]
- Telefon: [Mieter Telefon]
- Einzug: [Mieter Einzug]
- Auszug: [Mieter Auszug]
- Nebenkosten: [Mieter Nebenkosten]

Wohnungsdaten:
- Name: Wohnung 1B
- Adresse: Wohnung 1B
- Größe: 60 m²
- Miete: 900,00 €

Hausdaten:
- Name: Beispielhaus
- Ort: [Haus Ort]
- Straße: [Haus Straße]
- Größe: [Haus Größe]

Vermieter:
- Name: Anna Vermieter
- E-Mail: [Vermieter E-Mail]

Datum: 09.02.2024 (09. Februar 2024)
Monat: Februar
Jahr: 2024
        `.trim(),
        unresolvedPlaceholders: [
          '@mieter.email', '@mieter.telefon', '@mieter.einzug', '@mieter.auszug', '@mieter.nebenkosten',
          '@haus.ort', '@haus.strasse', '@haus.groesse', '@vermieter.email'
        ],
        success: true
      }

      mockTemplateProcessor.processTemplate.mockReturnValue(expectedResult)

      render(
        <TemplatePreview
          template={templates.comprehensive}
          context={context}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledWith(
          templates.comprehensive.inhalt,
          context
        )
      })

      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith({
          isValid: false,
          errors: [],
          warnings: [
            'Unaufgelöster Platzhalter: @mieter.email',
            'Unaufgelöster Platzhalter: @mieter.telefon',
            'Unaufgelöster Platzhalter: @mieter.einzug',
            'Unaufgelöster Platzhalter: @mieter.auszug',
            'Unaufgelöster Platzhalter: @mieter.nebenkosten',
            'Unaufgelöster Platzhalter: @haus.ort',
            'Unaufgelöster Platzhalter: @haus.strasse',
            'Unaufgelöster Platzhalter: @haus.groesse',
            'Unaufgelöster Platzhalter: @vermieter.email',
            'Einige Platzhalter konnten nicht aufgelöst werden'
          ],
          placeholders: expect.any(Array)
        })
      })

      expect(screen.getByText('9 unaufgelöste Platzhalter')).toBeInTheDocument()
    })

    it('should show partial resolution in preview', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      const context: TemplateContext = {
        mieter: partialEntities.mieter,
        datum: new Date('2024-02-09T10:00:00Z')
      }

      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: 'Hallo Anna Schmidt, heute ist 09.02.2024.',
        unresolvedPlaceholders: [],
        success: true
      })

      render(
        <TemplatePreview
          template={templates.minimal}
          context={context}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText(/Erfolgreich verarbeitet/)).toBeInTheDocument()
      })

      // Should show 100% resolution for this simple template
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('Missing Context Data', () => {
    it('should handle template with completely missing context entities', async () => {
      const context: TemplateContext = {
        datum: new Date('2024-02-09T10:00:00Z')
        // All other entities missing
      }

      const expectedResult: TemplateProcessingResult = {
        processedContent: `
Sehr geehrte/r [Mieter Name],

Mieterdaten:
- Name: [Mieter Name]
- E-Mail: [Mieter E-Mail]
- Telefon: [Mieter Telefon]
- Einzug: [Mieter Einzug]
- Auszug: [Mieter Auszug]
- Nebenkosten: [Mieter Nebenkosten]

Wohnungsdaten:
- Name: [Wohnung Bezeichnung]
- Adresse: [Wohnung Adresse]
- Größe: [Wohnung Größe]
- Miete: [Wohnung Miete]

Hausdaten:
- Name: [Haus Name]
- Ort: [Haus Ort]
- Straße: [Haus Straße]
- Größe: [Haus Größe]

Vermieter:
- Name: [Vermieter Name]
- E-Mail: [Vermieter E-Mail]

Datum: 09.02.2024 (09. Februar 2024)
Monat: Februar
Jahr: 2024
        `.trim(),
        unresolvedPlaceholders: [
          '@mieter.name', '@mieter.email', '@mieter.telefon', '@mieter.einzug', '@mieter.auszug', '@mieter.nebenkosten',
          '@wohnung.name', '@wohnung.adresse', '@wohnung.groesse', '@wohnung.miete',
          '@haus.name', '@haus.ort', '@haus.strasse', '@haus.groesse',
          '@vermieter.name', '@vermieter.email'
        ],
        success: true
      }

      mockTemplateProcessor.processTemplate.mockReturnValue(expectedResult)
      mockTemplateProcessor.validateContext.mockReturnValue({
        isValid: false,
        missingContext: ['mieter', 'wohnung', 'haus']
      })

      render(
        <TemplatePreview
          template={templates.comprehensive}
          context={context}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith({
          isValid: false,
          errors: ['Fehlende Kontexte: mieter, wohnung, haus'],
          warnings: expect.any(Array),
          placeholders: expect.any(Array)
        })
      })

      expect(screen.getByText('16 unaufgelöste Platzhalter')).toBeInTheDocument()
    })

    it('should prevent template usage when required context is missing', async () => {
      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: templates.comprehensive,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock empty entity responses
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Should show message about missing entities
      expect(screen.getByText(/Keine Entitäten verfügbar/)).toBeInTheDocument()

      // Generate button should be disabled
      const generateButton = screen.getByText('Dokument erstellen')
      expect(generateButton).toBeDisabled()
    })
  })

  describe('Date-Only Templates', () => {
    it('should process template with only date placeholders', async () => {
      const context: TemplateContext = {
        datum: new Date('2024-07-15T14:30:00Z')
      }

      const expectedResult: TemplateProcessingResult = {
        processedContent: 'Heute ist 15.07.2024 (15. Juli 2024). Monat: Juli, Jahr: 2024.',
        unresolvedPlaceholders: [],
        success: true
      }

      mockTemplateProcessor.processTemplate.mockReturnValue(expectedResult)

      render(
        <TemplatePreview
          template={templates.dateOnly}
          context={context}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledWith(
          templates.dateOnly.inhalt,
          context
        )
      })

      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith({
          isValid: true,
          errors: [],
          warnings: [],
          placeholders: expect.any(Array)
        })
      })

      expect(screen.getByText(/Erfolgreich verarbeitet/)).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('should handle template usage with no entity requirements', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: templates.dateOnly,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: 'Heute ist 15.07.2024 (15. Juli 2024). Monat: Juli, Jahr: 2024.',
        unresolvedPlaceholders: [],
        success: true
      })

      render(<TemplateUsageModal />)

      // Should not show entity loading
      expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()

      // Should not show context selectors
      expect(screen.queryByText('Mieter *')).not.toBeInTheDocument()
      expect(screen.queryByText('Wohnung *')).not.toBeInTheDocument()

      // Generate button should be enabled immediately
      const generateButton = screen.getByText('Dokument erstellen')
      expect(generateButton).not.toBeDisabled()

      await user.click(generateButton)

      await waitFor(() => {
        expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledWith(
          templates.dateOnly.inhalt,
          expect.objectContaining({
            datum: expect.any(Date)
          })
        )
        expect(mockOnGenerate).toHaveBeenCalled()
      })
    })
  })

  describe('Mixed Context Scenarios', () => {
    it('should handle template with mixed complete and partial data', async () => {
      const mixedContext: TemplateContext = {
        mieter: completeEntities.mieter,
        wohnung: partialEntities.wohnung,
        haus: emptyEntities.haus,
        vermieter: completeEntities.vermieter,
        datum: new Date('2024-02-09T10:00:00Z')
      }

      const expectedResult: TemplateProcessingResult = {
        processedContent: 'Max Mustermann wohnt in Wohnung 1B ([Haus Ort]) seit 15.01.2023. Vermieter: Anna Vermieter (anna@vermieter.de). Datum: 09.02.2024',
        unresolvedPlaceholders: ['@haus.ort'],
        success: true
      }

      mockTemplateProcessor.processTemplate.mockReturnValue(expectedResult)

      render(
        <TemplatePreview
          template={templates.mixed}
          context={mixedContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith({
          isValid: false,
          errors: [],
          warnings: [
            'Unaufgelöster Platzhalter: @haus.ort',
            'Einige Platzhalter konnten nicht aufgelöst werden'
          ],
          placeholders: expect.any(Array)
        })
      })

      expect(screen.getByText('1 unaufgelöste Platzhalter')).toBeInTheDocument()
    })

    it('should handle entity relationship filtering with mixed data', async () => {
      const user = userEvent.setup()

      mockUseModalStore.mockReturnValue({
        isTemplateUsageModalOpen: true,
        templateUsageModalData: {
          template: templates.mixed,
          onGenerate: mockOnGenerate
        },
        closeTemplateUsageModal: mockCloseModal,
      } as any)

      // Mock entity loading with mixed completeness
      const mixedMieter = [completeEntities.mieter, partialEntities.mieter]
      const mixedWohnungen = [completeEntities.wohnung, partialEntities.wohnung]
      const mixedHaeuser = [completeEntities.haus, partialEntities.haus]

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mixedMieter)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mixedWohnungen)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mixedHaeuser)
        })

      render(<TemplateUsageModal />)

      await waitFor(() => {
        expect(screen.queryByText('Lade verfügbare Entitäten...')).not.toBeInTheDocument()
      })

      // Should show all available entities
      const mieterSelect = screen.getByRole('combobox', { name: /mieter/i })
      await user.click(mieterSelect)
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
      expect(screen.getByText('Anna Schmidt')).toBeInTheDocument()

      // Select mieter with complete data
      await user.click(screen.getByText('Max Mustermann'))

      const wohnungSelect = screen.getByRole('combobox', { name: /wohnung/i })
      await user.click(wohnungSelect)
      expect(screen.getByText('Wohnung 2A')).toBeInTheDocument()
      expect(screen.getByText('Wohnung 1B')).toBeInTheDocument()

      // Select wohnung with partial data
      await user.click(screen.getByText('Wohnung 1B'))

      const hausSelect = screen.getByRole('combobox', { name: /haus/i })
      await user.click(hausSelect)
      expect(screen.getByText('Musterhaus')).toBeInTheDocument()
      expect(screen.getByText('Beispielhaus')).toBeInTheDocument()
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle template processing errors gracefully', async () => {
      const context: TemplateContext = {
        mieter: completeEntities.mieter,
        datum: new Date('2024-02-09T10:00:00Z')
      }

      const errorResult: TemplateProcessingResult = {
        processedContent: templates.minimal.inhalt,
        unresolvedPlaceholders: [],
        success: false,
        errors: ['Processing failed due to invalid placeholder syntax']
      }

      mockTemplateProcessor.processTemplate.mockReturnValue(errorResult)

      render(
        <TemplatePreview
          template={templates.minimal}
          context={context}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockOnValidationChange).toHaveBeenCalledWith({
          isValid: false,
          errors: ['Processing failed due to invalid placeholder syntax'],
          warnings: [],
          placeholders: expect.any(Array)
        })
      })

      expect(screen.getByText('Verarbeitungsfehler')).toBeInTheDocument()
    })

    it('should handle null or undefined context values', async () => {
      const nullContext: TemplateContext = {
        mieter: null as any,
        wohnung: undefined as any,
        datum: new Date('2024-02-09T10:00:00Z')
      }

      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: 'Hallo [Mieter Name], heute ist 09.02.2024.',
        unresolvedPlaceholders: ['@mieter.name'],
        success: true
      })

      render(
        <TemplatePreview
          template={templates.minimal}
          context={nullContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledWith(
          templates.minimal.inhalt,
          nullContext
        )
      })

      // Should handle null/undefined gracefully
      expect(screen.getByText('1 unaufgelöste Platzhalter')).toBeInTheDocument()
    })

    it('should handle very large context data sets', async () => {
      const largeContext: TemplateContext = {
        mieter: {
          ...completeEntities.mieter,
          nebenkosten: Array.from({ length: 1000 }, (_, i) => ({
            id: `nk-${i}`,
            amount: `${100 + i}.00`,
            date: `2024-${String(i % 12 + 1).padStart(2, '0')}-01`
          }))
        },
        datum: new Date('2024-02-09T10:00:00Z')
      }

      mockTemplateProcessor.processTemplate.mockReturnValue({
        processedContent: 'Hallo Max Mustermann, heute ist 09.02.2024.',
        unresolvedPlaceholders: [],
        success: true
      })

      render(
        <TemplatePreview
          template={templates.minimal}
          context={largeContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledWith(
          templates.minimal.inhalt,
          largeContext
        )
      })

      // Should handle large data sets without performance issues
      expect(screen.getByText(/Erfolgreich verarbeitet/)).toBeInTheDocument()
    })
  })
})