"use client"

import { Sparkles } from "lucide-react"
import { CallToAction } from "./call-to-action"
import { VideoPlayer } from "@/components/ui/video-player"
import { BackgroundBeams } from "@/components/ui/background-beams"
import { MacWindow } from "@/components/ui/mac-window"
import { HERO_VIDEO_URL } from "@/lib/constants"

interface HeroProps {
  onGetStarted: () => void;
}

export default function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background text-foreground">
      {/* Animated Background Beams */}
      <BackgroundBeams />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 pt-28 md:pt-32 pb-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 gap-12 items-center">
          {/* Left: Headline and CTA */}
          <div className="text-center w-full">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 border border-border backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Vereinfachen Sie Ihre Abrechnung</span>
              </div>
            </div>

            <h1 className="animate-fade-in text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent leading-tight tracking-tight">
              <span className="bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
                Abrechnung in 5 Minuten
              </span>
              <br />
              <span className="text-foreground/80">
                statt Stunden mit Excel
              </span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed text-center">
              Erstellen Sie mühelos korrekte und transparente Abrechnungen. Sparen Sie Zeit und vermeiden Sie Fehler mit unserer benutzerfreundlichen Lösung für Vermieter und Immobilienverwalter.
            </p>

            <div className="flex flex-col items-center">
              <CallToAction variant="hero" onGetStarted={onGetStarted} />
            </div>
          </div>

          {/* Right: Product mockup */}
          <div className="w-full">
            <div className="relative">
              <MacWindow>
                {/* Video content */}
                <div>
                  <VideoPlayer
                    src={HERO_VIDEO_URL}
                    className="w-full aspect-video"
                    autoplay={true}
                    muted={true}
                    loop={true}
                    playsInline={true}
                    showPosterFallback={true}
                  />

                  <div className="p-4 sm:p-6">
                    <p className="text-sm text-muted-foreground">
                      Sehen Sie, wie einfach es ist, eine komplette Nebenkostenabrechnung zu erstellen.
                      Von der Eingabe bis zur fertigen PDF in wenigen Minuten.
                    </p>
                  </div>
                </div>
              </MacWindow>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient - Adjusted for theme */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}