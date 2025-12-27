"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"

interface ResponsiveFilterButtonProps extends React.ComponentProps<typeof Button> {
    /** Short label for mobile view */
    shortLabel: string
    /** Full label for desktop view */
    fullLabel: string
    /** Whether this filter is currently active */
    isActive?: boolean
}

/**
 * A responsive filter button that shows abbreviated text on mobile and full text on desktop.
 * Automatically handles active/inactive styling.
 */
export const ResponsiveFilterButton = React.forwardRef<
    React.ElementRef<typeof Button>,
    ResponsiveFilterButtonProps
>(({ shortLabel, fullLabel, isActive = false, className, ...props }, ref) => {
    return (
        <Button
            ref={ref}
            variant={isActive ? "default" : "ghost"}
            className={`h-9 rounded-full justify-start sm:justify-center ${className || ""}`}
            {...props}
        >
            <span className="sm:hidden">{shortLabel}</span>
            <span className="hidden sm:inline">{fullLabel}</span>
        </Button>
    )
})

ResponsiveFilterButton.displayName = "ResponsiveFilterButton"
