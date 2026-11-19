"use client"

import { Lightbulb, type LucideIcon } from "lucide-react"
import { Label } from "@/components/ui/label"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

/** Row label of the tenant dialog: icon and uppercase label with a hover tip on desktop, a plain label on mobile. */
export function PropertyHeader({ icon: Icon, label, infoText, htmlFor }: { icon: LucideIcon, label: string, infoText: string, htmlFor: string }) {
  return (
    <>
      <Label htmlFor={htmlFor} className="block sm:hidden text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <div className="hidden sm:block">
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <Label
              htmlFor={htmlFor}
              className="flex items-center gap-3 text-muted-foreground/70 cursor-help transition-colors hover:text-foreground/90 w-fit group/header focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-[4px]"
            >
              <Icon className="h-4 w-4 group-hover/header:text-primary transition-colors" />
              <span className="text-sm font-medium uppercase tracking-wider cursor-help group-hover/header:text-foreground transition-colors">
                {label}
              </span>
            </Label>
          </HoverCardTrigger>
          <HoverCardContent side="top" align="start" className="w-80 shadow-2xl border-border/40 bg-background/95 backdrop-blur-md rounded-[28px] p-5 overflow-hidden">
            <div className="flex gap-3 items-start">
              <div className="flex-none h-8 w-8 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner border border-amber-500/20">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div className="space-y-1.5 pt-1">
                <h4 className="font-bold text-foreground text-sm uppercase tracking-tight">Tipp</h4>
                <p className="text-sm leading-relaxed text-muted-foreground/90">{infoText}</p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
    </>
  )
}
