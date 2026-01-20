import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/common/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { PostHogProvider } from "@/components/providers/posthog-provider"
import { CookieConsentBanner } from "@/components/common/cookie-consent-banner"
import { defaultMetadata } from "@/lib/seo"
import { PWA_IMAGES_URL, FAVICON_URL } from "@/lib/constants"

import { headers } from "next/headers"

const inter = Inter({ subsets: ["latin"] })

// Note: runtime = 'edge' removed from root layout to allow landing pages to be static.
// Dashboard and API routes have their own edge runtime configuration.

export const metadata: Metadata = {
  ...defaultMetadata,
  icons: {
    icon: [
      // Primary: Local favicon for Google crawlability (avoids Supabase x-robots-tag: none)
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      // Fallback: Supabase PNGs in various sizes
      { url: `${PWA_IMAGES_URL}/favicon/favicon-16x16.png`, sizes: '16x16', type: 'image/png' },
      { url: `${PWA_IMAGES_URL}/favicon/favicon-32x32.png`, sizes: '32x32', type: 'image/png' },
      { url: `${PWA_IMAGES_URL}/favicon/favicon-192x192.png`, sizes: '192x192', type: 'image/png' },
      { url: FAVICON_URL, type: 'image/png' },
    ],
    apple: `${PWA_IMAGES_URL}/apple-icon.png`,
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="de" suppressHydrationWarning className="light">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={true}>
          <PostHogProvider nonce={nonce}>
            {children}
            <Toaster />
            <CookieConsentBanner />
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
