"use client"

import * as React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DataTableErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface DataTableErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

class DataTableErrorBoundaryClass extends React.Component<
  DataTableErrorBoundaryProps,
  DataTableErrorBoundaryState
> {
  constructor(props: DataTableErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): DataTableErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DataTable Error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} retry={this.retry} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, retry }: { error?: Error; retry: () => void }) {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-lg">Fehler beim Laden der Tabelle</CardTitle>
        <CardDescription>
          Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        {error && (
          <details className="mb-4 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              Technische Details anzeigen
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
              {error.message}
            </pre>
          </details>
        )}
        <Button onClick={retry} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Erneut versuchen
        </Button>
      </CardContent>
    </Card>
  )
}

export function DataTableErrorBoundary(props: DataTableErrorBoundaryProps) {
  return <DataTableErrorBoundaryClass {...props} />
}