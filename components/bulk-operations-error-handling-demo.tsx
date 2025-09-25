/**
 * Demo component showcasing bulk operations error handling and user feedback
 * This component demonstrates various error scenarios and recovery mechanisms
 */

"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BulkOperationErrorDetails } from './bulk-operation-error-details'
import { BulkOperationFeedbackToast } from './bulk-operation-feedback-toast'
import { useBulkOperationsErrorHandler } from '@/hooks/use-bulk-operations-error-handler'
import { 
  BulkOperationResult,
  processBulkOperationResult,
  enhanceErrors 
} from '@/lib/bulk-operations-error-handling'
import { BulkOperationResponse, BulkOperationError } from '@/types/bulk-operations'

export function BulkOperationsErrorHandlingDemo() {
  const [currentResult, setCurrentResult] = useState<BulkOperationResult | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const errorHandler = useBulkOperationsErrorHandler()

  // Demo scenarios
  const scenarios = [
    {
      id: 'complete-success',
      title: 'Vollständiger Erfolg',
      description: 'Alle 5 Einträge erfolgreich aktualisiert',
      response: {
        success: true,
        updatedCount: 5,
        failedIds: [],
        errors: []
      } as BulkOperationResponse,
      totalRequested: 5,
      validationSkipped: 0
    },
    {
      id: 'partial-success',
      title: 'Teilweiser Erfolg',
      description: '3 erfolgreich, 2 fehlgeschlagen (1 wiederholbar)',
      response: {
        success: true,
        updatedCount: 3,
        failedIds: ['4', '5'],
        errors: [
          { id: '4', message: 'Network timeout', code: 'TIMEOUT' },
          { id: '5', message: 'Permission denied', code: 'PERMISSION_DENIED' }
        ] as BulkOperationError[]
      } as BulkOperationResponse,
      totalRequested: 5,
      validationSkipped: 0
    },
    {
      id: 'complete-failure',
      title: 'Vollständiger Fehler',
      description: 'Alle 4 Einträge fehlgeschlagen (alle wiederholbar)',
      response: {
        success: false,
        updatedCount: 0,
        failedIds: ['1', '2', '3', '4'],
        errors: [
          { id: '1', message: 'Server error', code: 'SERVER_ERROR' },
          { id: '2', message: 'Network error', code: 'NETWORK_ERROR' },
          { id: '3', message: 'Database timeout', code: 'DATABASE_ERROR' },
          { id: '4', message: 'Rate limited', code: 'RATE_LIMITED' }
        ] as BulkOperationError[]
      } as BulkOperationResponse,
      totalRequested: 4,
      validationSkipped: 0
    },
    {
      id: 'mixed-errors',
      title: 'Gemischte Fehler',
      description: '2 erfolgreich, 3 fehlgeschlagen, 1 übersprungen',
      response: {
        success: true,
        updatedCount: 2,
        failedIds: ['3', '4', '5'],
        errors: [
          { id: '3', message: 'Validation failed', code: 'VALIDATION_FAILED' },
          { id: '4', message: 'Not found', code: 'NOT_FOUND' },
          { id: '5', message: 'Server error', code: 'SERVER_ERROR' }
        ] as BulkOperationError[]
      } as BulkOperationResponse,
      totalRequested: 6,
      validationSkipped: 1
    },
    {
      id: 'critical-errors',
      title: 'Kritische Fehler',
      description: 'Schwerwiegende Systemfehler',
      response: {
        success: false,
        updatedCount: 0,
        failedIds: ['1', '2'],
        errors: [
          { id: '1', message: 'Internal system error', code: 'INTERNAL_ERROR' },
          { id: '2', message: 'Database corruption detected', code: 'DATABASE_ERROR' }
        ] as BulkOperationError[]
      } as BulkOperationResponse,
      totalRequested: 2,
      validationSkipped: 0
    }
  ]

  const handleScenario = (scenario: typeof scenarios[0]) => {
    const result = processBulkOperationResult(
      scenario.response,
      scenario.totalRequested,
      scenario.validationSkipped
    )
    
    setCurrentResult(result)
    setShowToast(true)
    setShowDetails(false)
  }

  const handleRetry = () => {
    if (!currentResult) return
    
    // Simulate retry with reduced failures
    const retryResponse: BulkOperationResponse = {
      success: true,
      updatedCount: Math.floor(currentResult.retryableIds.length * 0.8), // 80% success rate on retry
      failedIds: currentResult.retryableIds.slice(0, Math.ceil(currentResult.retryableIds.length * 0.2)),
      errors: currentResult.retryableIds.slice(0, Math.ceil(currentResult.retryableIds.length * 0.2)).map(id => ({
        id,
        message: 'Still failing after retry',
        code: 'PERSISTENT_ERROR'
      }))
    }
    
    const retryResult = processBulkOperationResult(
      retryResponse,
      currentResult.retryableIds.length,
      0
    )
    
    setCurrentResult(retryResult)
  }

  const handleViewDetails = () => {
    setShowDetails(true)
    setShowToast(false)
  }

  const handleCloseDetails = () => {
    setShowDetails(false)
  }

  const handleCloseToast = () => {
    setShowToast(false)
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Operations Error Handling Demo</CardTitle>
          <p className="text-muted-foreground">
            Diese Demo zeigt verschiedene Fehlerszenarien und wie das System darauf reagiert.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((scenario) => (
              <Card key={scenario.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">{scenario.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {scenario.description}
                  </p>
                  <Button
                    onClick={() => handleScenario(scenario)}
                    size="sm"
                    className="w-full"
                  >
                    Szenario testen
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Result Summary */}
      {currentResult && (
        <Card>
          <CardHeader>
            <CardTitle>Aktuelles Ergebnis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline" className="gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                {currentResult.updatedCount} erfolgreich
              </Badge>
              {currentResult.failedCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  {currentResult.failedCount} fehlgeschlagen
                </Badge>
              )}
              {currentResult.skippedCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                  {currentResult.skippedCount} übersprungen
                </Badge>
              )}
              {currentResult.canRetry && (
                <Badge variant="secondary">
                  {currentResult.retryableIds.length} wiederholbar
                </Badge>
              )}
            </div>
            
            <p className="text-sm mb-4">{currentResult.summary}</p>
            
            <div className="flex gap-2">
              <Button onClick={() => setShowToast(true)} size="sm">
                Toast anzeigen
              </Button>
              {(currentResult.failedCount > 0 || currentResult.skippedCount > 0) && (
                <Button onClick={handleViewDetails} variant="outline" size="sm">
                  Fehlerdetails anzeigen
                </Button>
              )}
              {currentResult.canRetry && (
                <Button onClick={handleRetry} variant="secondary" size="sm">
                  Wiederholen simulieren
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Error Handler State */}
      <Card>
        <CardHeader>
          <CardTitle>Error Handler Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Retry State:</strong> {errorHandler.retryState.isRetrying ? 'Aktiv' : 'Inaktiv'}
            </div>
            <div>
              <strong>Retry Count:</strong> {errorHandler.retryState.retryCount}
            </div>
            <div>
              <strong>Retryable IDs:</strong> {errorHandler.retryState.retryableIds.join(', ') || 'Keine'}
            </div>
            {errorHandler.retryState.lastError && (
              <div>
                <strong>Last Error:</strong> {errorHandler.retryState.lastError.message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Toast Overlay */}
      {showToast && currentResult && (
        <div className="fixed top-4 right-4 z-50">
          <div className="relative">
            <BulkOperationFeedbackToast
              result={currentResult}
              onRetry={currentResult.canRetry ? handleRetry : undefined}
              onViewDetails={handleViewDetails}
              isRetrying={errorHandler.retryState.isRetrying}
            />
            <Button
              onClick={handleCloseToast}
              size="sm"
              variant="ghost"
              className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-white shadow-md"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Error Details Modal */}
      {showDetails && currentResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Fehlerdetails</h2>
                <Button
                  onClick={handleCloseDetails}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
              <BulkOperationErrorDetails
                result={currentResult}
                onRetry={currentResult.canRetry ? handleRetry : undefined}
                isRetrying={errorHandler.retryState.isRetrying}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}