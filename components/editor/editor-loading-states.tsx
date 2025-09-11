"use client"

import React from 'react'
import { Loader2, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <Loader2 
      className={cn(
        'animate-spin text-blue-500',
        sizeClasses[size],
        className
      )} 
    />
  )
}

interface ProgressBarProps {
  progress: number
  className?: string
  showPercentage?: boolean
}

export function ProgressBar({ progress, className, showPercentage = false }: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress))
  
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-muted-foreground">Wird geladen...</span>
        {showPercentage && (
          <span className="text-sm text-muted-foreground">{Math.round(clampedProgress)}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}

interface EditorLoadingStateProps {
  stage: 'initializing' | 'parsing' | 'rendering' | 'ready' | 'error'
  progress?: number
  message?: string
  error?: string
  className?: string
  showProgress?: boolean
}

export function EditorLoadingState({ 
  stage, 
  progress = 0, 
  message, 
  error,
  className,
  showProgress = true
}: EditorLoadingStateProps) {
  const getStageInfo = () => {
    switch (stage) {
      case 'initializing':
        return {
          icon: <LoadingSpinner size="lg" />,
          title: 'Editor wird initialisiert...',
          description: message || 'TipTap Editor wird geladen und konfiguriert',
          color: 'text-blue-500'
        }
      case 'parsing':
        return {
          icon: <LoadingSpinner size="lg" />,
          title: 'Inhalt wird verarbeitet...',
          description: message || 'Template-Inhalt wird geparst und validiert',
          color: 'text-blue-500'
        }
      case 'rendering':
        return {
          icon: <LoadingSpinner size="lg" />,
          title: 'Editor wird gerendert...',
          description: message || 'Benutzeroberfläche wird aufgebaut',
          color: 'text-blue-500'
        }
      case 'ready':
        return {
          icon: <CheckCircle className="h-8 w-8 text-green-500" />,
          title: 'Editor bereit',
          description: message || 'Editor wurde erfolgreich geladen',
          color: 'text-green-500'
        }
      case 'error':
        return {
          icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
          title: 'Fehler beim Laden',
          description: error || message || 'Ein Fehler ist beim Laden des Editors aufgetreten',
          color: 'text-red-500'
        }
      default:
        return {
          icon: <LoadingSpinner size="lg" />,
          title: 'Wird geladen...',
          description: message || 'Bitte warten...',
          color: 'text-blue-500'
        }
    }
  }

  const stageInfo = getStageInfo()

  return (
    <div className={cn(
      'min-h-[200px] flex flex-col items-center justify-center p-8 text-center',
      className
    )}>
      <div className="mb-4">
        {stageInfo.icon}
      </div>
      
      <h3 className={cn('text-lg font-semibold mb-2', stageInfo.color)}>
        {stageInfo.title}
      </h3>
      
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        {stageInfo.description}
      </p>
      
      {showProgress && stage !== 'ready' && stage !== 'error' && (
        <div className="w-full max-w-xs">
          <ProgressBar progress={progress} showPercentage />
        </div>
      )}
      
      {stage === 'error' && (
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Seite neu laden
        </button>
      )}
    </div>
  )
}

interface InitializationProgressProps {
  steps: Array<{
    id: string
    label: string
    completed: boolean
    error?: boolean
  }>
  currentStep?: string
  className?: string
}

export function InitializationProgress({ 
  steps, 
  currentStep, 
  className 
}: InitializationProgressProps) {
  return (
    <div className={cn('w-full max-w-md', className)}>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep
          const isCompleted = step.completed
          const hasError = step.error
          
          return (
            <div 
              key={step.id}
              className={cn(
                'flex items-center space-x-3 p-2 rounded-md transition-colors',
                isActive && 'bg-blue-50 dark:bg-blue-900/20',
                isCompleted && !hasError && 'bg-green-50 dark:bg-green-900/20',
                hasError && 'bg-red-50 dark:bg-red-900/20'
              )}
            >
              <div className="flex-shrink-0">
                {hasError ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : isActive ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Clock className="h-4 w-4 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  hasError && 'text-red-700 dark:text-red-300',
                  isCompleted && !hasError && 'text-green-700 dark:text-green-300',
                  isActive && !hasError && 'text-blue-700 dark:text-blue-300',
                  !isActive && !isCompleted && !hasError && 'text-gray-500'
                )}>
                  {step.label}
                </p>
              </div>
              
              <div className="flex-shrink-0">
                <span className={cn(
                  'text-xs px-2 py-1 rounded-full',
                  hasError && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                  isCompleted && !hasError && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                  isActive && !hasError && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                  !isActive && !isCompleted && !hasError && 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                )}>
                  {hasError ? 'Fehler' : isCompleted ? 'Fertig' : isActive ? 'Aktiv' : 'Wartend'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ContentLoadingSkeletonProps {
  lines?: number
  className?: string
}

export function ContentLoadingSkeleton({ lines = 5, className }: ContentLoadingSkeletonProps) {
  return (
    <div className={cn('space-y-3 animate-pulse', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className={cn(
            'h-4 bg-gray-200 dark:bg-gray-700 rounded',
            index === 0 && 'w-3/4', // First line shorter (like a title)
            index === 1 && 'w-full',
            index === 2 && 'w-5/6',
            index === 3 && 'w-4/5',
            index >= 4 && 'w-2/3'
          )} />
        </div>
      ))}
      
      {/* Variable placeholders */}
      <div className="flex space-x-2 mt-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div 
            key={index}
            className="h-6 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full"
          />
        ))}
      </div>
    </div>
  )
}

interface PerformanceIndicatorProps {
  metrics: {
    initTime?: number
    parseTime?: number
    renderTime?: number
    memoryUsage?: number
  }
  className?: string
}

export function PerformanceIndicator({ metrics, className }: PerformanceIndicatorProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className={cn(
      'fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded-md font-mono z-50',
      className
    )}>
      <div className="space-y-1">
        {metrics.initTime && (
          <div>Init: {metrics.initTime.toFixed(1)}ms</div>
        )}
        {metrics.parseTime && (
          <div>Parse: {metrics.parseTime.toFixed(1)}ms</div>
        )}
        {metrics.renderTime && (
          <div>Render: {metrics.renderTime.toFixed(1)}ms</div>
        )}
        {metrics.memoryUsage && (
          <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
        )}
      </div>
    </div>
  )
}