'use client'

import React, { useState, useEffect } from 'react'
import { 
  HelpCircle, 
  Info, 
  Lightbulb, 
  BookOpen, 
  Keyboard, 
  Zap,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

interface GuidanceTooltipProps {
  title: string
  content: string
  children: React.ReactNode
  type?: 'info' | 'tip' | 'warning' | 'shortcut'
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  className?: string
  showIcon?: boolean
  maxWidth?: string
}

/**
 * Enhanced guidance tooltip with different types and styling
 */
export function GuidanceTooltip({
  title,
  content,
  children,
  type = 'info',
  side = 'top',
  align = 'center',
  className,
  showIcon = true,
  maxWidth = 'max-w-sm'
}: GuidanceTooltipProps) {
  const getIcon = () => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4" />
      case 'tip':
        return <Lightbulb className="h-4 w-4" />
      case 'warning':
        return <HelpCircle className="h-4 w-4" />
      case 'shortcut':
        return <Keyboard className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getIconColor = () => {
    switch (type) {
      case 'info':
        return 'text-blue-500'
      case 'tip':
        return 'text-yellow-500'
      case 'warning':
        return 'text-orange-500'
      case 'shortcut':
        return 'text-purple-500'
      default:
        return 'text-blue-500'
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} align={align} className={cn(maxWidth, className)}>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {showIcon && (
                <span className={getIconColor()}>
                  {getIcon()}
                </span>
              )}
              <span className="font-semibold text-sm">{title}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {content}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface VariableGuidanceTooltipProps {
  variableId: string
  children: React.ReactNode
  showUsageExample?: boolean
  showContextInfo?: boolean
}

/**
 * Specialized tooltip for template variables with enhanced guidance
 */
export function VariableGuidanceTooltip({
  variableId,
  children,
  showUsageExample = true,
  showContextInfo = true
}: VariableGuidanceTooltipProps) {
  // This would integrate with the existing variable system
  const variable = {
    id: variableId,
    label: `Variable ${variableId}`,
    description: `Beschreibung für Variable ${variableId}`,
    category: 'Allgemein',
    example: `Beispielwert für ${variableId}`,
    context: ['property', 'tenant']
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-md">
          <div className="space-y-3">
            {/* Variable Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="font-semibold">{variable.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {variable.category}
                </Badge>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  @{variable.id}
                </code>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground">
              {variable.description}
            </p>

            {/* Usage Example */}
            {showUsageExample && variable.example && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Beispielwert:
                </p>
                <div className="bg-muted p-2 rounded text-xs font-mono">
                  {variable.example}
                </div>
              </div>
            )}

            {/* Context Information */}
            {showContextInfo && variable.context && variable.context.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Verfügbar in:
                </p>
                <div className="flex flex-wrap gap-1">
                  {variable.context.map((ctx) => (
                    <Badge key={ctx} variant="outline" className="text-xs">
                      {ctx}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Usage Hint */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                💡 Tippen Sie "@{variable.id}" um diese Variable einzufügen
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface KeyboardShortcutTooltipProps {
  shortcut: string
  description: string
  children: React.ReactNode
  platform?: 'mac' | 'windows' | 'auto'
}

/**
 * Tooltip for keyboard shortcuts with platform-specific formatting
 */
export function KeyboardShortcutTooltip({
  shortcut,
  description,
  children,
  platform = 'auto'
}: KeyboardShortcutTooltipProps) {
  const [detectedPlatform, setDetectedPlatform] = useState<'mac' | 'windows'>('windows')

  useEffect(() => {
    if (platform === 'auto') {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      setDetectedPlatform(isMac ? 'mac' : 'windows')
    }
  }, [platform])

  const formatShortcut = (shortcut: string) => {
    const actualPlatform = platform === 'auto' ? detectedPlatform : platform
    
    if (actualPlatform === 'mac') {
      return shortcut
        .replace(/Ctrl/g, '⌘')
        .replace(/Alt/g, '⌥')
        .replace(/Shift/g, '⇧')
        .replace(/Enter/g, '↵')
    }
    
    return shortcut
  }

  return (
    <GuidanceTooltip
      title="Tastenkürzel"
      content={`${description} - Drücken Sie ${formatShortcut(shortcut)}`}
      type="shortcut"
      showIcon={true}
    >
      {children}
    </GuidanceTooltip>
  )
}

interface ContextualHelpProps {
  topic: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Contextual help button with topic-specific guidance
 */
export function ContextualHelp({ topic, className, size = 'sm' }: ContextualHelpProps) {
  const getHelpContent = (topic: string) => {
    const helpContent: Record<string, { title: string; content: string; tips?: string[] }> = {
      'template-title': {
        title: 'Vorlagen-Titel',
        content: 'Wählen Sie einen aussagekräftigen Titel, der den Zweck der Vorlage klar beschreibt.',
        tips: [
          'Verwenden Sie beschreibende Namen wie "Mietvertrag Wohnung" statt "Vorlage 1"',
          'Vermeiden Sie Sonderzeichen wie <, >, {, }',
          'Halten Sie den Titel unter 50 Zeichen für bessere Lesbarkeit'
        ]
      },
      'template-content': {
        title: 'Vorlagen-Inhalt',
        content: 'Erstellen Sie strukturierten Inhalt mit Überschriften, Absätzen und Variablen.',
        tips: [
          'Verwenden Sie "/" für Formatierungsoptionen',
          'Fügen Sie Variablen mit "@" ein',
          'Strukturieren Sie längere Texte mit Überschriften',
          'Nutzen Sie Listen für bessere Lesbarkeit'
        ]
      },
      'template-variables': {
        title: 'Template-Variablen',
        content: 'Variablen machen Ihre Vorlagen dynamisch und wiederverwendbar.',
        tips: [
          'Tippen Sie "@" um verfügbare Variablen zu sehen',
          'Verwenden Sie aussagekräftige Variablennamen',
          'Variablen werden automatisch durch echte Werte ersetzt',
          'Überprüfen Sie die Schreibweise von Variablen'
        ]
      },
      'template-category': {
        title: 'Kategorien',
        content: 'Organisieren Sie Ihre Vorlagen in sinnvollen Kategorien.',
        tips: [
          'Verwenden Sie bestehende Kategorien wenn möglich',
          'Erstellen Sie neue Kategorien nur bei Bedarf',
          'Wählen Sie eindeutige, beschreibende Namen',
          'Kategorien helfen beim schnellen Finden von Vorlagen'
        ]
      }
    }

    return helpContent[topic] || {
      title: 'Hilfe',
      content: 'Keine spezifische Hilfe für dieses Thema verfügbar.',
      tips: []
    }
  }

  const help = getHelpContent(topic)

  const getButtonSize = () => {
    switch (size) {
      case 'sm':
        return 'h-6 w-6'
      case 'md':
        return 'h-8 w-8'
      case 'lg':
        return 'h-10 w-10'
      default:
        return 'h-6 w-6'
    }
  }

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3'
      case 'md':
        return 'h-4 w-4'
      case 'lg':
        return 'h-5 w-5'
      default:
        return 'h-3 w-3'
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              getButtonSize(),
              'rounded-full p-0 text-muted-foreground hover:text-foreground',
              className
            )}
          >
            <HelpCircle className={getIconSize()} />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-md">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <span className="font-semibold">{help.title}</span>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              {help.content}
            </p>
            
            {help.tips && help.tips.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  💡 Tipps:
                </p>
                <ul className="space-y-1">
                  {help.tips.map((tip, index) => (
                    <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface GuidancePanelProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
  collapsible?: boolean
}

/**
 * Expandable guidance panel for detailed help content
 */
export function GuidancePanel({
  title,
  children,
  defaultOpen = false,
  className,
  collapsible = true
}: GuidancePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (!collapsible) {
    return (
      <div className={cn('rounded-lg border bg-muted/30 p-4', className)}>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {children}
        </div>
      </div>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto rounded-lg border bg-muted/30 hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span className="font-semibold text-sm">{title}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface SmartGuidanceProps {
  context: 'new-template' | 'editing-template' | 'variable-selection' | 'category-selection'
  userLevel?: 'beginner' | 'intermediate' | 'advanced'
  className?: string
}

/**
 * Smart guidance that adapts based on context and user level
 */
export function SmartGuidance({ context, userLevel = 'intermediate', className }: SmartGuidanceProps) {
  const [isVisible, setIsVisible] = useState(true)

  const getGuidanceContent = () => {
    const content: Record<string, { title: string; content: React.ReactNode; level: string[] }> = {
      'new-template': {
        title: 'Neue Vorlage erstellen',
        level: ['beginner', 'intermediate'],
        content: (
          <div className="space-y-3">
            <p>Erstellen Sie eine neue Dokumentvorlage in wenigen Schritten:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Wählen Sie einen aussagekräftigen Titel</li>
              <li>Ordnen Sie die Vorlage einer Kategorie zu</li>
              <li>Erstellen Sie den Inhalt mit Text und Variablen</li>
              <li>Überprüfen Sie die Vorschau vor dem Speichern</li>
            </ol>
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
              💡 Verwenden Sie "@" um Variablen einzufügen und "/" für Formatierungsoptionen
            </div>
          </div>
        )
      },
      'editing-template': {
        title: 'Vorlage bearbeiten',
        level: ['beginner'],
        content: (
          <div className="space-y-3">
            <p>Bearbeiten Sie Ihre Vorlage:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Änderungen werden automatisch gespeichert</li>
              <li>Verwenden Sie die Toolbar für Formatierungen</li>
              <li>Variablen können jederzeit hinzugefügt werden</li>
            </ul>
          </div>
        )
      },
      'variable-selection': {
        title: 'Variablen verwenden',
        level: ['beginner', 'intermediate'],
        content: (
          <div className="space-y-3">
            <p>Variablen machen Ihre Vorlagen dynamisch:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Tippen Sie "@" um verfügbare Variablen zu sehen</li>
              <li>Variablen werden durch echte Werte ersetzt</li>
              <li>Jede Variable hat einen spezifischen Kontext</li>
            </ul>
          </div>
        )
      },
      'category-selection': {
        title: 'Kategorien organisieren',
        level: ['beginner'],
        content: (
          <div className="space-y-3">
            <p>Organisieren Sie Ihre Vorlagen:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Verwenden Sie bestehende Kategorien wenn möglich</li>
              <li>Neue Kategorien werden automatisch erstellt</li>
              <li>Kategorien helfen beim schnellen Finden</li>
            </ul>
          </div>
        )
      }
    }

    return content[context]
  }

  const guidance = getGuidanceContent()

  if (!guidance || !guidance.level.includes(userLevel) || !isVisible) {
    return null
  }

  return (
    <div className={cn('relative', className)}>
      <GuidancePanel
        title={guidance.title}
        defaultOpen={userLevel === 'beginner'}
        collapsible={true}
      >
        {guidance.content}
      </GuidancePanel>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-50 hover:opacity-100"
      >
        <EyeOff className="h-3 w-3" />
      </Button>
    </div>
  )
}

interface ProgressiveDisclosureProps {
  basicContent: React.ReactNode
  advancedContent: React.ReactNode
  title?: string
  className?: string
}

/**
 * Progressive disclosure component for showing basic and advanced options
 */
export function ProgressiveDisclosure({
  basicContent,
  advancedContent,
  title = "Erweiterte Optionen",
  className
}: ProgressiveDisclosureProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className={cn('space-y-3', className)}>
      {basicContent}
      
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            {showAdvanced ? (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                {title} ausblenden
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                {title} anzeigen
              </>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          {advancedContent}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}