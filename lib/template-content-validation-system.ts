/**
 * Comprehensive Template Content Validation System
 * 
 * Provides comprehensive validation rules for template content with real-time
 * validation, visual feedback, variable usage validation, and error reporting.
 * This system extends the existing validation infrastructure to provide
 * enhanced content validation capabilities.
 */

import { z } from 'zod'
import { 
  ValidationResult,
  ValidationError,
  ValidationWarning
} from './template-validation'
import { 
  RealTimeValidationResult,
  RealTimeValidationError,
  RealTimeValidationWarning,
  RealTimeValidationSuggestion,
  QuickFix
} from './template-real-time-validation'
import { extractVariablesFromContent } from './template-variable-extraction'
import { getVariableById, isValidVariableId } from './template-variables'
import { VALIDATION_LIMITS, VALIDATION_PATTERNS } from './template-validation-schemas'

// Content validation rule types
export interface ContentValidationRule {
  id: string
  name: string
  description: string
  severity: 'error' | 'warning' | 'info'
  category: 'structure' | 'content' | 'variables' | 'formatting' | 'accessibility'
  enabled: boolean
  validate: (content: any, context?: ContentValidationContext) => ContentValidationIssue[]
}

export interface ContentValidationIssue {
  ruleId: string
  severity: 'error' | 'warning' | 'info'
  message: string
  description?: string
  position?: ContentPosition
  quickFix?: QuickFix
  suggestion?: string
}

export interface ContentPosition {
  nodeIndex?: number
  textOffset?: number
  length?: number
  path?: string[] // Path to the node in the content tree
}

export interface ContentValidationContext {
  templateId?: string
  userId?: string
  existingVariables?: string[]
  requiredVariables?: string[]
  allowedVariables?: string[]
  maxContentLength?: number
  minContentLength?: number
  strictMode?: boolean
}

export interface ContentValidationSummary {
  isValid: boolean
  score: number // 0-100
  totalIssues: number
  errorCount: number
  warningCount: number
  infoCount: number
  issuesByCategory: Record<string, ContentValidationIssue[]>
  recommendations: string[]
}

/**
 * Comprehensive Content Validation System
 */
export class ContentValidationSystem {
  private rules: Map<string, ContentValidationRule> = new Map()
  private enabledRules: Set<string> = new Set()

  constructor() {
    this.initializeDefaultRules()
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: ContentValidationRule[] = [
      // Structure validation rules
      {
        id: 'empty_content',
        name: 'Empty Content',
        description: 'Content should not be empty',
        severity: 'error',
        category: 'structure',
        enabled: true,
        validate: this.validateEmptyContent.bind(this)
      },
      {
        id: 'invalid_structure',
        name: 'Invalid Structure',
        description: 'Content must have valid TipTap document structure',
        severity: 'error',
        category: 'structure',
        enabled: true,
        validate: this.validateContentStructure.bind(this)
      },
      {
        id: 'missing_headings',
        name: 'Missing Headings',
        description: 'Long content should have headings for better structure',
        severity: 'warning',
        category: 'structure',
        enabled: true,
        validate: this.validateHeadingStructure.bind(this)
      },
      {
        id: 'empty_paragraphs',
        name: 'Empty Paragraphs',
        description: 'Remove unnecessary empty paragraphs',
        severity: 'info',
        category: 'structure',
        enabled: true,
        validate: this.validateEmptyParagraphs.bind(this)
      },

      // Content validation rules
      {
        id: 'content_too_short',
        name: 'Content Too Short',
        description: 'Content should have meaningful length',
        severity: 'warning',
        category: 'content',
        enabled: true,
        validate: this.validateContentLength.bind(this)
      },
      {
        id: 'content_too_long',
        name: 'Content Too Long',
        description: 'Very long content may cause performance issues',
        severity: 'warning',
        category: 'content',
        enabled: true,
        validate: this.validateContentSize.bind(this)
      },
      {
        id: 'duplicate_content',
        name: 'Duplicate Content',
        description: 'Avoid repetitive content blocks',
        severity: 'info',
        category: 'content',
        enabled: true,
        validate: this.validateDuplicateContent.bind(this)
      },

      // Variable validation rules
      {
        id: 'invalid_variables',
        name: 'Invalid Variables',
        description: 'All variables must be valid and properly formatted',
        severity: 'error',
        category: 'variables',
        enabled: true,
        validate: this.validateVariableUsage.bind(this)
      },
      {
        id: 'undefined_variables',
        name: 'Undefined Variables',
        description: 'Variables should be defined in the system',
        severity: 'warning',
        category: 'variables',
        enabled: true,
        validate: this.validateVariableDefinitions.bind(this)
      },
      {
        id: 'unused_variables',
        name: 'Unused Variables',
        description: 'Remove variables that are not used in content',
        severity: 'info',
        category: 'variables',
        enabled: true,
        validate: this.validateUnusedVariables.bind(this)
      },
      {
        id: 'missing_required_variables',
        name: 'Missing Required Variables',
        description: 'Required variables must be present in content',
        severity: 'error',
        category: 'variables',
        enabled: true,
        validate: this.validateRequiredVariables.bind(this)
      },

      // Formatting validation rules
      {
        id: 'inconsistent_formatting',
        name: 'Inconsistent Formatting',
        description: 'Maintain consistent formatting throughout content',
        severity: 'info',
        category: 'formatting',
        enabled: true,
        validate: this.validateFormattingConsistency.bind(this)
      },
      {
        id: 'excessive_formatting',
        name: 'Excessive Formatting',
        description: 'Avoid overuse of formatting options',
        severity: 'info',
        category: 'formatting',
        enabled: true,
        validate: this.validateExcessiveFormatting.bind(this)
      },

      // Accessibility validation rules
      {
        id: 'missing_alt_text',
        name: 'Missing Alt Text',
        description: 'Images should have alternative text for accessibility',
        severity: 'warning',
        category: 'accessibility',
        enabled: true,
        validate: this.validateImageAltText.bind(this)
      },
      {
        id: 'poor_heading_hierarchy',
        name: 'Poor Heading Hierarchy',
        description: 'Headings should follow proper hierarchical order',
        severity: 'warning',
        category: 'accessibility',
        enabled: true,
        validate: this.validateHeadingHierarchy.bind(this)
      }
    ]

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule)
      if (rule.enabled) {
        this.enabledRules.add(rule.id)
      }
    })
  }

  /**
   * Validate content with all enabled rules
   */
  validateContent(content: any, context?: ContentValidationContext): ContentValidationSummary {
    const allIssues: ContentValidationIssue[] = []
    const issuesByCategory: Record<string, ContentValidationIssue[]> = {}

    // Run all enabled validation rules
    for (const ruleId of this.enabledRules) {
      const rule = this.rules.get(ruleId)
      if (!rule) continue

      try {
        const issues = rule.validate(content, context)
        allIssues.push(...issues)

        // Group issues by category
        if (!issuesByCategory[rule.category]) {
          issuesByCategory[rule.category] = []
        }
        issuesByCategory[rule.category].push(...issues)
      } catch (error) {
        console.error(`Validation rule ${ruleId} failed:`, error)
        allIssues.push({
          ruleId,
          severity: 'error',
          message: `Validation rule failed: ${rule.name}`,
          description: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Calculate validation score
    const errorCount = allIssues.filter(i => i.severity === 'error').length
    const warningCount = allIssues.filter(i => i.severity === 'warning').length
    const infoCount = allIssues.filter(i => i.severity === 'info').length

    const score = this.calculateValidationScore(errorCount, warningCount, infoCount)
    const recommendations = this.generateRecommendations(allIssues, score)

    return {
      isValid: errorCount === 0,
      score,
      totalIssues: allIssues.length,
      errorCount,
      warningCount,
      infoCount,
      issuesByCategory,
      recommendations
    }
  }

  /**
   * Validate content with real-time feedback
   */
  validateContentRealTime(content: any, context?: ContentValidationContext): RealTimeValidationResult {
    const summary = this.validateContent(content, context)
    
    const errors: RealTimeValidationError[] = []
    const warnings: RealTimeValidationWarning[] = []
    const suggestions: RealTimeValidationSuggestion[] = []

    // Convert issues to real-time format
    Object.values(summary.issuesByCategory).flat().forEach(issue => {
      if (issue.severity === 'error') {
        errors.push({
          field: 'content',
          message: issue.message,
          code: issue.ruleId,
          severity: 'error',
          position: issue.position ? {
            start: issue.position.textOffset || 0,
            end: (issue.position.textOffset || 0) + (issue.position.length || 0)
          } : undefined,
          quickFix: issue.quickFix
        })
      } else if (issue.severity === 'warning') {
        warnings.push({
          field: 'content',
          message: issue.message,
          code: issue.ruleId,
          severity: 'warning',
          position: issue.position ? {
            start: issue.position.textOffset || 0,
            end: (issue.position.textOffset || 0) + (issue.position.length || 0)
          } : undefined,
          suggestion: issue.suggestion
        })
      } else {
        suggestions.push({
          field: 'content',
          message: issue.message,
          code: issue.ruleId,
          action: 'improve_content',
          actionLabel: 'Verbessern',
          priority: 'low'
        })
      }
    })

    return {
      isValid: summary.isValid,
      errors,
      warnings,
      suggestions
    }
  }

  /**
   * Get validation summary with detailed analysis
   */
  getValidationSummary(content: any, context?: ContentValidationContext): ContentValidationSummary {
    return this.validateContent(content, context)
  }

  /**
   * Enable or disable validation rules
   */
  configureRule(ruleId: string, enabled: boolean): void {
    if (this.rules.has(ruleId)) {
      if (enabled) {
        this.enabledRules.add(ruleId)
      } else {
        this.enabledRules.delete(ruleId)
      }
    }
  }

  /**
   * Add custom validation rule
   */
  addCustomRule(rule: ContentValidationRule): void {
    this.rules.set(rule.id, rule)
    if (rule.enabled) {
      this.enabledRules.add(rule.id)
    }
  }

  /**
   * Get all available rules
   */
  getAllRules(): ContentValidationRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * Get enabled rules
   */
  getEnabledRules(): ContentValidationRule[] {
    return Array.from(this.enabledRules)
      .map(id => this.rules.get(id))
      .filter(Boolean) as ContentValidationRule[]
  }

  // Validation rule implementations

  private validateEmptyContent(content: any): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []

    if (!content) {
      issues.push({
        ruleId: 'empty_content',
        severity: 'error',
        message: 'Inhalt darf nicht leer sein',
        description: 'Fügen Sie Text oder andere Inhalte hinzu',
        quickFix: {
          label: 'Beispieltext hinzufügen',
          action: () => {
            // This would be handled by the UI component
          },
          description: 'Fügt einen Beispieltext hinzu'
        }
      })
      return issues
    }

    // Check if content is effectively empty
    const textContent = this.extractTextContent(content)
    if (textContent.trim().length === 0) {
      const variableCount = this.countVariables(content)
      if (variableCount === 0) {
        issues.push({
          ruleId: 'empty_content',
          severity: 'error',
          message: 'Inhalt enthält keinen Text oder Variablen',
          description: 'Fügen Sie Text oder Variablen hinzu',
          quickFix: {
            label: 'Text hinzufügen',
            action: () => {
              // This would be handled by the UI component
            }
          }
        })
      }
    }

    return issues
  }

  private validateContentStructure(content: any): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []

    if (!content || typeof content !== 'object') {
      issues.push({
        ruleId: 'invalid_structure',
        severity: 'error',
        message: 'Ungültige Inhaltsstruktur',
        description: 'Inhalt muss ein gültiges TipTap-Dokument sein'
      })
      return issues
    }

    // Check for valid document structure
    if (content.type !== 'doc' && !Array.isArray(content)) {
      issues.push({
        ruleId: 'invalid_structure',
        severity: 'error',
        message: 'Ungültiges Dokumentformat',
        description: 'Dokument muss vom Typ "doc" sein oder ein Array von Knoten'
      })
    }

    // Validate content nodes
    const nodes = content.type === 'doc' ? content.content : content
    if (Array.isArray(nodes)) {
      nodes.forEach((node, index) => {
        const nodeIssues = this.validateNode(node, [`content[${index}]`])
        issues.push(...nodeIssues)
      })
    }

    return issues
  }

  private validateNode(node: any, path: string[]): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []

    if (!node || typeof node !== 'object') {
      issues.push({
        ruleId: 'invalid_structure',
        severity: 'error',
        message: 'Ungültiger Knoten',
        description: `Knoten bei ${path.join('.')} ist ungültig`,
        position: { path }
      })
      return issues
    }

    if (!node.type || typeof node.type !== 'string') {
      issues.push({
        ruleId: 'invalid_structure',
        severity: 'error',
        message: 'Fehlender oder ungültiger Knotentyp',
        description: `Knoten bei ${path.join('.')} hat keinen gültigen Typ`,
        position: { path }
      })
    }

    // Validate child nodes
    if (Array.isArray(node.content)) {
      node.content.forEach((child: any, index: number) => {
        const childIssues = this.validateNode(child, [...path, `content[${index}]`])
        issues.push(...childIssues)
      })
    }

    return issues
  }

  private validateHeadingStructure(content: any): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []
    
    const textLength = this.extractTextContent(content).length
    const headingCount = this.countHeadings(content)

    // Suggest headings for long content
    if (textLength > 500 && headingCount === 0) {
      issues.push({
        ruleId: 'missing_headings',
        severity: 'warning',
        message: 'Langer Inhalt ohne Überschriften',
        description: 'Fügen Sie Überschriften hinzu, um den Inhalt zu strukturieren',
        suggestion: 'Verwenden Sie Überschriften, um den Text in Abschnitte zu gliedern',
        quickFix: {
          label: 'Überschrift hinzufügen',
          action: () => {
            // This would be handled by the UI component
          },
          description: 'Fügt eine Überschrift am Anfang hinzu'
        }
      })
    }

    return issues
  }

  private validateEmptyParagraphs(content: any): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []
    const emptyParagraphs = this.findEmptyParagraphs(content)

    if (emptyParagraphs.length > 3) {
      issues.push({
        ruleId: 'empty_paragraphs',
        severity: 'info',
        message: `${emptyParagraphs.length} leere Absätze gefunden`,
        description: 'Entfernen Sie überflüssige leere Absätze für bessere Lesbarkeit',
        suggestion: 'Leere Absätze können automatisch entfernt werden',
        quickFix: {
          label: 'Leere Absätze entfernen',
          action: () => {
            // This would be handled by the UI component
          },
          description: 'Entfernt alle leeren Absätze'
        }
      })
    }

    return issues
  }

  private validateContentLength(content: any): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []
    const textLength = this.extractTextContent(content).length
    const variableCount = this.countVariables(content)

    if (textLength < 10 && variableCount === 0) {
      issues.push({
        ruleId: 'content_too_short',
        severity: 'warning',
        message: 'Sehr kurzer Inhalt',
        description: 'Fügen Sie mehr Text oder Variablen hinzu',
        suggestion: 'Erweitern Sie den Inhalt für bessere Nutzbarkeit'
      })
    }

    return issues
  }

  private validateContentSize(content: any): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []
    
    try {
      const contentString = JSON.stringify(content)
      const size = contentString.length

      if (size > VALIDATION_LIMITS.CONTENT_MAX_SIZE * 0.8) {
        issues.push({
          ruleId: 'content_too_long',
          severity: 'warning',
          message: `Sehr großer Inhalt (${Math.round(size / 1024)}KB)`,
          description: 'Großer Inhalt kann Performance-Probleme verursachen',
          suggestion: 'Erwägen Sie die Aufteilung in mehrere kleinere Vorlagen'
        })
      }
    } catch (error) {
      // Handle circular references or other JSON.stringify errors
      issues.push({
        ruleId: 'content_too_long',
        severity: 'error',
        message: 'Inhalt kann nicht validiert werden',
        description: 'Inhalt enthält zirkuläre Referenzen oder andere Strukturprobleme'
      })
    }

    return issues
  }

  private validateDuplicateContent(content: any): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []
    const textBlocks = this.extractTextBlocks(content)
    const duplicates = this.findDuplicateBlocks(textBlocks)

    if (duplicates.length > 0) {
      issues.push({
        ruleId: 'duplicate_content',
        severity: 'info',
        message: `${duplicates.length} wiederholende Textblöcke gefunden`,
        description: 'Vermeiden Sie identische Textblöcke',
        suggestion: 'Verwenden Sie Variablen für wiederholende Inhalte'
      })
    }

    return issues
  }

  private validateVariableUsage(content: any): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []
    const variables = extractVariablesFromContent(content)

    variables.forEach(variableId => {
      if (!isValidVariableId(variableId)) {
        issues.push({
          ruleId: 'invalid_variables',
          severity: 'error',
          message: `Ungültige Variable: ${variableId}`,
          description: 'Variable entspricht nicht dem gültigen Format',
          quickFix: {
            label: 'Variable entfernen',
            action: () => {
              // This would be handled by the UI component
            },
            description: 'Entfernt die ungültige Variable'
          }
        })
      }
    })

    return issues
  }

  private validateVariableDefinitions(content: any): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []
    const variables = extractVariablesFromContent(content)

    variables.forEach(variableId => {
      const definition = getVariableById(variableId)
      if (!definition) {
        issues.push({
          ruleId: 'undefined_variables',
          severity: 'warning',
          message: `Unbekannte Variable: ${variableId}`,
          description: 'Variable ist nicht im System definiert',
          suggestion: 'Überprüfen Sie die Schreibweise oder definieren Sie die Variable'
        })
      }
    })

    return issues
  }

  private validateUnusedVariables(content: any, context?: ContentValidationContext): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []
    
    if (!context?.existingVariables) return issues

    const usedVariables = extractVariablesFromContent(content)
    const unusedVariables = context.existingVariables.filter(v => !usedVariables.includes(v))

    if (unusedVariables.length > 0) {
      issues.push({
        ruleId: 'unused_variables',
        severity: 'info',
        message: `${unusedVariables.length} ungenutzte Variablen: ${unusedVariables.join(', ')}`,
        description: 'Diese Variablen werden nicht im Inhalt verwendet',
        suggestion: 'Entfernen Sie ungenutzte Variablen oder verwenden Sie sie im Inhalt'
      })
    }

    return issues
  }

  private validateRequiredVariables(content: any, context?: ContentValidationContext): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []
    
    if (!context?.requiredVariables) return issues

    const usedVariables = extractVariablesFromContent(content)
    const missingRequired = context.requiredVariables.filter(v => !usedVariables.includes(v))

    missingRequired.forEach(variableId => {
      issues.push({
        ruleId: 'missing_required_variables',
        severity: 'error',
        message: `Erforderliche Variable fehlt: ${variableId}`,
        description: 'Diese Variable muss im Inhalt verwendet werden',
        quickFix: {
          label: 'Variable hinzufügen',
          action: () => {
            // This would be handled by the UI component
          },
          description: 'Fügt die erforderliche Variable hinzu'
        }
      })
    })

    return issues
  }

  private validateFormattingConsistency(content: any): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []
    const formattingStats = this.analyzeFormatting(content)

    // Check for inconsistent heading levels
    if (formattingStats.headingLevels.length > 1) {
      const gaps = this.findHeadingLevelGaps(formattingStats.headingLevels)
      if (gaps.length > 0) {
        issues.push({
          ruleId: 'inconsistent_formatting',
          severity: 'info',
          message: 'Inkonsistente Überschriftenebenen',
          description: `Überschriftenebenen haben Lücken: ${gaps.join(', ')}`,
          suggestion: 'Verwenden Sie aufeinanderfolgende Überschriftenebenen'
        })
      }
    }

    return issues
  }

  private validateExcessiveFormatting(content: any): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []
    const formattingStats = this.analyzeFormatting(content)
    const textLength = this.extractTextContent(content).length

    // Check for excessive bold/italic usage
    const formattingRatio = (formattingStats.boldCount + formattingStats.italicCount) / Math.max(textLength, 1)
    if (formattingRatio > 0.3) {
      issues.push({
        ruleId: 'excessive_formatting',
        severity: 'info',
        message: 'Übermäßige Formatierung',
        description: 'Zu viel Fett- oder Kursivschrift kann die Lesbarkeit beeinträchtigen',
        suggestion: 'Verwenden Sie Formatierung sparsam für wichtige Hervorhebungen'
      })
    }

    return issues
  }

  private validateImageAltText(content: any): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []
    const images = this.findImages(content)

    images.forEach((image, index) => {
      if (!image.attrs?.alt || image.attrs.alt.trim().length === 0) {
        issues.push({
          ruleId: 'missing_alt_text',
          severity: 'warning',
          message: `Bild ${index + 1} hat keinen Alternativtext`,
          description: 'Bilder sollten Alternativtext für Barrierefreiheit haben',
          suggestion: 'Fügen Sie eine Beschreibung des Bildinhalts hinzu'
        })
      }
    })

    return issues
  }

  private validateHeadingHierarchy(content: any): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = []
    const headings = this.findHeadings(content)

    if (headings.length > 1) {
      let previousLevel = 0
      headings.forEach((heading, index) => {
        const level = heading.attrs?.level || 1
        if (index === 0 && level !== 1) {
          issues.push({
            ruleId: 'poor_heading_hierarchy',
            severity: 'warning',
            message: 'Dokument sollte mit Überschrift Ebene 1 beginnen',
            description: 'Erste Überschrift sollte Ebene 1 sein',
            suggestion: 'Ändern Sie die erste Überschrift zu Ebene 1'
          })
        } else if (level > previousLevel + 1) {
          issues.push({
            ruleId: 'poor_heading_hierarchy',
            severity: 'warning',
            message: `Überschriftenebene springt von ${previousLevel} zu ${level}`,
            description: 'Überschriftenebenen sollten nicht übersprungen werden',
            suggestion: 'Verwenden Sie aufeinanderfolgende Überschriftenebenen'
          })
        }
        previousLevel = level
      })
    }

    return issues
  }

  // Helper methods

  private extractTextContent(content: any, visited = new WeakSet()): string {
    if (!content) return ''
    
    // Prevent circular references
    if (typeof content === 'object' && visited.has(content)) {
      return ''
    }
    
    if (typeof content === 'object') {
      visited.add(content)
    }

    const extractFromNode = (node: any): string => {
      if (!node || typeof node !== 'object') return ''
      
      // Prevent circular references
      if (visited.has(node)) {
        return ''
      }
      
      visited.add(node)

      if (node.type === 'text') {
        return node.text || ''
      }

      if (Array.isArray(node.content)) {
        return node.content.map(extractFromNode).join('')
      }

      return ''
    }

    if (Array.isArray(content)) {
      return content.map(extractFromNode).join('')
    }

    if (content.type === 'doc' && Array.isArray(content.content)) {
      return content.content.map(extractFromNode).join('')
    }

    return extractFromNode(content)
  }

  private countVariables(content: any): number {
    return extractVariablesFromContent(content).length
  }

  private countHeadings(content: any): number {
    return this.findHeadings(content).length
  }

  private findEmptyParagraphs(content: any): any[] {
    const emptyParagraphs: any[] = []

    const findInNode = (node: any): void => {
      if (!node || typeof node !== 'object') return

      if (node.type === 'paragraph') {
        const hasContent = node.content && node.content.some((child: any) =>
          child.type === 'text' && child.text && child.text.trim().length > 0
        )
        if (!hasContent) {
          emptyParagraphs.push(node)
        }
      }

      if (Array.isArray(node.content)) {
        node.content.forEach(findInNode)
      }
    }

    if (Array.isArray(content)) {
      content.forEach(findInNode)
    } else {
      findInNode(content)
    }

    return emptyParagraphs
  }

  private extractTextBlocks(content: any, visited = new WeakSet()): string[] {
    const blocks: string[] = []
    
    // Prevent circular references
    if (typeof content === 'object' && content !== null && visited.has(content)) {
      return blocks
    }
    
    if (typeof content === 'object' && content !== null) {
      visited.add(content)
    }

    const extractFromNode = (node: any): void => {
      if (!node || typeof node !== 'object') return
      
      // Prevent circular references
      if (visited.has(node)) {
        return
      }
      
      visited.add(node)

      if (node.type === 'paragraph') {
        const text = this.extractTextContent(node, visited).trim()
        if (text.length > 10) {
          blocks.push(text)
        }
      }

      if (Array.isArray(node.content)) {
        node.content.forEach(extractFromNode)
      }
    }

    if (Array.isArray(content)) {
      content.forEach(extractFromNode)
    } else {
      extractFromNode(content)
    }

    return blocks
  }

  private findDuplicateBlocks(blocks: string[]): string[] {
    const seen = new Set<string>()
    const duplicates: string[] = []

    blocks.forEach(block => {
      if (seen.has(block)) {
        if (!duplicates.includes(block)) {
          duplicates.push(block)
        }
      } else {
        seen.add(block)
      }
    })

    return duplicates
  }

  private analyzeFormatting(content: any, visited = new WeakSet()): {
    boldCount: number
    italicCount: number
    headingLevels: number[]
  } {
    let boldCount = 0
    let italicCount = 0
    const headingLevels: number[] = []
    
    // Prevent circular references
    if (typeof content === 'object' && content !== null && visited.has(content)) {
      return { boldCount, italicCount, headingLevels }
    }
    
    if (typeof content === 'object' && content !== null) {
      visited.add(content)
    }

    const analyzeNode = (node: any): void => {
      if (!node || typeof node !== 'object') return
      
      // Prevent circular references
      if (visited.has(node)) {
        return
      }
      
      visited.add(node)

      if (node.type === 'heading') {
        const level = node.attrs?.level || 1
        if (!headingLevels.includes(level)) {
          headingLevels.push(level)
        }
      }

      if (Array.isArray(node.marks)) {
        node.marks.forEach((mark: any) => {
          if (mark.type === 'bold') boldCount++
          if (mark.type === 'italic') italicCount++
        })
      }

      if (Array.isArray(node.content)) {
        node.content.forEach(analyzeNode)
      }
    }

    if (Array.isArray(content)) {
      content.forEach(analyzeNode)
    } else {
      analyzeNode(content)
    }

    headingLevels.sort((a, b) => a - b)

    return { boldCount, italicCount, headingLevels }
  }

  private findHeadingLevelGaps(levels: number[]): number[] {
    const gaps: number[] = []
    for (let i = 1; i < levels.length; i++) {
      const current = levels[i]
      const previous = levels[i - 1]
      if (current > previous + 1) {
        for (let gap = previous + 1; gap < current; gap++) {
          gaps.push(gap)
        }
      }
    }
    return gaps
  }

  private findImages(content: any, visited = new WeakSet()): any[] {
    const images: any[] = []
    
    // Prevent circular references
    if (typeof content === 'object' && content !== null && visited.has(content)) {
      return images
    }
    
    if (typeof content === 'object' && content !== null) {
      visited.add(content)
    }

    const findInNode = (node: any): void => {
      if (!node || typeof node !== 'object') return
      
      // Prevent circular references
      if (visited.has(node)) {
        return
      }
      
      visited.add(node)

      if (node.type === 'image') {
        images.push(node)
      }

      if (Array.isArray(node.content)) {
        node.content.forEach(findInNode)
      }
    }

    if (Array.isArray(content)) {
      content.forEach(findInNode)
    } else {
      findInNode(content)
    }

    return images
  }

  private findHeadings(content: any, visited = new WeakSet()): any[] {
    const headings: any[] = []
    
    // Prevent circular references
    if (typeof content === 'object' && content !== null && visited.has(content)) {
      return headings
    }
    
    if (typeof content === 'object' && content !== null) {
      visited.add(content)
    }

    const findInNode = (node: any): void => {
      if (!node || typeof node !== 'object') return
      
      // Prevent circular references
      if (visited.has(node)) {
        return
      }
      
      visited.add(node)

      if (node.type === 'heading') {
        headings.push(node)
      }

      if (Array.isArray(node.content)) {
        node.content.forEach(findInNode)
      }
    }

    if (Array.isArray(content)) {
      content.forEach(findInNode)
    } else {
      findInNode(content)
    }

    return headings
  }

  private calculateValidationScore(errorCount: number, warningCount: number, infoCount: number): number {
    const maxScore = 100
    const errorWeight = 15
    const warningWeight = 5
    const infoWeight = 1

    const deductions = (errorCount * errorWeight) + (warningCount * warningWeight) + (infoCount * infoWeight)
    return Math.max(0, maxScore - deductions)
  }

  private generateRecommendations(issues: ContentValidationIssue[], score: number): string[] {
    const recommendations: string[] = []

    const errorCount = issues.filter(i => i.severity === 'error').length
    const warningCount = issues.filter(i => i.severity === 'warning').length

    if (errorCount > 0) {
      recommendations.push(`Beheben Sie ${errorCount} kritische Fehler vor der Verwendung`)
    }

    if (warningCount > 0) {
      recommendations.push(`Überprüfen Sie ${warningCount} Warnungen für bessere Qualität`)
    }

    if (score < 70) {
      recommendations.push('Template benötigt Überarbeitung für optimale Qualität')
    } else if (score < 85) {
      recommendations.push('Template ist gut, aber kann noch verbessert werden')
    } else if (score >= 95) {
      recommendations.push('Ausgezeichnete Template-Qualität!')
    }

    // Category-specific recommendations
    const categoryIssues = issues.reduce((acc, issue) => {
      const rule = this.rules.get(issue.ruleId)
      if (rule) {
        if (!acc[rule.category]) acc[rule.category] = 0
        acc[rule.category]++
      }
      return acc
    }, {} as Record<string, number>)

    Object.entries(categoryIssues).forEach(([category, count]) => {
      if (count > 2) {
        switch (category) {
          case 'structure':
            recommendations.push('Verbessern Sie die Dokumentstruktur mit Überschriften')
            break
          case 'variables':
            recommendations.push('Überprüfen Sie die Verwendung von Variablen')
            break
          case 'formatting':
            recommendations.push('Vereinheitlichen Sie die Formatierung')
            break
          case 'accessibility':
            recommendations.push('Verbessern Sie die Barrierefreiheit')
            break
        }
      }
    })

    return recommendations
  }
}

// Export singleton instance
export const contentValidationSystem = new ContentValidationSystem()

// Export types for external use
export type {
  ContentValidationRule,
  ContentValidationIssue,
  ContentPosition,
  ContentValidationContext,
  ContentValidationSummary
}