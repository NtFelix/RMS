"use client"

import { Sparkles } from "lucide-react"
import { CallToAction } from "./call-to-action"
import { VideoPlayer } from "@/components/ui/video-player"
import { HERO_VIDEO_URL } from "@/lib/constants"

interface HeroProps {
  onGetStarted: () => void;
}

export default function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background text-foreground">
      {/* Static Background Pattern - Adjusted for theme */}
      <div className="absolute inset-0 opacity-20 dark:opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-background" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary-foreground)/0.05) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, hsl(var(--secondary-foreground)/0.05) 0%, transparent 50%),
                           linear-gradient(45deg, transparent 40%, hsl(var(--muted-foreground)/0.03) 50%, transparent 60%)`,
          }}
        />
      </div>

      {/* Static Decorative Elements - Adjusted for theme */}
      <div className="absolute top-20 left-20 w-4 h-4 bg-primary/50 rounded-full opacity-60" />
      <div className="absolute top-40 right-32 w-6 h-6 border-2 border-secondary/50 rotate-45 opacity-60" />
      <div className="absolute bottom-32 left-32 w-8 h-8 bg-gradient-to-r from-primary/60 to-secondary/60 rounded-full opacity-60" />

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

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent leading-tight tracking-tight">
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
              <div className="absolute -inset-6 bg-gradient-to-r from-primary/20 to-secondary/20 blur-2xl rounded-3xl" aria-hidden />
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                {/* Window top bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="ml-3 text-sm text-muted-foreground truncate">Demo: Abrechnung erstellen</div>
                </div>

                {/* Video content */}
                <div className="p-4 sm:p-6">
                  <VideoPlayer
                    src={HERO_VIDEO_URL}
                    className="w-full aspect-video rounded-lg"
                    autoplay={true}
                    muted={true}
                    loop={true}
                    playsInline={true}
                    showPosterFallback={true}
                  />
                  
                  <p className="mt-3 text-sm text-muted-foreground">
                    Sehen Sie, wie einfach es ist, eine komplette Nebenkostenabrechnung zu erstellen. 
                    Von der Eingabe bis zum fertigen PDF in wenigen Minuten.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Gradient - Adjusted for theme */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}

