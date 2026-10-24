import { Loader2 } from "lucide-react"

// Static Suspense fallback of the dashboard layout while DashboardGate resolves. It is part of the
// prerendered shell for every dashboard route, so it must not show content of any single page and
// must not guess the sidebar geometry: a neutral centered spinner is correct for all routes.
export function DashboardShellFallback() {
  return (
    <div
      role="status"
      aria-label="Wird geladen"
      className="flex min-h-screen items-center justify-center bg-background"
    >
      <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden="true" />
    </div>
  )
}
