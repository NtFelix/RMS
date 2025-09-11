"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface StableCheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  onClick?: (event: React.MouseEvent) => void
}

/**
 * A stable checkbox implementation that prevents infinite loops
 * by avoiding Radix UI's useComposedRefs and using a simpler approach
 */
export const StableCheckbox = React.memo(React.forwardRef<
  HTMLButtonElement,
  StableCheckboxProps
>(({ checked = false, onCheckedChange, disabled, className, onClick, ...props }, ref) => {
  const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    
    // Call the onClick handler first
    if (onClick) {
      onClick(event)
    }
    
    // Prevent event bubbling
    event.preventDefault()
    event.stopPropagation()
    
    // Toggle the checked state
    const newChecked = !checked
    if (onCheckedChange) {
      onCheckedChange(newChecked)
    }
  }, [checked, disabled, onClick, onCheckedChange])
  
  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        checked && "bg-primary text-primary-foreground",
        className
      )}
      {...props}
    >
      {checked && (
        <div className="flex items-center justify-center text-current">
          <Check className="h-4 w-4" />
        </div>
      )}
    </button>
  )
}))

StableCheckbox.displayName = "StableCheckbox"