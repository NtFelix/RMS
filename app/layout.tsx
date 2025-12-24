import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/common/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { PostHogProvider } from "@/components/providers/posthog-provider"
import { CookieConsentBanner } from "@/components/common/cookie-consent-banner"
import { defaultMetadata } from "@/lib/seo"
import { PWA_IMAGES_URL } from "@/lib/constants"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  ...defaultMetadata,
  icons: {
    icon: [
      { url: `${PWA_IMAGES_URL}/favicon.ico`, sizes: '48x48', type: 'image/x-icon' },
      { url: `${PWA_IMAGES_URL}/favicon.png`, type: 'image/png' },
    ],
    apple: `${PWA_IMAGES_URL}/apple-icon.png`,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" suppressHydrationWarning className="light">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={true}>
          <PostHogProvider>
            {children}
            <Toaster />
            <CookieConsentBanner />
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
