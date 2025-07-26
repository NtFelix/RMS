"use client"

import * as React from "react"
import { Search, Database, Filter, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DataTableEmptyStateProps {
  title?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  action?: {
    label: string
    onClick: () => void
    icon?: React.ComponentType<{ className?: string }>
  }
  isFiltered?: boolean
  onClearFilters?: () => void
  searchTerm?: string
  onClearSearch?: () => void
  className?: string
}

export function DataTableEmptyState({
  title,
  description,
  icon: Icon = Database,
  action,
  isFiltered = false,
  onClearFilters,
  searchTerm,
  onClearSearch,
  className,
}: DataTableEmptyStateProps) {
  // Determine the appropriate message based on context
  const getEmptyStateContent = () => {
    if (searchTerm && isFiltered) {
      return {
        title: title || "Keine Ergebnisse gefunden",
        description: description || `Keine Daten entsprechen der Suche "${searchTerm}" und den aktiven Filtern.`,
        icon: Search,
      }
    }
    
    if (searchTerm) {
      return {
        title: title || "Keine Suchergebnisse",
        description: description || `Keine Daten entsprechen der Suche "${searchTerm}".`,
        icon: Search,
      }
    }
    
    if (isFiltered) {
      return {
        title: title || "Keine gefilterten Ergebnisse",
        description: description || "Keine Daten entsprechen den aktiven Filtern.",
        icon: Filter,
      }
    }
    
    return {
      title: title || "Keine Daten verfügbar",
      description: description || "Es sind noch keine Daten vorhanden. Erstellen Sie den ersten Eintrag.",
      icon: Icon,
    }
  }

  const content = getEmptyStateContent()
  const EmptyIcon = content.icon

  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <EmptyIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">{content.title}</CardTitle>
          <CardDescription className="text-sm">
            {content.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Clear filters/search actions */}
          {(searchTerm || isFiltered) && (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              {searchTerm && onClearSearch && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearSearch}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Suche zurücksetzen
                </Button>
              )}
              {isFiltered && onClearFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearFilters}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          )}
          
          {/* Primary action */}
          {action && !searchTerm && !isFiltered && (
            <Button
              onClick={action.onClick}
              className="flex items-center gap-2"
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Predefined empty states for common scenarios
export function DataTableNoDataState({
  entityName,
  onCreateNew,
  className,
}: {
  entityName: string
  onCreateNew?: () => void
  className?: string
}) {
  return (
    <DataTableEmptyState
      title={`Keine ${entityName} vorhanden`}
      description={`Sie haben noch keine ${entityName} erstellt. Erstellen Sie den ersten Eintrag, um zu beginnen.`}
      icon={Plus}
      action={
        onCreateNew
          ? {
              label: `${entityName} erstellen`,
              onClick: onCreateNew,
              icon: Plus,
            }
          : undefined
      }
      className={className}
    />
  )
}

export function DataTableSearchEmptyState({
  searchTerm,
  onClearSearch,
  className,
}: {
  searchTerm: string
  onClearSearch: () => void
  className?: string
}) {
  return (
    <DataTableEmptyState
      title="Keine Suchergebnisse"
      description={`Keine Ergebnisse für "${searchTerm}" gefunden. Versuchen Sie andere Suchbegriffe.`}
      icon={Search}
      searchTerm={searchTerm}
      onClearSearch={onClearSearch}
      className={className}
    />
  )
}

export function DataTableFilterEmptyState({
  onClearFilters,
  className,
}: {
  onClearFilters: () => void
  className?: string
}) {
  return (
    <DataTableEmptyState
      title="Keine gefilterten Ergebnisse"
      description="Keine Daten entsprechen den aktiven Filtern. Passen Sie die Filter an oder setzen Sie sie zurück."
      icon={Filter}
      isFiltered={true}
      onClearFilters={onClearFilters}
      className={className}
    />
  )
}

export function DataTableErrorState({
  title = "Fehler beim Laden",
  description = "Die Daten konnten nicht geladen werden. Bitte versuchen Sie es erneut.",
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <DataTableEmptyState
      title={title}
      description={description}
      icon={RefreshCw}
      action={
        onRetry
          ? {
              label: "Erneut versuchen",
              onClick: onRetry,
              icon: RefreshCw,
            }
          : undefined
      }
      className={className}
    />
  )
}