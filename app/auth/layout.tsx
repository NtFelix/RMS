import type React from "react"
import type { Metadata } from "next"
import { Suspense } from "react"
import { AuthNonceSync, AuthRedirectGate } from "./auth-request-gates"

// Auth layout metadata - common settings for all auth pages
export const metadata: Metadata = {
  // Auth pages will override with their specific metadata
  // This provides sensible defaults for any auth pages without specific metadata
  title: {
    template: '%s | Mietevo',
    default: 'Authentifizierung | Mietevo',
  },
}

// Static shell: no request-time APIs are read here, so auth pages can prerender.
// Request-time work lives in Suspense-wrapped components in auth-request-gates.tsx.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <AuthNonceSync />
      </Suspense>
      <Suspense fallback={null}>
        <AuthRedirectGate />
      </Suspense>
      {children}
    </div>
  )
}
