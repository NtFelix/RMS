"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { AlertCircle } from "lucide-react"

interface ButtonWithHoverCardProps extends React.ComponentProps<typeof Button> {
  tooltip?: string
  showTooltip?: boolean
}

export const ButtonWithHoverCard = React.forwardRef<
  React.ElementRef<typeof Button>,
  ButtonWithHoverCardProps
>(({ tooltip, showTooltip = false, children, disabled, ...props }, ref) => {
  const button = (
    <Button ref={ref} disabled={disabled} {...props}>
      {children}
    </Button>
  )

  if (!showTooltip || !tooltip || !disabled) {
    return button
  }
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="inline-block cursor-not-allowed">
          {button}
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="center" className="w-80">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{tooltip}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
})

ButtonWithHoverCard.displayName = "ButtonWithHoverCard"