import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { PostHogProvider } from "./providers"
// Vercel Analytics: visitor/page view tracking. To remove, delete the import and usage below.
import { Analytics } from "@vercel/analytics/react"
// Vercel SpeedInsights: performance metrics collection. To remove, delete the import and usage below.
import { SpeedInsights } from "@vercel/speed-insights/next"
import CookieConsent from "@/components/cookie-consent"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Property Management Dashboard",
  description: "Modern dashboard for property management",
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="light">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <PostHogProvider>
            {children}
            <Toaster />
            {/* Vercel Analytics: visitor/page view tracking. Remove to disable. */}
            <Analytics />
            {/* Vercel SpeedInsights: performance metrics collection. Remove to disable. */}
            <SpeedInsights />
          </PostHogProvider>
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  )
}
