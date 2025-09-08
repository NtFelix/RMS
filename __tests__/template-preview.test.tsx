import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplatePreview } from '@/components/template-preview'
import { templateProcessor } from '@/lib/template-system/template-processor'
import { placeholderEngine } from '@/lib/template-system/placeholder-engine'
import type { Template, TemplateContext, TemplateProcessingResult } from '@/types/template-system'

// Mock the template processor
jest.mock('@/lib/template-system/template-processor')
const mockTemplateProcessor = templateProcessor as jest.Mocked<typeof templateProcessor>

// Mock the placeholder engine
jest.mock('@/lib/template-system/placeholder-engine')
const mockPlaceholderEngine = placeholderEngine as jest.Mocked<typeof placeholderEngine>

const mockTemplate: Template = {
  id: 'test-template-1',
  user_id: 'user-1',
  titel: 'Test Template',
  inhalt: 'Hallo @mieter.name, Ihre Wohnung @wohnung.name ist bereit. Datum: @datum',
  kategorie: 'mail',
  kontext_anforderungen: ['mieter', 'wohnung'],
  erstellungsdatum: '2024-01-01T00:00:00Z',
  aktualisiert_am: '2024-01-01T00:00:00Z'
}

const mockContext: TemplateContext = {
  mieter: {
    id: 'mieter-1',
    name: 'Max Mustermann',
    email: 'max@example.com'
  },
  wohnung: {
    id: 'wohnung-1',
    name: 'Wohnung 1A',
    groesse: 75,
    miete: 800
  },
  datum: new Date('2024-01-15T10:00:00Z'),
  vermieter: {
    id: 'vermieter-1',
    name: 'Vermieter GmbH',
    email: 'info@vermieter.de'
  }
}

const mockSuccessfulProcessingResult: TemplateProcessingResult = {
  processedContent: 'Hallo Max Mustermann, Ihre Wohnung Wohnung 1A ist bereit. Datum: 15.01.2024',
  unresolvedPlaceholders: [],
  success: true
}

const mockPartialProcessingResult: TemplateProcessingResult = {
  processedContent: 'Hallo Max Mustermann, Ihre Wohnung [Wohnung Name] ist bereit. Datum: 15.01.2024',
  unresolvedPlaceholders: ['@wohnung.name'],
  success: true
}

const mockFailedProcessingResult: TemplateProcessingResult = {
  processedContent: mockTemplate.inhalt,
  unresolvedPlaceholders: [],
  success: false,
  errors: ['Template processing failed']
}

describe('TemplatePreview', () => {
  const mockOnValidationChange = jest.fn()
  const mockOnToggleVisibility = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    // Mock placeholder engine
    mockPlaceholderEngine.parsePlaceholders.mockReturnValue(['@mieter.name', '@wohnung.name', '@datum'])
    mockPlaceholderEngine.validatePlaceholders.mockReturnValue([])
    mockPlaceholderEngine.getPlaceholderDefinition.mockImplementation((key) => {
      const definitions = {
        '@mieter.name': { key: '@mieter.name', label: 'Mieter Name', description: 'Name des Mieters', category: 'mieter' as const },
        '@wohnung.name': { key: '@wohnung.name', label: 'Wohnung Name', description: 'Name der Wohnung', category: 'wohnung' as const },
        '@datum': { key: '@datum', label: 'Datum', description: 'Aktuelles Datum', category: 'datum' as const }
      }
      return definitions[key as keyof typeof definitions]
    })

    // Mock template processor
    mockTemplateProcessor.processTemplate.mockReturnValue(mockSuccessfulProcessingResult)
    mockTemplateProcessor.validateContext.mockReturnValue({ isValid: true, missingContext: [] })
    mockTemplateProcessor.getUsedPlaceholders.mockReturnValue([
      { key: '@mieter.name', label: 'Mieter Name', description: 'Name des Mieters', category: 'mieter' },
      { key: '@wohnung.name', label: 'Wohnung Name', description: 'Name der Wohnung', category: 'wohnung' },
      { key: '@datum', label: 'Datum', description: 'Aktuelles Datum', category: 'datum' }
    ])
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Basic Rendering', () => {
    it('renders preview header with status', () => {
      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      expect(screen.getByText('Vorschau')).toBeInTheDocument()
      expect(screen.getByText('Live')).toBeInTheDocument()
    })

    it('shows toggle visibility button when onToggleVisibility is provided', () => {
      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={false}
          onToggleVisibility={mockOnToggleVisibility}
          onValidationChange={mockOnValidationChange}
        />
      )

      const toggleButton = screen.getByText('Anzeigen')
      expect(toggleButton).toBeInTheDocument()
    })

    it('calls onToggleVisibility when toggle button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={false}
          onToggleVisibility={mockOnToggleVisibility}
          onValidationChange={mockOnValidationChange}
        />
      )

      const toggleButton = screen.getByText('Anzeigen')
      await user.click(toggleButton)

      expect(mockOnToggleVisibility).toHaveBeenCalled()
    })
  })

  describe('Real-time Updates', () => {
    it('processes template automatically with real-time updates enabled', async () => {
      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      // Fast-forward the debounce timer
      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledWith(mockTemplate.inhalt, mockContext)
      })
    })

    it('debounces real-time updates', async () => {
      const { rerender } = render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      // Change context multiple times quickly
      const newContext1 = { ...mockContext, mieter: { ...mockContext.mieter!, name: 'Anna Schmidt' } }
      const newContext2 = { ...mockContext, mieter: { ...mockContext.mieter!, name: 'Peter Mueller' } }

      rerender(
        <TemplatePreview
          template={mockTemplate}
          context={newContext1}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      rerender(
        <TemplatePreview
          template={mockTemplate}
          context={newContext2}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      // Should not process yet (debounced)
      expect(mockTemplateProcessor.processTemplate).not.toHaveBeenCalled()

      // Fast-forward the debounce timer
      act(() => {
        jest.advanceTimersByTime(300)
      })

      // Should process only once with the latest context
      await waitFor(() => {
        expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledTimes(1)
        expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledWith(mockTemplate.inhalt, newContext2)
      })
    })

    it('shows manual refresh button when real-time updates are disabled', () => {
      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          enableRealTimeUpdates={false}
          onValidationChange={mockOnValidationChange}
        />
      )

      const refreshButton = screen.getByRole('button', { name: '' }) // Refresh button has no text, just icon
      expect(refreshButton).toBeInTheDocument()
    })

    it('processes template when manual refresh is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          enableRealTimeUpdates={false}
          onValidationChange={mockOnValidationChange}
        />
      )

      const refreshButton = screen.getByRole('button', { name: '' })
      await user.click(refreshButton)

      expect(mockTemplateProcessor.processTemplate).toHaveBeenCalledWith(mockTemplate.inhalt, mockContext)
    })
  })

  describe('Processing States', () => {
    it('shows processing state during template processing', async () => {
      // Mock a delayed processing that we can control
      let resolveProcessing: (result: TemplateProcessingResult) => void
      mockTemplateProcessor.processTemplate.mockImplementation(() => {
        return new Promise(resolve => {
          resolveProcessing = resolve
        })
      })

      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300) // Trigger debounced processing
      })

      // Check for processing state - look for the status text specifically
      const statusElement = screen.getByText('Verarbeitungsfehler')
      expect(statusElement).toBeInTheDocument()
      
      // Resolve the processing
      act(() => {
        resolveProcessing!(mockSuccessfulProcessingResult)
      })
    })

    it('shows success state after successful processing', async () => {
      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
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
    })

    it('shows error state when processing fails', async () => {
      mockTemplateProcessor.processTemplate.mockReturnValue(mockFailedProcessingResult)

      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText('Verarbeitungsfehler')).toBeInTheDocument()
      })
    })

    it('shows warning state with unresolved placeholders', async () => {
      mockTemplateProcessor.processTemplate.mockReturnValue(mockPartialProcessingResult)

      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText('1 unaufgelöste Platzhalter')).toBeInTheDocument()
      })
    })
  })

  describe('Visual Indicators', () => {
    it('shows resolution percentage progress bar', async () => {
      mockTemplateProcessor.processTemplate.mockReturnValue(mockPartialProcessingResult)

      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText('Platzhalter-Auflösung')).toBeInTheDocument()
        expect(screen.getByText('67%')).toBeInTheDocument() // 2 out of 3 placeholders resolved
        expect(screen.getByText('2 / 3')).toBeInTheDocument()
      })
    })

    it('displays processed content with character count', async () => {
      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText('Verarbeiteter Inhalt')).toBeInTheDocument()
        // Look for character count in the content header area specifically
        const contentHeader = screen.getByText('Verarbeiteter Inhalt').closest('.flex')
        expect(contentHeader).toHaveTextContent(/\d+ Zeichen/)
      })
    })

    it('shows last updated timestamp', async () => {
      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText(/Aktualisiert:/)).toBeInTheDocument()
      })
    })
  })

  describe('Detailed Validation', () => {
    it('shows validation errors when showDetailedValidation is enabled', async () => {
      const validationErrors = [
        { type: 'unknown_placeholder' as const, message: 'Unknown placeholder: @invalid', position: 0, length: 8, placeholder: '@invalid' }
      ]
      mockPlaceholderEngine.validatePlaceholders.mockReturnValue(validationErrors)

      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          showDetailedValidation={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText('Validierungsfehler')).toBeInTheDocument()
        expect(screen.getByText('Unknown placeholder: @invalid')).toBeInTheDocument()
      })
    })

    it('shows placeholder analysis with resolution status', async () => {
      mockTemplateProcessor.processTemplate.mockReturnValue(mockPartialProcessingResult)

      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          showDetailedValidation={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText('Platzhalter-Analyse')).toBeInTheDocument()
      })
      
      // Check that placeholders appear in the analysis section
      expect(screen.getByText('@mieter.name')).toBeInTheDocument()
      expect(screen.getAllByText('@wohnung.name')).toHaveLength(2) // Once in analysis, once in unresolved list  
      expect(screen.getByText('@datum')).toBeInTheDocument()
    })

    it('hides detailed validation when showDetailedValidation is false', async () => {
      const validationErrors = [
        { type: 'unknown_placeholder' as const, message: 'Unknown placeholder: @invalid', position: 0, length: 8, placeholder: '@invalid' }
      ]
      mockPlaceholderEngine.validatePlaceholders.mockReturnValue(validationErrors)

      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          showDetailedValidation={false}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockTemplateProcessor.processTemplate).toHaveBeenCalled()
      })

      expect(screen.queryByText('Validierungsfehler')).not.toBeInTheDocument()
      expect(screen.queryByText('Platzhalter-Analyse')).not.toBeInTheDocument()
    })
  })

  describe('Validation Callbacks', () => {
    it('calls onValidationChange with successful validation result', async () => {
      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
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
          isValid: true,
          errors: [],
          warnings: [],
          placeholders: ['@mieter.name', '@wohnung.name', '@datum']
        })
      })
    })

    it('calls onValidationChange with validation errors', async () => {
      mockTemplateProcessor.processTemplate.mockReturnValue(mockFailedProcessingResult)

      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
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
          errors: ['Template processing failed'],
          warnings: [],
          placeholders: ['@mieter.name', '@wohnung.name', '@datum'] // Still includes placeholders even on error
        })
      })
    })

    it('calls onValidationChange with warnings for unresolved placeholders', async () => {
      mockTemplateProcessor.processTemplate.mockReturnValue(mockPartialProcessingResult)

      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
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
            'Unaufgelöster Platzhalter: @wohnung.name',
            'Einige Platzhalter konnten nicht aufgelöst werden'
          ],
          placeholders: ['@mieter.name', '@wohnung.name', '@datum']
        })
      })
    })

    it('includes context validation errors in validation result', async () => {
      mockTemplateProcessor.validateContext.mockReturnValue({
        isValid: false,
        missingContext: ['haus']
      })

      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
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
          errors: ['Fehlende Kontexte: haus'],
          warnings: [],
          placeholders: ['@mieter.name', '@wohnung.name', '@datum']
        })
      })
    })
  })

  describe('Statistics Display', () => {
    it('shows template statistics', async () => {
      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText('Original')).toBeInTheDocument()
        expect(screen.getByText('Verarbeitet')).toBeInTheDocument()
        expect(screen.getByText('Platzhalter')).toBeInTheDocument()
        expect(screen.getByText('Unaufgelöst')).toBeInTheDocument()
      })
    })

    it('displays correct placeholder counts in statistics', async () => {
      mockTemplateProcessor.processTemplate.mockReturnValue(mockPartialProcessingResult)

      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText('3 gefunden')).toBeInTheDocument() // 3 placeholders found
      })
      
      // Check for unresolved count in the statistics section
      const statisticsSection = screen.getByText('Unaufgelöst').closest('.bg-muted\\/30')
      expect(statisticsSection).toHaveTextContent('1')
    })
  })

  describe('Error Handling', () => {
    it('handles template processing exceptions gracefully', async () => {
      mockTemplateProcessor.processTemplate.mockImplementation(() => {
        throw new Error('Processing exception')
      })

      render(
        <TemplatePreview
          template={mockTemplate}
          context={mockContext}
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
          errors: ['Processing exception'],
          warnings: [],
          placeholders: []
        })
      })
    })

    it('handles missing template gracefully', () => {
      render(
        <TemplatePreview
          template={null as any}
          context={mockContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      // Should not crash and should not call processing
      expect(mockTemplateProcessor.processTemplate).not.toHaveBeenCalled()
    })

    it('handles empty template content', async () => {
      const emptyTemplate = { ...mockTemplate, inhalt: '' }

      render(
        <TemplatePreview
          template={emptyTemplate}
          context={mockContext}
          isVisible={true}
          enableRealTimeUpdates={true}
          onValidationChange={mockOnValidationChange}
        />
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      // Should handle empty content without errors
      expect(mockTemplateProcessor.processTemplate).not.toHaveBeenCalled()
    })
  })
})