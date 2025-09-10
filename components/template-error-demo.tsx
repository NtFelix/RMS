'use client'

/**
 * Template Error Handling Demo Component
 * 
 * Demonstrates how to use the template error handling system
 * in React components. This is for development/testing purposes.
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

import { 
  useTemplateErrorHandling, 
  useTemplateOperationError,
  useSafeAsyncOperation,
  useTemplateErrorStatistics 
} from '@/hooks/use-template-error-handling'
import { TemplateErrorType } from '@/lib/template-error-handler'
import { TemplateValidator } from '@/lib/template-validation'
import { TemplateErrorBoundary } from '@/components/template-error-boundary'

/**
 * Demo component showing error handling usage
 */
export function TemplateErrorDemo() {
  const [templateData, setTemplateData] = useState({
    titel: '',
    kategorie: '',
    inhalt: { type: 'doc', content: [] }
  })

  const errorHandling = useTemplateErrorHandling({
    context: { component: 'TemplateErrorDemo' },
    onError: (error) => {
      console.log('Custom error handler called:', error)
    }
  })

  const operationError = useTemplateOperationError()
  const safeAsync = useSafeAsyncOperation()
  const errorStats = useTemplateErrorStatistics()

  // Simulate different types of errors
  const simulateError = (errorType: TemplateErrorType) => {
    const error = errorHandling.createError(
      errorType,
      `Simulated ${errorType} error`,
      { simulation: true }
    )
    errorHandling.handleError(error)
  }

  // Simulate validation
  const validateTemplate = () => {
    const validator = new TemplateValidator()
    const result = validator.validate(templateData)
    
    if (!result.isValid) {
      const error = errorHandling.createError(
        TemplateErrorType.INVALID_TEMPLATE_DATA,
        'Template validation failed',
        result.errors
      )
      errorHandling.handleError(error)
    } else {
      console.log('Template is valid!', result)
    }
  }

  // Simulate async operation with error handling
  const simulateAsyncOperation = async () => {
    await safeAsync.execute(async () => {
      // Simulate random success/failure
      if (Math.random() > 0.5) {
        throw new Error('Random async operation failed')
      }
      return 'Operation successful!'
    }, {
      retries: 2,
      context: { component: 'TemplateErrorDemo', operation: 'simulateAsync' }
    })
  }

  // Simulate recovery operation
  const simulateRecovery = () => {
    errorHandling.retry(async () => {
      // Simulate operation that might fail
      if (Math.random() > 0.7) {
        throw new Error('Recovery operation failed')
      }
      console.log('Recovery successful!')
    })
  }

  return (
    <TemplateErrorBoundary>
      <div className="space-y-6 p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Template Error Handling Demo</CardTitle>
            <CardDescription>
              Demonstrates the comprehensive error handling system for templates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Status Display */}
            {errorHandling.hasError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Error Detected</p>
                  <p className="text-sm text-red-700">{errorHandling.error?.message}</p>
                  <p className="text-xs text-red-600">Type: {errorHandling.error?.type}</p>
                </div>
                <Button 
                  onClick={errorHandling.clearError} 
                  variant="outline" 
                  size="sm"
                  className="ml-auto"
                >
                  Clear
                </Button>
              </div>
            )}

            {/* Recovery Status */}
            {errorHandling.isRecovering && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                <p className="text-blue-900">Attempting recovery...</p>
              </div>
            )}

            {/* Async Operation Status */}
            {safeAsync.isLoading && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <RefreshCw className="w-5 h-5 text-yellow-600 animate-spin" />
                <p className="text-yellow-900">Async operation in progress...</p>
              </div>
            )}

            {safeAsync.data && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-900">Success: {safeAsync.data}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Template Data Form */}
        <Card>
          <CardHeader>
            <CardTitle>Template Data (for Validation Demo)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="titel">Title</Label>
              <Input
                id="titel"
                value={templateData.titel}
                onChange={(e) => setTemplateData(prev => ({ ...prev, titel: e.target.value }))}
                placeholder="Enter template title"
              />
            </div>
            
            <div>
              <Label htmlFor="kategorie">Category</Label>
              <Input
                id="kategorie"
                value={templateData.kategorie}
                onChange={(e) => setTemplateData(prev => ({ ...prev, kategorie: e.target.value }))}
                placeholder="Enter template category"
              />
            </div>

            <Button onClick={validateTemplate} variant="outline">
              Validate Template
            </Button>
          </CardContent>
        </Card>

        {/* Error Simulation Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Error Simulation</CardTitle>
            <CardDescription>
              Test different error scenarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button 
                onClick={() => simulateError(TemplateErrorType.TEMPLATE_NOT_FOUND)}
                variant="destructive"
                size="sm"
              >
                Not Found Error
              </Button>
              
              <Button 
                onClick={() => simulateError(TemplateErrorType.TEMPLATE_SAVE_FAILED)}
                variant="destructive"
                size="sm"
              >
                Save Failed
              </Button>
              
              <Button 
                onClick={() => simulateError(TemplateErrorType.PERMISSION_DENIED)}
                variant="destructive"
                size="sm"
              >
                Permission Denied
              </Button>
              
              <Button 
                onClick={() => simulateError(TemplateErrorType.NETWORK_ERROR)}
                variant="destructive"
                size="sm"
              >
                Network Error
              </Button>
              
              <Button 
                onClick={() => simulateError(TemplateErrorType.EDITOR_INITIALIZATION_FAILED)}
                variant="destructive"
                size="sm"
              >
                Editor Error
              </Button>
              
              <Button 
                onClick={() => simulateError(TemplateErrorType.SYSTEM_ERROR)}
                variant="destructive"
                size="sm"
              >
                System Error
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recovery and Async Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Recovery & Async Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={simulateRecovery} variant="outline">
              Test Recovery Operation
            </Button>
            
            <Button onClick={simulateAsyncOperation} variant="outline">
              Test Safe Async Operation
            </Button>
            
            <Button onClick={safeAsync.reset} variant="outline" size="sm">
              Reset Async State
            </Button>
          </CardContent>
        </Card>

        {/* Error Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Error Statistics</CardTitle>
            <CardDescription>
              Current error statistics and monitoring data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-medium">Total Errors</p>
                <p className="text-2xl font-bold text-red-600">{errorStats.statistics.totalErrors}</p>
              </div>
              
              <div>
                <p className="font-medium">Critical Errors</p>
                <p className="text-2xl font-bold text-red-800">{errorStats.statistics.criticalErrors.length}</p>
              </div>
              
              <div>
                <p className="font-medium">Recent Errors</p>
                <p className="text-2xl font-bold text-orange-600">{errorStats.statistics.recentErrors.length}</p>
              </div>
              
              <div>
                <p className="font-medium">Components</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Object.keys(errorStats.statistics.errorsByComponent).length}
                </p>
              </div>
            </div>
            
            <div className="mt-4 space-x-2">
              <Button onClick={errorStats.refreshStatistics} variant="outline" size="sm">
                Refresh Stats
              </Button>
              
              <Button onClick={errorStats.clearLogs} variant="outline" size="sm">
                Clear Logs
              </Button>
              
              <Button 
                onClick={() => {
                  const report = errorStats.generateReport()
                  console.log('Error Report:', report)
                }} 
                variant="outline" 
                size="sm"
              >
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TemplateErrorBoundary>
  )
}

/**
 * Component that intentionally throws an error to test error boundaries
 */
export function ErrorThrowingComponent() {
  const [shouldThrow, setShouldThrow] = useState(false)

  if (shouldThrow) {
    throw new Error('Intentional error for testing error boundary')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Boundary Test</CardTitle>
        <CardDescription>
          Click the button to test the error boundary
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={() => setShouldThrow(true)}
          variant="destructive"
        >
          Throw Error
        </Button>
      </CardContent>
    </Card>
  )
}