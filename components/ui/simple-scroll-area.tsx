"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SimpleScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const SimpleScrollArea = React.forwardRef<HTMLDivElement, SimpleScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("overflow-y-auto overflow-x-hidden", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

SimpleScrollArea.displayName = "SimpleScrollArea"