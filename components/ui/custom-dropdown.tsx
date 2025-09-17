"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

// Minimum space required below trigger before opening dropdown upward
const DROPDOWN_MIN_SPACE_BELOW = 200

interface CustomDropdownProps {
  children: React.ReactNode
  trigger: React.ReactNode
  align?: "start" | "center" | "end"
  className?: string
}

interface CustomDropdownItemProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

interface CustomDropdownLabelProps {
  children: React.ReactNode
  className?: string
}

interface CustomDropdownSeparatorProps {
  className?: string
}

export function CustomDropdown({ children, trigger, align = "end", className }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<"top" | "bottom">("bottom")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  // Focus management effect
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      // Focus first menu item when dropdown opens
      const firstMenuItem = dropdownRef.current.querySelector('[role="menuitem"]:not([aria-disabled="true"])') as HTMLElement
      if (firstMenuItem) {
        firstMenuItem.focus()
      }
    } else if (!isOpen && triggerRef.current) {
      // Return focus to trigger when dropdown closes
      triggerRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        triggerRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleEscape)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  const handleTriggerClick = () => {
    if (!isOpen && triggerRef.current) {
      // Calculate if dropdown should open upward or downward
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - triggerRect.bottom
      const spaceAbove = triggerRect.top
      
      // If there's more space above and not enough space below, open upward
      if (spaceAbove > spaceBelow && spaceBelow < DROPDOWN_MIN_SPACE_BELOW) {
        setPosition("top")
      } else {
        setPosition("bottom")
      }
    }
    setIsOpen(!isOpen)
  }

  const closeDropdown = () => {
    setIsOpen(false)
  }

  const getPositionStyles = () => {
    if (position === "top") {
      return { bottom: "100%", marginBottom: "4px" }
    }
    return { top: "100%", marginTop: "4px" }
  }

  return (
    <div className="relative">
      <div 
        ref={triggerRef} 
        onClick={handleTriggerClick}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTriggerClick();
          }
        }}
      >
        {trigger}
      </div>
      
      {isOpen && (
        <div
          ref={dropdownRef}
          role="menu"
          className={cn(
            "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            align === "end" && "right-0",
            align === "start" && "left-0",
            align === "center" && "left-1/2 -translate-x-1/2",
            className
          )}
          style={getPositionStyles()}
        >
          <CustomDropdownContext.Provider value={{ closeDropdown }}>
            {children}
          </CustomDropdownContext.Provider>
        </div>
      )}
    </div>
  )
}

const CustomDropdownContext = React.createContext<{ closeDropdown: () => void } | null>(null)

export function CustomDropdownItem({ children, onClick, disabled = false, className, ...props }: CustomDropdownItemProps & React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(CustomDropdownContext)
  
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick()
      context?.closeDropdown()
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        disabled
          ? "pointer-events-none opacity-50"
          : "focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer",
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  )
}

export function CustomDropdownLabel({ children, className }: CustomDropdownLabelProps) {
  return (
    <div className={cn("px-2 py-1.5 text-sm font-semibold", className)}>
      {children}
    </div>
  )
}

export function CustomDropdownSeparator({ className }: CustomDropdownSeparatorProps) {
  return <div className={cn("-mx-1 my-1 h-px bg-muted", className)} />
}