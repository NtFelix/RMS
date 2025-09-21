"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

// Minimum space required below trigger before opening dropdown upward
const DROPDOWN_MIN_SPACE_BELOW = 200

/**
 * CustomDropdown with full keyboard navigation support
 * 
 * Keyboard Navigation:
 * - Enter/Space: Open/close dropdown
 * - Arrow Down/Up: Navigate between menu items (also opens dropdown if closed)
 * - Home: Focus first menu item
 * - End: Focus last menu item
 * - Escape: Close dropdown and return focus to trigger
 * - Tab: Close dropdown and move to next focusable element
 * 
 * Mouse Navigation:
 * - Click trigger to open/close
 * - Click outside to close
 * - Hover over items to focus them
 */

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
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [isKeyboardMode, setIsKeyboardMode] = useState(false)
  const hasInteractedRef = useRef(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuItemsRef = useRef<HTMLDivElement[]>([])

  // Track first user interaction globally to prevent unwanted auto-focus on page load
  useEffect(() => {
    const handleFirstInteraction = () => {
      hasInteractedRef.current = true
      window.removeEventListener("keydown", handleFirstInteraction, true)
      window.removeEventListener("mousedown", handleFirstInteraction, true)
    }

    // Use capture phase to ensure this runs before other listeners
    window.addEventListener("keydown", handleFirstInteraction, true)
    window.addEventListener("mousedown", handleFirstInteraction, true)

    return () => {
      window.removeEventListener("keydown", handleFirstInteraction, true)
      window.removeEventListener("mousedown", handleFirstInteraction, true)
    }
  }, [])

  // Get all focusable menu items
  const getFocusableItems = useCallback(() => {
    if (!dropdownRef.current) return []
    return Array.from(dropdownRef.current.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')) as HTMLDivElement[]
  }, [])

  // Focus management effect
  useEffect(() => {
    if (isOpen) {
      if (isKeyboardMode) {
        // Auto-focus first item if opened via keyboard
        const focusableItems = getFocusableItems()
        if (focusableItems.length > 0) {
          setFocusedIndex(0)
          focusableItems[0].focus()
        }
      } else {
        // For mouse mode, highlight first item but don't focus it
        setFocusedIndex(0)
      }
    } else {
      // Only return focus to trigger when dropdown closes if it was opened via keyboard
      // This prevents unwanted focus on page load
      if (isKeyboardMode && triggerRef.current) {
        triggerRef.current.focus()
      }
      setFocusedIndex(-1)
      setIsKeyboardMode(false)
    }
  }, [isOpen, isKeyboardMode, getFocusableItems])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element
      
      // Close if clicking outside this dropdown
      if (
        dropdownRef.current &&
        triggerRef.current &&
        !dropdownRef.current.contains(target as Node) &&
        !triggerRef.current.contains(target as Node)
      ) {
        // Check if clicking on another dropdown trigger or interactive element
        const isClickingOnInteractiveElement = target.closest('[role="button"], [role="combobox"], button, [data-dropdown-trigger]')
        
        setIsOpen(false)
        
        // If clicking on another interactive element, prevent focus return to avoid conflicts
        if (isClickingOnInteractiveElement) {
          return
        }
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return

      const focusableItems = getFocusableItems()
      
      switch (event.key) {
        case "Escape":
          event.preventDefault()
          setIsOpen(false)
          break
        case "ArrowDown":
          event.preventDefault()
          setIsKeyboardMode(true)
          if (focusableItems.length > 0) {
            const nextIndex = focusedIndex < focusableItems.length - 1 ? focusedIndex + 1 : 0
            setFocusedIndex(nextIndex)
            focusableItems[nextIndex].focus()
          }
          break
        case "ArrowUp":
          event.preventDefault()
          setIsKeyboardMode(true)
          if (focusableItems.length > 0) {
            const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : focusableItems.length - 1
            setFocusedIndex(prevIndex)
            focusableItems[prevIndex].focus()
          }
          break
        case "Home":
          event.preventDefault()
          setIsKeyboardMode(true)
          if (focusableItems.length > 0) {
            setFocusedIndex(0)
            focusableItems[0].focus()
          }
          break
        case "End":
          event.preventDefault()
          setIsKeyboardMode(true)
          if (focusableItems.length > 0) {
            const lastIndex = focusableItems.length - 1
            setFocusedIndex(lastIndex)
            focusableItems[lastIndex].focus()
          }
          break
        case "Tab":
          // Allow tab to close dropdown and move to next element
          setIsOpen(false)
          break
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, focusedIndex, getFocusableItems])

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

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Global dropdown coordination - close other dropdowns when this opens
  useEffect(() => {
    if (isOpen) {
      // Dispatch custom event to close other dropdowns
      window.dispatchEvent(new CustomEvent('dropdown-opened', { 
        detail: { source: triggerRef.current } 
      }))
    }
  }, [isOpen])

  // Listen for other dropdowns opening
  useEffect(() => {
    const handleOtherDropdownOpened = (event: CustomEvent) => {
      // Close this dropdown if another one opened (but not if it's this one)
      if (event.detail.source !== triggerRef.current && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('dropdown-opened', handleOtherDropdownOpened as EventListener)
    
    return () => {
      window.removeEventListener('dropdown-opened', handleOtherDropdownOpened as EventListener)
    }
  }, [isOpen])

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
        data-dropdown-trigger
        onFocus={(e) => {
          // Prevent auto-focus on page load by blurring if user hasn't interacted yet
          if (!hasInteractedRef.current) {
            e.target.blur()
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsKeyboardMode(true);
            handleTriggerClick();
          } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setIsKeyboardMode(true);
            if (!isOpen) {
              handleTriggerClick();
            }
          }
        }}
      >
        {trigger}
      </div>
      
      {isOpen && (
        <div
          ref={dropdownRef}
          role="menu"
          aria-orientation="vertical"
          className={cn(
            "absolute z-50 min-w-[8rem] overflow-hidden rounded-2xl border bg-popover p-2 text-popover-foreground shadow-xl",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            align === "end" && "right-0",
            align === "start" && "left-0",
            align === "center" && "left-1/2 -translate-x-1/2",
            className
          )}
          style={getPositionStyles()}
        >
          <CustomDropdownContext.Provider value={{ closeDropdown, focusedIndex, setFocusedIndex, isKeyboardMode, setIsKeyboardMode }}>
            {children}
          </CustomDropdownContext.Provider>
        </div>
      )}
    </div>
  )
}

const CustomDropdownContext = React.createContext<{ 
  closeDropdown: () => void
  focusedIndex: number
  setFocusedIndex: (index: number) => void
  isKeyboardMode: boolean
  setIsKeyboardMode: (mode: boolean) => void
} | null>(null)

export function CustomDropdownItem({ children, onClick, disabled = false, className, ...props }: CustomDropdownItemProps & React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(CustomDropdownContext)
  const itemRef = useRef<HTMLDivElement>(null)
  const [itemIndex, setItemIndex] = useState(-1)
  
  // Calculate and store item index once when component mounts or parent changes
  useEffect(() => {
    if (itemRef.current) {
      const menuItems = Array.from(itemRef.current.parentElement?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])') || [])
      const index = menuItems.indexOf(itemRef.current)
      setItemIndex(index)
    }
  }, [])

  const isCurrentlyFocused = context ? itemIndex === context.focusedIndex && itemIndex !== -1 : false
  
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

  const handleMouseEnter = () => {
    if (!disabled && itemRef.current && context) {
      // Switch to mouse mode and update focused index
      context.setIsKeyboardMode(false)
      const menuItems = Array.from(itemRef.current.parentElement?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])') || [])
      const index = menuItems.indexOf(itemRef.current)
      if (index !== -1) {
        context.setFocusedIndex(index)
      }
    }
  }

  const handleMouseLeave = () => {
    if (!disabled && context && !context.isKeyboardMode) {
      // Clear focus index when mouse leaves in mouse mode
      context.setFocusedIndex(-1)
    }
  }

  return (
    <div
      ref={itemRef}
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-lg px-2 py-1.5 my-0.5 text-sm outline-none transition-colors",
        disabled
          ? "pointer-events-none opacity-50"
          : [
              // Base interactive styles
              "cursor-pointer",
              // Keyboard focus styles (only when in keyboard mode)
              context?.isKeyboardMode && "focus:bg-accent focus:text-accent-foreground",
              // Mouse hover styles (only when NOT in keyboard mode)
              !context?.isKeyboardMode && "hover:bg-accent hover:text-accent-foreground",
              // Active state for currently focused item
              isCurrentlyFocused && "bg-accent text-accent-foreground"
            ],
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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