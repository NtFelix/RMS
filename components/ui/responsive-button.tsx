"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip"
import { ButtonWithHoverCard } from "@/components/ui/button-with-hover-card"

interface ResponsiveButtonProps extends React.ComponentProps<typeof Button> {
    /** Icon to display (e.g., <PlusCircle className="h-4 w-4" />) */
    icon?: React.ReactNode
    /** Short text for mobile view */
    shortText?: string
    /** Full text for desktop view (passed as children) */
    children: React.ReactNode
}

/**
 * A responsive button that shows abbreviated text on mobile and full text on desktop.
 * Icon spacing is automatically handled.
 */
export const ResponsiveButton = React.forwardRef<
    React.ElementRef<typeof Button>,
    ResponsiveButtonProps
>(({ icon, shortText, children, className, ...props }, ref) => {
    return (
        <Button ref={ref} className={`w-full sm:w-auto ${className || ""}`} {...props}>
            {icon && <span className="sm:mr-2">{icon}</span>}
            <span className="hidden sm:inline">{children}</span>
            {shortText && <span className="sm:hidden">{shortText}</span>}
        </Button>
    )
})

ResponsiveButton.displayName = "ResponsiveButton"

interface ResponsiveButtonWithTooltipProps extends React.ComponentProps<typeof ButtonWithTooltip> {
    icon?: React.ReactNode
    shortText?: string
    children: React.ReactNode
}

/**
 * A responsive button with tooltip that shows abbreviated text on mobile and full text on desktop.
 */
export const ResponsiveButtonWithTooltip = React.forwardRef<
    React.ElementRef<typeof ButtonWithTooltip>,
    ResponsiveButtonWithTooltipProps
>(({ icon, shortText, children, className, ...props }, ref) => {
    return (
        <ButtonWithTooltip ref={ref} className={`w-full sm:w-auto ${className || ""}`} {...props}>
            {icon && <span className="sm:mr-2">{icon}</span>}
            <span className="hidden sm:inline">{children}</span>
            {shortText && <span className="sm:hidden">{shortText}</span>}
        </ButtonWithTooltip>
    )
})

ResponsiveButtonWithTooltip.displayName = "ResponsiveButtonWithTooltip"

interface ResponsiveButtonWithHoverCardProps extends React.ComponentProps<typeof ButtonWithHoverCard> {
    icon?: React.ReactNode
    shortText?: string
    children: React.ReactNode
}

/**
 * A responsive button with hover card that shows abbreviated text on mobile and full text on desktop.
 */
export const ResponsiveButtonWithHoverCard = React.forwardRef<
    React.ElementRef<typeof ButtonWithHoverCard>,
    ResponsiveButtonWithHoverCardProps
>(({ icon, shortText, children, className, ...props }, ref) => {
    return (
        <ButtonWithHoverCard ref={ref} className={`w-full sm:w-auto ${className || ""}`} {...props}>
            {icon && <span className="sm:mr-2">{icon}</span>}
            <span className="hidden sm:inline">{children}</span>
            {shortText && <span className="sm:hidden">{shortText}</span>}
        </ButtonWithHoverCard>
    )
})

ResponsiveButtonWithHoverCard.displayName = "ResponsiveButtonWithHoverCard"
