"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Loading skeleton component for templates management modal
 * Shows animated placeholders while templates are being loaded
 */
interface TemplatesLoadingSkeletonProps {
  /** Number of template cards to show in skeleton */
  count?: number
  /** Whether to show category grouping in skeleton */
  showCategories?: boolean
  /** Additional CSS classes */
  className?: string
}

export function TemplatesLoadingSkeleton({ 
  count = 8, 
  showCategories = true,
  className 
}: TemplatesLoadingSkeletonProps) {
  if (showCategories) {
    return (
      <div className={cn("space-y-8", className)} data-testid="templates-loading-skeleton">
        {/* Category sections skeleton */}
        {Array.from({ length: 3 }).map((_, sectionIndex) => (
          <div key={sectionIndex} className="space-y-4">
            {/* Category header skeleton */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            
            {/* Templates grid skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: Math.min(4, count) }).map((_, cardIndex) => (
                <TemplateCardSkeleton 
                  key={cardIndex} 
                  delay={sectionIndex * 100 + cardIndex * 50}
                />
              ))}
            </div>
          </div>
        ))}
        
        {/* Screen reader announcement */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          Vorlagen werden geladen, bitte warten Sie einen Moment.
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)} data-testid="templates-loading-skeleton">
      {/* Single grid without categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, index) => (
          <TemplateCardSkeleton 
            key={index} 
            delay={index * 30}
          />
        ))}
      </div>
      
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Vorlagen werden geladen, bitte warten Sie einen Moment.
      </div>
    </div>
  )
}

/**
 * Individual template card skeleton
 */
interface TemplateCardSkeletonProps {
  delay?: number
  className?: string
}

function TemplateCardSkeleton({ delay = 0, className }: TemplateCardSkeletonProps) {
  return (
    <Card 
      className={cn(
        "group hover:shadow-md transition-all duration-200 animate-pulse",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Template title skeleton */}
            <Skeleton className="h-5 w-3/4" />
            
            {/* Category and variable badges skeleton */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          </div>
          
          {/* Action menu skeleton */}
          <Skeleton className="h-6 w-6 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Content preview skeleton */}
        <div className="space-y-2 mb-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
        
        {/* Metadata skeleton */}
        <div className="flex items-center justify-between text-xs">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        {/* Edit button skeleton */}
        <Skeleton className="h-8 w-full" />
      </CardFooter>
    </Card>
  )
}

/**
 * Compact loading skeleton for search results
 */
interface TemplateSearchLoadingProps {
  count?: number
  className?: string
}

export function TemplateSearchLoading({ count = 3, className }: TemplateSearchLoadingProps) {
  return (
    <div className={cn("space-y-3", className)} data-testid="template-search-loading">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="flex items-center p-3 space-x-3 rounded-lg border bg-card animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Skeleton className="h-8 w-8 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
      
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite">
        Suchergebnisse werden geladen.
      </div>
    </div>
  )
}

/**
 * Loading skeleton for individual template operations
 */
interface TemplateOperationLoadingProps {
  operation: 'create' | 'update' | 'delete' | 'duplicate'
  templateName?: string
  className?: string
}

export function TemplateOperationLoading({ 
  operation, 
  templateName,
  className 
}: TemplateOperationLoadingProps) {
  const getOperationText = () => {
    switch (operation) {
      case 'create':
        return 'Vorlage wird erstellt'
      case 'update':
        return 'Vorlage wird aktualisiert'
      case 'delete':
        return 'Vorlage wird gelöscht'
      case 'duplicate':
        return 'Vorlage wird dupliziert'
      default:
        return 'Wird verarbeitet'
    }
  }

  const getOperationColor = () => {
    switch (operation) {
      case 'delete':
        return 'bg-red-50 border-red-200 text-red-900'
      case 'create':
        return 'bg-green-50 border-green-200 text-green-900'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-900'
    }
  }

  return (
    <div className={cn(
      "flex items-center space-x-3 p-3 rounded-lg border animate-pulse",
      getOperationColor(),
      className
    )}>
      <div className="flex-shrink-0">
        <div className="h-4 w-4 bg-current rounded animate-spin opacity-60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {getOperationText()}
        </p>
        {templateName && (
          <p className="text-xs opacity-75 truncate">
            {templateName}
          </p>
        )}
      </div>
      
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite">
        {getOperationText()}{templateName ? `: ${templateName}` : ''}
      </div>
    </div>
  )
}

/**
 * Loading state for template content preview
 */
export function TemplatePreviewLoading({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-4 border rounded-lg animate-pulse", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-20" />
      </div>
      
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      
      <div className="flex items-center space-x-2 pt-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      
      {/* Screen reader announcement */}
      <div className="sr-only" aria-live="polite">
        Vorlagen-Vorschau wird geladen.
      </div>
    </div>
  )
}