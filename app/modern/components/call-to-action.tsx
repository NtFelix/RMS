"use client"

import { useState } from "react"
import { ArrowRight, Download, ExternalLink, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { EXAMPLE_BILL_PDF_URL } from "@/lib/constants"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  trackCTAClicked,
  trackExamplePDFDownloaded,
  trackDemoRequestClicked,
  trackDemoConfirmed,
  type CTASource,
} from "@/lib/posthog-landing-events"

interface CallToActionProps {
  variant?: 'default' | 'hero' | 'cta'
  onGetStarted: () => void
}

export function CallToAction({ variant = 'default', onGetStarted }: CallToActionProps) {
  const isHero = variant === 'hero'
  const source: CTASource = isHero ? 'hero' : 'bottom_cta'

  const handleGetStarted = () => {
    trackCTAClicked(source, 'Jetzt loslegen')
    onGetStarted()
  }

  const handlePDFDownload = () => {
    trackExamplePDFDownloaded(EXAMPLE_BILL_PDF_URL)
  }

  const handleDemoRequest = () => {
    trackDemoRequestClicked(source)
  }

  const handleDemoConfirm = () => {
    const calendarUrl = "https://calendar.notion.so/meet/felix-b0111/demo-anfordern"
    trackDemoConfirmed(calendarUrl)
    window.open(calendarUrl, "_blank")
  }


  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
      <Button
        size="lg"
        onClick={handleGetStarted}
        className="relative px-12 py-6 text-xl font-semibold group overflow-hidden"
      >
        <span className="flex items-center">
          Jetzt loslegen
          <ArrowRight className={`${isHero ? 'ml-2 w-5 h-5' : 'ml-3 w-6 h-6'} group-hover:translate-x-1 transition-transform`} />
        </span>
      </Button>

      {isHero ? (
        <Button
          size="lg"
          variant="outline"
          className="px-12 py-6 text-xl font-semibold group text-foreground hover:bg-muted hover:text-foreground transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg"
          asChild
        >
          <Link
            href={EXAMPLE_BILL_PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handlePDFDownload}
          >
            <span className="flex items-center">
              <Download className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              Beispiel-Abrechnung
            </span>
          </Link>
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="lg"
              variant="outline"
              className="px-12 py-6 text-xl font-semibold group text-foreground hover:bg-muted hover:text-foreground transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg"
              onClick={handleDemoRequest}
            >
              <span className="flex items-center">
                Demo anfordern
                <ExternalLink className="ml-2 w-5 h-5 group-hover:scale-110 transition-transform" />
              </span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Demo buchen</AlertDialogTitle>
              <AlertDialogDescription>
                Sie werden auf eine neue Seite weitergeleitet, wo Sie einen Termin für eine Demo mit Felix buchen können.
                Es handelt sich um einen Notion Kalender-Link.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDemoConfirm}>
                Weiterleiten
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
