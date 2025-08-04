"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ButtonWithTooltipProps extends React.ComponentProps<typeof Button> {
  tooltip?: string
  showTooltip?: boolean
}

export const ButtonWithTooltip = React.forwardRef<
  React.ElementRef<typeof Button>,
  ButtonWithTooltipProps
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">
          <p className="max-w-xs text-sm">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})

ButtonWithTooltip.displayName = "ButtonWithTooltip"