'use client'

import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { getVariableById, getCategoryColor, getCategoryIcon } from '@/lib/template-variables'
import type { MentionItem } from '@/types/template'

interface TemplateVariableTooltipProps {
  variableId: string
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

/**
 * Tooltip component that displays detailed information about a template variable
 * Shows variable description, category, and context requirements
 */
export function TemplateVariableTooltip({
  variableId,
  children,
  side = 'top',
  align = 'center'
}: TemplateVariableTooltipProps) {
  const variable = getVariableById(variableId)

  if (!variable) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {children}
          </TooltipTrigger>
          <TooltipContent side={side} align={align} className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-red-500">⚠️</span>
                <span className="font-medium text-red-600">Unbekannte Variable</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Variable "{variableId}" ist nicht definiert
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} align={align} className="max-w-sm">
          <VariableTooltipContent variable={variable} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface VariableTooltipContentProps {
  variable: MentionItem
}

function VariableTooltipContent({ variable }: VariableTooltipContentProps) {
  const categoryColor = getCategoryColor(variable.category)
  const categoryIcon = getCategoryIcon(variable.category)

  return (
    <div className="space-y-3">
      {/* Variable Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{categoryIcon}</span>
          <span className="font-semibold">{variable.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={`text-xs ${categoryColor}`}>
            {variable.category}
          </Badge>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
            {variable.id}
          </code>
        </div>
      </div>

      {/* Description */}
      {variable.description && (
        <div>
          <p className="text-sm text-muted-foreground">
            {variable.description}
          </p>
        </div>
      )}

      {/* Context Requirements */}
      {variable.context && variable.context.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Benötigter Kontext:
          </p>
          <div className="flex flex-wrap gap-1">
            {variable.context.map((context) => (
              <Badge
                key={context}
                variant="outline"
                className="text-xs"
              >
                {getContextDisplayName(context)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Usage Hint */}
      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          💡 Verwenden Sie "@{variable.id}" um diese Variable einzufügen
        </p>
      </div>
    </div>
  )
}

/**
 * Convert context type to display name
 */
function getContextDisplayName(context: string): string {
  const contextNames: Record<string, string> = {
    property: 'Immobilie',
    landlord: 'Vermieter',
    tenant: 'Mieter',
    apartment: 'Wohnung',
    lease: 'Mietvertrag',
    operating_costs: 'Betriebskosten',
    water_meter: 'Wasserzähler',
    termination: 'Kündigung',
    maintenance: 'Wartung',
    legal: 'Rechtliches'
  }

  return contextNames[context] || context
}

/**
 * Simplified tooltip for inline variable mentions
 */
interface InlineVariableTooltipProps {
  variableId: string
  label?: string
  children: React.ReactNode
}

export function InlineVariableTooltip({
  variableId,
  label,
  children
}: InlineVariableTooltipProps) {
  const variable = getVariableById(variableId)

  if (!variable) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {children}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="flex items-center gap-2">
              <span className="text-red-500">⚠️</span>
              <span className="text-sm">Unbekannte Variable: {variableId}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span>{getCategoryIcon(variable.category)}</span>
              <span className="font-medium">{label || variable.label}</span>
            </div>
            {variable.description && (
              <p className="text-xs text-muted-foreground max-w-xs">
                {variable.description}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Error tooltip for invalid variables
 */
interface VariableErrorTooltipProps {
  error: string
  children: React.ReactNode
}

export function VariableErrorTooltip({
  error,
  children
}: VariableErrorTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="flex items-center gap-2">
            <span className="text-red-500">❌</span>
            <span className="text-sm text-red-600">{error}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}