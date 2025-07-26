"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const COOKIE_CONSENT_KEY = "cookie_consent"

type Consent = {
  analytics: boolean
  timestamp: number | null
}

export default function CookieBanner() {
  const [consent, setConsent] = useState<Consent | null>(null)

  useEffect(() => {
    try {
      const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY)
      if (storedConsent) {
        setConsent(JSON.parse(storedConsent))
      }
    } catch (error) {
      console.error("Could not parse cookie consent from localStorage", error)
    }
  }, [])

  const handleAccept = () => {
    const newConsent: Consent = { analytics: true, timestamp: Date.now() }
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsent))
    setConsent(newConsent)
    window.location.reload() // Reload to initialize PostHog
  }

  const handleDecline = () => {
    const newConsent: Consent = { analytics: false, timestamp: Date.now() }
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsent))
    setConsent(newConsent)
  }

  if (consent) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white p-6 shadow-lg">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <h3 className="text-xl font-bold">Cookie-Einstellungen</h3>
          <p className="mt-2 text-gray-300">
            Wir verwenden Cookies, um Ihr Erlebnis zu verbessern. Durch die Nutzung unserer Website stimmen Sie der Verwendung von Cookies zu.
            Weitere Informationen finden Sie in unserer{" "}
            <Link href="/privacy" className="text-blue-400 hover:underline">
              Datenschutzerklärung
            </Link>
            .
          </p>
        </div>
        <div className="flex-shrink-0 flex gap-4">
          <Button
            variant="outline"
            className="bg-transparent border-gray-500 text-white hover:bg-gray-800"
            onClick={handleDecline}
          >
            Alle ablehnen
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleAccept}
          >
            Alle akzeptieren
          </Button>
        </div>
      </div>
    </div>
  )
}
