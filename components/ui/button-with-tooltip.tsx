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
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-block cursor-not-allowed">
            {button}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          align="center" 
          className="z-50 bg-white text-black border border-gray-300 shadow-lg rounded-md px-3 py-2"
          sideOffset={5}
        >
          <p className="max-w-xs text-sm font-medium">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})

ButtonWithTooltip.displayName = "ButtonWithTooltip"