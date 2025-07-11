"use client"

import { ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface CallToActionProps {
  variant?: 'default' | 'hero' | 'cta'
  onGetStarted: () => void
}

export function CallToAction({ variant = 'default', onGetStarted }: CallToActionProps) {
  const isHero = variant === 'hero'
  const isCta = variant === 'cta'

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
      <Button
        size="lg"
        onClick={onGetStarted}
        className="relative px-12 py-6 text-xl font-semibold group overflow-hidden"
      >
        <span className="flex items-center">
          Jetzt loslegen
          <ArrowRight className={`${isHero ? 'ml-2 w-5 h-5' : 'ml-3 w-6 h-6'} group-hover:translate-x-1 transition-transform`} />
        </span>
      </Button>
      
      <Link href={isCta ? "/modern/documentation" : "#"}>
        <Button
          size={isHero ? 'lg' : 'lg'}
          variant="outline"
          className="px-12 py-6 text-xl font-semibold group text-foreground hover:bg-muted hover:text-foreground transition-colors duration-300"
        >
          <span className="flex items-center">
            {isHero ? (
              <>
                <Zap className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                Mehr erfahren
              </>
            ) : (
              'Demo anfordern'
            )}
          </span>
        </Button>
      </Link>
    </div>
  )
}
