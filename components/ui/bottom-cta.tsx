"use client"

import { motion } from "framer-motion"
import { Rocket, ArrowRight, Mail } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { trackCTAClicked } from "@/lib/posthog-landing-events"

interface BottomCTAProps {
  onGetStarted: () => void;
  title?: string;
  subtitle?: string;
  description?: string;
  badgeText?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
  showSecondaryButton?: boolean;
  className?: string;
  theme?: 'city' | 'houses';
}

export default function BottomCTA({
  onGetStarted,
  title = "Übernehmen Sie die Kontrolle über Ihre",
  subtitle = "Immobilien noch heute",
  description = "Beginnen Sie noch heute, Ihre Immobilien effizienter zu verwalten und profitieren Sie von einer modernen und benutzerfreundlichen Plattform.",
  badgeText = "Bereit zur Vereinfachung?",
  primaryButtonText = "Jetzt loslegen",
  secondaryButtonText = "Preise ansehen",
  secondaryButtonHref = "/preise",
  showSecondaryButton = true,
  className = "",
  theme = "houses",
}: BottomCTAProps) {
  const handleGetStarted = () => {
    trackCTAClicked('bottom_cta', primaryButtonText)
    onGetStarted()
  }

  const handleSecondaryClick = () => {
    trackCTAClicked('bottom_cta', secondaryButtonText)
  }

  const isMailto = secondaryButtonHref.startsWith('mailto:')
  const SecondaryIcon = isMailto ? Mail : ArrowRight

  return (
    <section className={`py-32 px-4 relative overflow-hidden bg-background text-foreground ${className}`}>
      {/* Background Image */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat dark:hidden"
          style={{
            backgroundImage: `url('https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/bottom-cta/${theme === 'city' ? 'city-background' : 'house-stars-daylight'}.avif')`
          }}
        />
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden dark:block"
          style={{
            backgroundImage: `url('https://ocubnwzybybcbrhsnqqs.supabase.co/storage/v1/object/public/pwa-images/product-images/bottom-cta/${theme === 'city' ? 'city-background-night' : 'house-stars'}.avif')`
          }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-linear-to-r from-background/90 via-background/80 to-background/90" />
      </div>

      <div className="max-w-6xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 border border-border backdrop-blur-xs mb-8">
            <Rocket className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">{badgeText}</span>
          </div>
        </motion.div>

        {/* Glassmorphism Container */}
        <div className="bg-white/2 dark:bg-black/5 backdrop-blur-xs border border-white/5 dark:border-white/2 rounded-[3rem] p-12 shadow-2xl relative overflow-hidden before:absolute before:inset-0 before:bg-linear-to-br before:from-white/10 before:to-transparent before:opacity-20 before:rounded-[3rem] after:absolute after:inset-0 after:bg-linear-to-tr after:from-transparent after:via-white/5 after:to-white/10 after:opacity-30 after:rounded-[3rem]">
          <div className="relative z-10">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 pb-4 pt-4 bg-linear-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent leading-tight"
            >
              {title}
              <br />
              <span className="bg-linear-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
                {subtitle}
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
              className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed"
            >
              {description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  className="relative px-12 py-6 text-xl font-semibold group overflow-hidden"
                >
                  <span className="flex items-center">
                    {primaryButtonText}
                    <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>

                {showSecondaryButton && (
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="px-12 py-6 text-xl font-semibold group text-foreground hover:bg-muted hover:text-foreground transition-colors transition-transform transition-shadow duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg"
                  >
                    {isMailto ? (
                      <a href={secondaryButtonHref} onClick={handleSecondaryClick}>
                        <span className="flex items-center">
                          {secondaryButtonText}
                          <SecondaryIcon className="ml-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                        </span>
                      </a>
                    ) : (
                      <Link href={secondaryButtonHref} onClick={handleSecondaryClick}>
                        <span className="flex items-center">
                          {secondaryButtonText}
                          <SecondaryIcon className="ml-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                        </span>
                      </Link>
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
