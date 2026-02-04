import type React from "react"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { CSPNonceSync } from "@/components/providers/csp-nonce-sync"

// Cloudflare Pages requires dynamic routes to be marked as edge
export const runtime = 'edge'

// Auth layout metadata - common settings for all auth pages
export const metadata: Metadata = {
  // Auth pages will override with their specific metadata
  // This provides sensible defaults for any auth pages without specific metadata
  title: {
    template: '%s | Mietevo',
    default: 'Authentifizierung | Mietevo',
  },
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const nonce = (await headers()).get('x-nonce')

  return (
    <div className="min-h-screen bg-background">
      <CSPNonceSync nonce={nonce} />
      {children}
    </div>
  )
}
