"use client"

import React from 'react'
import { FileText, Search, Plus, Filter, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Empty state component for when no templates exist
 */
interface TemplatesEmptyStateProps {
  /** Callback when user clicks create template button */
  onCreateTemplate: () => void
  /** Whether there's an active search query */
  hasSearch?: boolean
  /** Whether there's an active category filter */
  hasFilter?: boolean
  /** Callback to clear all filters */
  onClearFilters?: () => void
  /** Additional CSS classes */
  className?: string
}

export function TemplatesEmptyState({ 
  onCreateTemplate, 
  hasSearch = false, 
  hasFilter = false, 
  onClearFilters,
  className 
}: TemplatesEmptyStateProps) {
  // Different empty states based on context
  if (hasSearch || hasFilter) {
    return (
      <NoResultsEmptyState 
        hasSearch={hasSearch}
        hasFilter={hasFilter}
        onClearFilters={onClearFilters}
        onCreateTemplate={onCreateTemplate}
        className={className}
      />
    )
  }

  return (
    <NoTemplatesEmptyState 
      onCreateTemplate={onCreateTemplate}
      className={className}
    />
  )
}

/**
 * Empty state when no templates exist at all
 */
interface NoTemplatesEmptyStateProps {
  onCreateTemplate: () => void
  className?: string
}

function NoTemplatesEmptyState({ onCreateTemplate, className }: NoTemplatesEmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 text-center min-h-[400px]",
      className
    )}>
      {/* Icon */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center mb-6 animate-in fade-in duration-500">
        <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
      </div>
      
      {/* Heading */}
      <h3 className="text-lg sm:text-xl font-semibold mb-2 text-foreground animate-in slide-in-from-bottom duration-500 delay-100">
        Noch keine Vorlagen vorhanden
      </h3>
      
      {/* Description */}
      <p className="text-muted-foreground mb-6 max-w-md text-sm sm:text-base px-4 animate-in slide-in-from-bottom duration-500 delay-200">
        Erstellen Sie Ihre erste Vorlage, um Zeit bei wiederkehrenden Dokumenten zu sparen. 
        Vorlagen helfen Ihnen dabei, konsistente und professionelle Dokumente zu erstellen.
      </p>
      
      {/* Action Button */}
      <Button 
        onClick={onCreateTemplate}
        size="lg"
        className="px-6 py-3 animate-in slide-in-from-bottom duration-500 delay-300"
      >
        <Plus className="mr-2 h-4 w-4" />
        Erste Vorlage erstellen
      </Button>
      
      {/* Benefits Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 max-w-2xl animate-in slide-in-from-bottom duration-500 delay-500">
        <BenefitCard
          icon={<FileText className="h-5 w-5" />}
          title="Konsistenz"
          description="Einheitliche Dokumente für alle Ihre Immobilien"
        />
        <BenefitCard
          icon={<RefreshCw className="h-5 w-5" />}
          title="Zeitersparnis"
          description="Wiederverwendbare Inhalte für häufige Dokumente"
        />
        <BenefitCard
          icon={<Plus className="h-5 w-5" />}
          title="Flexibilität"
          description="Anpassbare Variablen für individuelle Anpassungen"
        />
      </div>
      
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Keine Vorlagen vorhanden. Sie können Ihre erste Vorlage erstellen, um Zeit bei wiederkehrenden Dokumenten zu sparen.
      </div>
    </div>
  )
}

/**
 * Empty state when search/filter returns no results
 */
interface NoResultsEmptyStateProps {
  hasSearch: boolean
  hasFilter: boolean
  onClearFilters?: () => void
  onCreateTemplate: () => void
  className?: string
}

function NoResultsEmptyState({ 
  hasSearch, 
  hasFilter, 
  onClearFilters, 
  onCreateTemplate,
  className 
}: NoResultsEmptyStateProps) {
  const getTitle = () => {
    if (hasSearch && hasFilter) {
      return "Keine passenden Vorlagen gefunden"
    } else if (hasSearch) {
      return "Keine Suchergebnisse"
    } else {
      return "Keine Vorlagen in dieser Kategorie"
    }
  }

  const getDescription = () => {
    if (hasSearch && hasFilter) {
      return "Ihre Suche und der gewählte Filter ergaben keine Treffer. Versuchen Sie andere Suchbegriffe oder wählen Sie eine andere Kategorie."
    } else if (hasSearch) {
      return "Ihre Suche ergab keine Treffer. Versuchen Sie andere Suchbegriffe oder erstellen Sie eine neue Vorlage."
    } else {
      return "In dieser Kategorie sind noch keine Vorlagen vorhanden. Erstellen Sie die erste Vorlage für diese Kategorie."
    }
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 text-center min-h-[400px]",
      className
    )}>
      {/* Icon */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center mb-6 animate-in fade-in duration-500">
        {hasSearch ? (
          <Search className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
        ) : (
          <Filter className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
        )}
      </div>
      
      {/* Heading */}
      <h3 className="text-lg sm:text-xl font-semibold mb-2 text-foreground animate-in slide-in-from-bottom duration-500 delay-100">
        {getTitle()}
      </h3>
      
      {/* Description */}
      <p className="text-muted-foreground mb-6 max-w-md text-sm sm:text-base px-4 animate-in slide-in-from-bottom duration-500 delay-200">
        {getDescription()}
      </p>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 animate-in slide-in-from-bottom duration-500 delay-300">
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Filter zurücksetzen
          </Button>
        )}
        <Button onClick={onCreateTemplate}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Vorlage erstellen
        </Button>
      </div>
      
      {/* Search Tips */}
      {hasSearch && (
        <div className="mt-8 p-4 bg-muted/50 rounded-lg max-w-md animate-in slide-in-from-bottom duration-500 delay-500">
          <h4 className="text-sm font-medium mb-2 text-foreground">Suchtipps:</h4>
          <ul className="text-xs text-muted-foreground space-y-1 text-left">
            <li>• Verwenden Sie kürzere Suchbegriffe</li>
            <li>• Prüfen Sie die Rechtschreibung</li>
            <li>• Suchen Sie nach Kategorienamen</li>
            <li>• Verwenden Sie Teilwörter</li>
          </ul>
        </div>
      )}
      
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {getTitle()}. {getDescription()}
      </div>
    </div>
  )
}

/**
 * Benefit card component for the no templates empty state
 */
interface BenefitCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function BenefitCard({ icon, title, description }: BenefitCardProps) {
  return (
    <Card className="border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors">
      <CardContent className="p-4 text-center">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 text-primary">
          {icon}
        </div>
        <h4 className="font-medium text-sm mb-1 text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

/**
 * Error empty state for when template loading fails
 */
interface TemplatesErrorEmptyStateProps {
  error: string
  onRetry?: () => void
  onCreateTemplate?: () => void
  canRetry?: boolean
  className?: string
}

export function TemplatesErrorEmptyState({ 
  error, 
  onRetry, 
  onCreateTemplate,
  canRetry = true,
  className 
}: TemplatesErrorEmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 text-center min-h-[400px]",
      className
    )}>
      {/* Error Icon */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6 animate-in fade-in duration-500">
        <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-destructive" />
      </div>
      
      {/* Heading */}
      <h3 className="text-lg sm:text-xl font-semibold mb-2 text-foreground animate-in slide-in-from-bottom duration-500 delay-100">
        Fehler beim Laden der Vorlagen
      </h3>
      
      {/* Error Message */}
      <p className="text-muted-foreground mb-6 max-w-md text-sm sm:text-base px-4 animate-in slide-in-from-bottom duration-500 delay-200">
        {error}
      </p>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 animate-in slide-in-from-bottom duration-500 delay-300">
        {canRetry && onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Erneut versuchen
          </Button>
        )}
        {onCreateTemplate && (
          <Button onClick={onCreateTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Vorlage erstellen
          </Button>
        )}
      </div>
      
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        Fehler beim Laden der Vorlagen: {error}
      </div>
    </div>
  )
}

/**
 * Offline empty state for when user is offline
 */
interface TemplatesOfflineEmptyStateProps {
  onRetry?: () => void
  className?: string
}

export function TemplatesOfflineEmptyState({ onRetry, className }: TemplatesOfflineEmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 text-center min-h-[400px]",
      className
    )}>
      {/* Offline Icon */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 animate-in fade-in duration-500">
        <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-amber-600" />
      </div>
      
      {/* Heading */}
      <h3 className="text-lg sm:text-xl font-semibold mb-2 text-foreground animate-in slide-in-from-bottom duration-500 delay-100">
        Keine Internetverbindung
      </h3>
      
      {/* Description */}
      <p className="text-muted-foreground mb-6 max-w-md text-sm sm:text-base px-4 animate-in slide-in-from-bottom duration-500 delay-200">
        Vorlagen können nicht geladen werden, da keine Internetverbindung besteht. 
        Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.
      </p>
      
      {/* Retry Button */}
      {onRetry && (
        <Button 
          variant="outline" 
          onClick={onRetry}
          className="animate-in slide-in-from-bottom duration-500 delay-300"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Erneut versuchen
        </Button>
      )}
      
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Keine Internetverbindung. Vorlagen können nicht geladen werden.
      </div>
    </div>
  )
}