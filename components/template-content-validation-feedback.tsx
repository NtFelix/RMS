/**
 * Template Content Validation Feedback Components
 * 
 * Provides visual feedback components for real-time template content validation
 * including error highlighting, validation summaries, and interactive fixes.
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { AlertTriangle, CheckCircle, Info, X, Lightbulb, Zap, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import type {
  ContentValidationSummary,
  ContentValidationIssue,
  ContentValidationRule
} from '@/lib/template-content-validation-system'
import type {
  RealTimeValidationResult,
  RealTimeValidationError,
  RealTimeValidationWarning,
  RealTimeValidationSuggestion
} from '@/lib/template-real-time-validation'

// Props interfaces
interface ValidationFeedbackProps {
  summary: ContentValidationSummary
  className?: string
  showDetails?: boolean
  onIssueClick?: (issue: ContentValidationIssue) => void
  onQuickFix?: (issue: ContentValidationIssue) => void
}

interface RealTimeValidationFeedbackProps {
  result: RealTimeValidationResult
  className?: string
  inline?: boolean
  onErrorClick?: (error: RealTimeValidationError) => void
  onQuickFix?: (error: RealTimeValidationError) => void
}

interface ValidationScoreProps {
  score: number
  totalIssues: number
  className?: string
  showDetails?: boolean
}

interface ValidationIssueListProps {
  issues: ContentValidationIssue[]
  title: string
  severity: 'error' | 'warning' | 'info'
  onIssueClick?: (issue: ContentValidationIssue) => void
  onQuickFix?: (issue: ContentValidationIssue) => void
  collapsible?: boolean
  defaultOpen?: boolean
}

interface ValidationRuleConfigProps {
  rules: ContentValidationRule[]
  enabledRules: Set<string>
  onRuleToggle: (ruleId: string, enabled: boolean) => void
  className?: string
}

/**
 * Main validation feedback component showing comprehensive validation results
 */
export function ValidationFeedback({
  summary,
  className,
  showDetails = true,
  onIssueClick,
  onQuickFix
}: ValidationFeedbackProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['structure', 'variables']))

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getSeverityColor = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return 'destructive'
      case 'warning':
        return 'secondary'
      case 'info':
        return 'outline'
    }
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {summary.isValid ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            <CardTitle className="text-lg">
              Validierungsergebnis
            </CardTitle>
          </div>
          <ValidationScore 
            score={summary.score} 
            totalIssues={summary.totalIssues}
            showDetails={false}
          />
        </div>
        {summary.recommendations.length > 0 && (
          <CardDescription>
            {summary.recommendations[0]}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">{summary.errorCount}</div>
            <div className="text-sm text-muted-foreground">Fehler</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.warningCount}</div>
            <div className="text-sm text-muted-foreground">Warnungen</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.infoCount}</div>
            <div className="text-sm text-muted-foreground">Hinweise</div>
          </div>
        </div>

        {showDetails && summary.totalIssues > 0 && (
          <>
            <Separator />
            
            {/* Issues by Category */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                Probleme nach Kategorie
              </h4>
              
              {Object.entries(summary.issuesByCategory).map(([category, issues]) => {
                if (issues.length === 0) return null
                
                const errorCount = issues.filter(i => i.severity === 'error').length
                const warningCount = issues.filter(i => i.severity === 'warning').length
                const infoCount = issues.filter(i => i.severity === 'info').length
                
                return (
                  <Collapsible
                    key={category}
                    open={expandedCategories.has(category)}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-3 h-auto"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">
                            {getCategoryDisplayName(category)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {issues.length}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {errorCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {errorCount}
                            </Badge>
                          )}
                          {warningCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {warningCount}
                            </Badge>
                          )}
                          {infoCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {infoCount}
                            </Badge>
                          )}
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="px-3 pb-3">
                      <div className="space-y-2 mt-2">
                        {issues.map((issue, index) => (
                          <ValidationIssueItem
                            key={`${issue.ruleId}-${index}`}
                            issue={issue}
                            onClick={onIssueClick}
                            onQuickFix={onQuickFix}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          </>
        )}

        {/* Recommendations */}
        {summary.recommendations.length > 1 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Empfehlungen
              </h4>
              <ul className="space-y-1">
                {summary.recommendations.slice(1).map((recommendation, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Real-time validation feedback component for inline display
 */
export function RealTimeValidationFeedback({
  result,
  className,
  inline = false,
  onErrorClick,
  onQuickFix
}: RealTimeValidationFeedbackProps) {
  if (result.isValid && result.warnings.length === 0 && result.suggestions.length === 0) {
    return inline ? (
      <div className={cn('flex items-center gap-1 text-green-600', className)}>
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">Gültig</span>
      </div>
    ) : null
  }

  const hasErrors = result.errors.length > 0
  const hasWarnings = result.warnings.length > 0
  const hasSuggestions = result.suggestions.length > 0

  if (inline) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {hasErrors && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{result.errors.length}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {result.errors.slice(0, 3).map((error, index) => (
                    <div key={index} className="text-sm">{error.message}</div>
                  ))}
                  {result.errors.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{result.errors.length - 3} weitere
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {hasWarnings && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{result.warnings.length}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {result.warnings.slice(0, 3).map((warning, index) => (
                    <div key={index} className="text-sm">{warning.message}</div>
                  ))}
                  {result.warnings.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{result.warnings.length - 3} weitere
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {hasSuggestions && !hasErrors && !hasWarnings && (
          <div className="flex items-center gap-1 text-blue-600">
            <Lightbulb className="h-4 w-4" />
            <span className="text-sm">{result.suggestions.length}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="pt-4 space-y-3">
        {/* Errors */}
        {result.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Fehler ({result.errors.length})
            </h4>
            {result.errors.map((error, index) => (
              <RealTimeValidationErrorItem
                key={index}
                error={error}
                onClick={onErrorClick}
                onQuickFix={onQuickFix}
              />
            ))}
          </div>
        )}

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-yellow-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Warnungen ({result.warnings.length})
            </h4>
            {result.warnings.map((warning, index) => (
              <RealTimeValidationWarningItem
                key={index}
                warning={warning}
              />
            ))}
          </div>
        )}

        {/* Suggestions */}
        {result.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-blue-600 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Vorschläge ({result.suggestions.length})
            </h4>
            {result.suggestions.map((suggestion, index) => (
              <RealTimeValidationSuggestionItem
                key={index}
                suggestion={suggestion}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Validation score display component
 */
export function ValidationScore({ score, totalIssues, className, showDetails = true }: ValidationScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-destructive'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 95) return 'Ausgezeichnet'
    if (score >= 85) return 'Sehr gut'
    if (score >= 70) return 'Gut'
    if (score >= 50) return 'Verbesserungsbedarf'
    return 'Kritisch'
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="text-right">
        <div className={cn('text-lg font-bold', getScoreColor(score))}>
          {score}/100
        </div>
        {showDetails && (
          <div className="text-xs text-muted-foreground">
            {getScoreLabel(score)}
          </div>
        )}
      </div>
      {showDetails && (
        <div className="w-16">
          <Progress value={score} className="h-2" />
        </div>
      )}
    </div>
  )
}

/**
 * Individual validation issue item component
 */
function ValidationIssueItem({
  issue,
  onClick,
  onQuickFix
}: {
  issue: ContentValidationIssue
  onClick?: (issue: ContentValidationIssue) => void
  onQuickFix?: (issue: ContentValidationIssue) => void
}) {
  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted/70 transition-colors">
      {getSeverityIcon(issue.severity)}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{issue.message}</div>
        {issue.description && (
          <div className="text-xs text-muted-foreground mt-1">
            {issue.description}
          </div>
        )}
        {issue.suggestion && (
          <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            {issue.suggestion}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {issue.quickFix && onQuickFix && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            onClick={() => onQuickFix(issue)}
          >
            <Zap className="h-3 w-3 mr-1" />
            {issue.quickFix.label}
          </Button>
        )}
        {onClick && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => onClick(issue)}
          >
            <Eye className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Real-time validation error item component
 */
function RealTimeValidationErrorItem({
  error,
  onClick,
  onQuickFix
}: {
  error: RealTimeValidationError
  onClick?: (error: RealTimeValidationError) => void
  onQuickFix?: (error: RealTimeValidationError) => void
}) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-destructive">{error.message}</div>
        {error.position && (
          <div className="text-xs text-muted-foreground mt-1">
            Position: {error.position.start}-{error.position.end}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {error.quickFix && onQuickFix && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            onClick={() => onQuickFix(error)}
          >
            <Zap className="h-3 w-3 mr-1" />
            {error.quickFix.label}
          </Button>
        )}
        {onClick && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => onClick(error)}
          >
            <Eye className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Real-time validation warning item component
 */
function RealTimeValidationWarningItem({
  warning
}: {
  warning: RealTimeValidationWarning
}) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-yellow-50 border border-yellow-200">
      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-yellow-800">{warning.message}</div>
        {warning.suggestion && (
          <div className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            {warning.suggestion}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Real-time validation suggestion item component
 */
function RealTimeValidationSuggestionItem({
  suggestion
}: {
  suggestion: RealTimeValidationSuggestion
}) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-blue-50 border border-blue-200">
      <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-blue-800">{suggestion.message}</div>
        <div className="text-xs text-blue-600 mt-1">
          {suggestion.actionLabel}
        </div>
      </div>
      <Badge variant="outline" className="text-xs">
        {suggestion.priority}
      </Badge>
    </div>
  )
}

/**
 * Validation rule configuration component
 */
export function ValidationRuleConfig({
  rules,
  enabledRules,
  onRuleToggle,
  className
}: ValidationRuleConfigProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['structure', 'variables']))
  const [showDisabled, setShowDisabled] = useState(false)

  const rulesByCategory = useMemo(() => {
    return rules.reduce((acc, rule) => {
      if (!acc[rule.category]) {
        acc[rule.category] = []
      }
      acc[rule.category].push(rule)
      return acc
    }, {} as Record<string, ContentValidationRule[]>)
  }, [rules])

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const filteredRules = showDisabled ? rules : rules.filter(rule => enabledRules.has(rule.id))

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Validierungsregeln</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDisabled(!showDisabled)}
          >
            {showDisabled ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showDisabled ? 'Aktive anzeigen' : 'Alle anzeigen'}
          </Button>
        </div>
        <CardDescription>
          Konfigurieren Sie, welche Validierungsregeln angewendet werden sollen
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {Object.entries(rulesByCategory).map(([category, categoryRules]) => {
              const visibleRules = showDisabled ? categoryRules : categoryRules.filter(rule => enabledRules.has(rule.id))
              if (visibleRules.length === 0) return null

              return (
                <Collapsible
                  key={category}
                  open={expandedCategories.has(category)}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto"
                    >
                      <span className="font-medium capitalize">
                        {getCategoryDisplayName(category)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {visibleRules.length}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="px-3 pb-3">
                    <div className="space-y-2 mt-2">
                      {visibleRules.map((rule) => (
                        <ValidationRuleItem
                          key={rule.id}
                          rule={rule}
                          enabled={enabledRules.has(rule.id)}
                          onToggle={(enabled) => onRuleToggle(rule.id, enabled)}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

/**
 * Individual validation rule item component
 */
function ValidationRuleItem({
  rule,
  enabled,
  onToggle
}: {
  rule: ContentValidationRule
  enabled: boolean
  onToggle: (enabled: boolean) => void
}) {
  const getSeverityColor = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return 'text-destructive'
      case 'warning':
        return 'text-yellow-600'
      case 'info':
        return 'text-blue-600'
    }
  }

  return (
    <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{rule.name}</span>
          <Badge variant="outline" className={cn('text-xs', getSeverityColor(rule.severity))}>
            {rule.severity}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {rule.description}
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getCategoryDisplayName(category: string): string {
  const displayNames: Record<string, string> = {
    structure: 'Struktur',
    content: 'Inhalt',
    variables: 'Variablen',
    formatting: 'Formatierung',
    accessibility: 'Barrierefreiheit'
  }
  return displayNames[category] || category
}