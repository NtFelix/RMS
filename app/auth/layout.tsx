import type React from "react"
import type { Metadata } from "next"

// Auth layout metadata - common settings for all auth pages
export const metadata: Metadata = {
  // Auth pages will override with their specific metadata
  // This provides sensible defaults for any auth pages without specific metadata
  title: {
    template: '%s | Mietevo',
    default: 'Authentifizierung | Mietevo',
  },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-background">{children}</div>
}
