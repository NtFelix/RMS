/**
 * Tests for Template Content Validation Feedback Components
 * 
 * Tests for visual feedback components including validation summaries,
 * real-time feedback, and interactive validation features.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import {
  ValidationFeedback,
  RealTimeValidationFeedback,
  ValidationScore,
  ValidationRuleConfig
} from '../../components/template-content-validation-feedback'
import type {
  ContentValidationSummary,
  ContentValidationRule
} from '../../lib/template-content-validation-system'
import type {
  RealTimeValidationResult
} from '../../lib/template-real-time-validation'

// Mock data
const mockValidationSummary: ContentValidationSummary = {
  isValid: false,
  score: 75,
  totalIssues: 5,
  errorCount: 2,
  warningCount: 2,
  infoCount: 1,
  issuesByCategory: {
    structure: [
      {
        ruleId: 'empty_content',
        severity: 'error',
        message: 'Inhalt darf nicht leer sein',
        description: 'Fügen Sie Text oder andere Inhalte hinzu',
        quickFix: {
          label: 'Beispieltext hinzufügen',
          action: jest.fn(),
          description: 'Fügt einen Beispieltext hinzu'
        }
      },
      {
        ruleId: 'missing_headings',
        severity: 'warning',
        message: 'Langer Inhalt ohne Überschriften',
        description: 'Fügen Sie Überschriften hinzu, um den Inhalt zu strukturieren',
        suggestion: 'Verwenden Sie Überschriften, um den Text in Abschnitte zu gliedern'
      }
    ],
    variables: [
      {
        ruleId: 'invalid_variables',
        severity: 'error',
        message: 'Ungültige Variable: invalid-var!',
        description: 'Variable entspricht nicht dem gültigen Format'
      },
      {
        ruleId: 'unused_variables',
        severity: 'info',
        message: '1 ungenutzte Variablen: unused_var',
        description: 'Diese Variablen werden nicht im Inhalt verwendet',
        suggestion: 'Entfernen Sie ungenutzte Variablen oder verwenden Sie sie im Inhalt'
      }
    ],
    content: [
      {
        ruleId: 'content_too_short',
        severity: 'warning',
        message: 'Sehr kurzer Inhalt',
        description: 'Fügen Sie mehr Text oder Variablen hinzu',
        suggestion: 'Erweitern Sie den Inhalt für bessere Nutzbarkeit'
      }
    ]
  },
  recommendations: [
    'Beheben Sie 2 kritische Fehler vor der Verwendung',
    'Überprüfen Sie 2 Warnungen für bessere Qualität',
    'Template benötigt Überarbeitung für optimale Qualität'
  ]
}

const mockRealTimeResult: RealTimeValidationResult = {
  isValid: false,
  errors: [
    {
      field: 'content',
      message: 'Inhalt darf nicht leer sein',
      code: 'EMPTY_CONTENT',
      severity: 'error',
      position: { start: 0, end: 0 },
      quickFix: {
        label: 'Text hinzufügen',
        action: jest.fn(),
        description: 'Fügt Beispieltext hinzu'
      }
    }
  ],
  warnings: [
    {
      field: 'content',
      message: 'Sehr kurzer Inhalt',
      code: 'CONTENT_TOO_SHORT',
      severity: 'warning',
      suggestion: 'Fügen Sie mehr Text hinzu'
    }
  ],
  suggestions: [
    {
      field: 'content',
      message: 'Inhalt könnte von Variablen profitieren',
      code: 'CONTENT_NO_VARIABLES',
      action: 'suggest_variables',
      actionLabel: 'Variablen vorschlagen',
      priority: 'low'
    }
  ]
}

const mockValidationRules: ContentValidationRule[] = [
  {
    id: 'empty_content',
    name: 'Empty Content',
    description: 'Content should not be empty',
    severity: 'error',
    category: 'structure',
    enabled: true,
    validate: jest.fn()
  },
  {
    id: 'missing_headings',
    name: 'Missing Headings',
    description: 'Long content should have headings',
    severity: 'warning',
    category: 'structure',
    enabled: true,
    validate: jest.fn()
  },
  {
    id: 'invalid_variables',
    name: 'Invalid Variables',
    description: 'Variables must be valid',
    severity: 'error',
    category: 'variables',
    enabled: false,
    validate: jest.fn()
  }
]

describe('ValidationFeedback', () => {
  const defaultProps = {
    summary: mockValidationSummary,
    onIssueClick: jest.fn(),
    onQuickFix: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render validation summary correctly', () => {
    render(<ValidationFeedback {...defaultProps} />)

    expect(screen.getByText('Validierungsergebnis')).toBeInTheDocument()
    expect(screen.getByText('75/100')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // Error count
    expect(screen.getByText('Fehler')).toBeInTheDocument()
  })

  it('should display validation score with correct styling', () => {
    render(<ValidationFeedback {...defaultProps} />)

    const scoreElement = screen.getByText('75/100')
    expect(scoreElement).toHaveClass('text-yellow-600') // Score between 70-90
  })

  it('should show issues grouped by category', async () => {
    const user = userEvent.setup()
    render(<ValidationFeedback {...defaultProps} showDetails={true} />)

    // Check if categories are displayed
    expect(screen.getByText('Struktur')).toBeInTheDocument()
    expect(screen.getByText('Variablen')).toBeInTheDocument()
    expect(screen.getByText('Inhalt')).toBeInTheDocument()

    // Categories should be collapsible
    const structureButton = screen.getByRole('button', { name: /struktur/i })
    await user.click(structureButton)

    // Should show issues in the category
    expect(screen.getByText('Inhalt darf nicht leer sein')).toBeInTheDocument()
  })

  it('should handle quick fix actions', async () => {
    const user = userEvent.setup()
    render(<ValidationFeedback {...defaultProps} showDetails={true} />)

    // Expand structure category to see issues
    const structureButton = screen.getByRole('button', { name: /struktur/i })
    await user.click(structureButton)

    // Find and click quick fix button
    const quickFixButton = screen.getByText('Beispieltext hinzufügen')
    await user.click(quickFixButton)

    expect(defaultProps.onQuickFix).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleId: 'empty_content',
        message: 'Inhalt darf nicht leer sein'
      })
    )
  })

  it('should display recommendations', () => {
    render(<ValidationFeedback {...defaultProps} showDetails={true} />)

    expect(screen.getByText(/Empfehlungen/)).toBeInTheDocument()
    expect(screen.getByText(/Überprüfen Sie 2 Warnungen/)).toBeInTheDocument()
  })

  it('should handle valid content correctly', () => {
    const validSummary: ContentValidationSummary = {
      isValid: true,
      score: 95,
      totalIssues: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      issuesByCategory: {},
      recommendations: ['Ausgezeichnete Template-Qualität!']
    }

    render(<ValidationFeedback summary={validSummary} />)

    expect(screen.getByText('95/100')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument() // Error count should be 0
  })

  it('should not show details when showDetails is false', () => {
    render(<ValidationFeedback {...defaultProps} showDetails={false} />)

    expect(screen.queryByText('Probleme nach Kategorie')).not.toBeInTheDocument()
    expect(screen.queryByText('Struktur')).not.toBeInTheDocument()
  })
})

describe('RealTimeValidationFeedback', () => {
  const defaultProps = {
    result: mockRealTimeResult,
    onErrorClick: jest.fn(),
    onQuickFix: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render real-time validation results', () => {
    render(<RealTimeValidationFeedback {...defaultProps} />)

    expect(screen.getByText('Fehler (1)')).toBeInTheDocument()
    expect(screen.getByText('Warnungen (1)')).toBeInTheDocument()
    expect(screen.getByText('Vorschläge (1)')).toBeInTheDocument()
  })

  it('should display errors with quick fix buttons', async () => {
    const user = userEvent.setup()
    render(<RealTimeValidationFeedback {...defaultProps} />)

    expect(screen.getByText('Inhalt darf nicht leer sein')).toBeInTheDocument()
    
    const quickFixButton = screen.getByText('Text hinzufügen')
    await user.click(quickFixButton)

    expect(defaultProps.onQuickFix).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Inhalt darf nicht leer sein',
        code: 'EMPTY_CONTENT'
      })
    )
  })

  it('should render inline feedback correctly', () => {
    render(<RealTimeValidationFeedback {...defaultProps} inline={true} />)

    // Should show compact inline format
    expect(screen.getByText('1')).toBeInTheDocument() // Error count
    expect(screen.getByText('1')).toBeInTheDocument() // Warning count
  })

  it('should show valid state when no issues', () => {
    const validResult: RealTimeValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    }

    render(<RealTimeValidationFeedback result={validResult} inline={true} />)

    expect(screen.getByText('Gültig')).toBeInTheDocument()
  })

  it('should handle tooltips in inline mode', async () => {
    const user = userEvent.setup()
    render(<RealTimeValidationFeedback {...defaultProps} inline={true} />)

    // Hover over error indicator to see tooltip
    const errorIndicator = screen.getByText('1')
    await user.hover(errorIndicator)

    await waitFor(() => {
      expect(screen.getByText('Inhalt darf nicht leer sein')).toBeInTheDocument()
    })
  })
})

describe('ValidationScore', () => {
  it('should display score with correct color coding', () => {
    const { rerender } = render(<ValidationScore score={95} totalIssues={0} />)
    expect(screen.getByText('95/100')).toHaveClass('text-green-600')

    rerender(<ValidationScore score={75} totalIssues={3} />)
    expect(screen.getByText('75/100')).toHaveClass('text-yellow-600')

    rerender(<ValidationScore score={45} totalIssues={10} />)
    expect(screen.getByText('45/100')).toHaveClass('text-destructive')
  })

  it('should show appropriate score labels', () => {
    const { rerender } = render(<ValidationScore score={95} totalIssues={0} showDetails={true} />)
    expect(screen.getByText('Ausgezeichnet')).toBeInTheDocument()

    rerender(<ValidationScore score={80} totalIssues={2} showDetails={true} />)
    expect(screen.getByText('Sehr gut')).toBeInTheDocument()

    rerender(<ValidationScore score={65} totalIssues={5} showDetails={true} />)
    expect(screen.getByText('Gut')).toBeInTheDocument()

    rerender(<ValidationScore score={40} totalIssues={10} showDetails={true} />)
    expect(screen.getByText('Kritisch')).toBeInTheDocument()
  })

  it('should hide details when showDetails is false', () => {
    render(<ValidationScore score={95} totalIssues={0} showDetails={false} />)
    
    expect(screen.queryByText('Ausgezeichnet')).not.toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})

describe('ValidationRuleConfig', () => {
  const defaultProps = {
    rules: mockValidationRules,
    enabledRules: new Set(['empty_content', 'missing_headings']),
    onRuleToggle: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render validation rules configuration', () => {
    render(<ValidationRuleConfig {...defaultProps} />)

    expect(screen.getByText('Validierungsregeln')).toBeInTheDocument()
    expect(screen.getByText('Konfigurieren Sie, welche Validierungsregeln angewendet werden sollen')).toBeInTheDocument()
  })

  it('should group rules by category', async () => {
    const user = userEvent.setup()
    render(<ValidationRuleConfig {...defaultProps} />)

    expect(screen.getByText('Struktur')).toBeInTheDocument()
    expect(screen.getByText('Variablen')).toBeInTheDocument()

    // Expand structure category
    const structureButton = screen.getByRole('button', { name: /struktur/i })
    await user.click(structureButton)

    expect(screen.getByText('Empty Content')).toBeInTheDocument()
    expect(screen.getByText('Missing Headings')).toBeInTheDocument()
  })

  it('should handle rule toggling', async () => {
    const user = userEvent.setup()
    render(<ValidationRuleConfig {...defaultProps} />)

    // Expand structure category
    const structureButton = screen.getByRole('button', { name: /struktur/i })
    await user.click(structureButton)

    // Find and toggle a rule
    const emptyContentCheckbox = screen.getByRole('checkbox', { name: /empty content/i })
    expect(emptyContentCheckbox).toBeChecked()

    await user.click(emptyContentCheckbox)

    expect(defaultProps.onRuleToggle).toHaveBeenCalledWith('empty_content', false)
  })

  it('should show/hide disabled rules', async () => {
    const user = userEvent.setup()
    render(<ValidationRuleConfig {...defaultProps} />)

    // Initially should only show enabled rules
    expect(screen.queryByText('Invalid Variables')).not.toBeInTheDocument()

    // Click "Alle anzeigen" to show disabled rules
    const showAllButton = screen.getByText('Alle anzeigen')
    await user.click(showAllButton)

    // Now should show disabled rules
    expect(screen.getByText('Aktive anzeigen')).toBeInTheDocument()
    
    // Expand variables category to see disabled rule
    const variablesButton = screen.getByRole('button', { name: /variablen/i })
    await user.click(variablesButton)

    expect(screen.getByText('Invalid Variables')).toBeInTheDocument()
  })

  it('should display rule severity badges correctly', async () => {
    const user = userEvent.setup()
    render(<ValidationRuleConfig {...defaultProps} />)

    // Expand structure category
    const structureButton = screen.getByRole('button', { name: /struktur/i })
    await user.click(structureButton)

    // Check severity badges
    const errorBadge = screen.getByText('error')
    const warningBadge = screen.getByText('warning')

    expect(errorBadge).toHaveClass('text-destructive')
    expect(warningBadge).toHaveClass('text-yellow-600')
  })

  it('should handle empty rules list', () => {
    render(<ValidationRuleConfig {...defaultProps} rules={[]} />)

    expect(screen.getByText('Validierungsregeln')).toBeInTheDocument()
    // Should not crash with empty rules
  })
})

describe('Component Integration', () => {
  it('should work together in a complete validation workflow', async () => {
    const user = userEvent.setup()
    const onQuickFix = jest.fn()

    const { rerender } = render(
      <div>
        <ValidationFeedback 
          summary={mockValidationSummary} 
          onQuickFix={onQuickFix}
          showDetails={true}
        />
        <RealTimeValidationFeedback 
          result={mockRealTimeResult}
          onQuickFix={onQuickFix}
        />
      </div>
    )

    // Both components should be rendered
    expect(screen.getByText('Validierungsergebnis')).toBeInTheDocument()
    expect(screen.getByText('Fehler (1)')).toBeInTheDocument()

    // Quick fix should work from both components
    const quickFixButtons = screen.getAllByText(/hinzufügen|Text hinzufügen/)
    expect(quickFixButtons.length).toBeGreaterThan(0)

    await user.click(quickFixButtons[0])
    expect(onQuickFix).toHaveBeenCalled()
  })

  it('should handle state changes correctly', () => {
    const { rerender } = render(
      <ValidationFeedback summary={mockValidationSummary} />
    )

    expect(screen.getByText('75/100')).toBeInTheDocument()

    // Update with better score
    const improvedSummary: ContentValidationSummary = {
      ...mockValidationSummary,
      score: 90,
      errorCount: 0,
      isValid: true
    }

    rerender(<ValidationFeedback summary={improvedSummary} />)

    expect(screen.getByText('90/100')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument() // Error count
  })

  it('should be accessible', () => {
    render(
      <div>
        <ValidationFeedback summary={mockValidationSummary} showDetails={true} />
        <ValidationScore score={75} totalIssues={5} showDetails={true} />
      </div>
    )

    // Check for proper ARIA labels and roles
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(3) // Category buttons
  })
})