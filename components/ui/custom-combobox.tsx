// components/ui/custom-combobox.tsx
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string;
  label: string;
  disabled?: boolean; // Added to allow disabling specific options
}

interface CustomComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  width?: string; // e.g., "w-[200px]", "w-full"
  disabled?: boolean; // For disabling the entire combobox
  id?: string; // For accessibility - connects with Label htmlFor
}

export function CustomCombobox({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  width = "w-[200px]",
  disabled = false,
  id,
}: CustomComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [buttonRect, setButtonRect] = React.useState<DOMRect | null>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = options.find((option) => option.value === value)

  // Reset input when opening/closing
  React.useEffect(() => {
    if (!open) {
      setInputValue("")
    } else {
      // Get button position when opening
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        setButtonRect(rect)
      }
      
      // AGGRESSIVE focus management - try multiple approaches
      const focusInput = () => {
        if (inputRef.current) {
          // Remove any existing focus
          if (document.activeElement && 'blur' in document.activeElement) {
            (document.activeElement as HTMLElement).blur()
          }
          
          // Force focus
          inputRef.current.focus()
          
          // Set cursor to end
          const len = inputRef.current.value.length
          inputRef.current.setSelectionRange(len, len)
        }
      }

      // Try focusing immediately and again after a short delay to handle race conditions
      focusInput()
      setTimeout(focusInput, 50)
    }
  }, [open])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!dropdownRef.current?.contains(target as Node) && 
          !buttonRef.current?.contains(target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    // Use capture phase to ensure we get the events first
    document.addEventListener('mousedown', handleClickOutside, true)
    document.addEventListener('keydown', handleKeyDown, true)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [open])

  const filteredOptions = options.filter(option => 
    inputValue === "" || 
    option.label.toLowerCase().includes(inputValue.toLowerCase())
  )

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!disabled) {
      setOpen(!open)
    }
  }

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation()
    // Ensure the input stays focused
    if (e.target !== document.activeElement) {
      e.target.focus()
    }
  }

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation()
    e.preventDefault()
    
    // Force focus
    const input = e.currentTarget
    input.focus()
    
    // Set cursor to end
    const len = input.value.length
    input.setSelectionRange(len, len)
  }

  return (
    <>
      <Button
        ref={buttonRef}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn("justify-between", width, !value && "text-muted-foreground")}
        disabled={disabled}
        id={id}
        onClick={handleButtonClick}
        onMouseDown={(e) => e.preventDefault()} // Prevent focus issues
      >
        {selectedOption ? selectedOption.label : placeholder}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && buttonRect && createPortal(
        <div
          ref={dropdownRef}
          className={cn(
            "fixed bg-popover border border-border rounded-md shadow-lg p-0 pointer-events-auto",
            width
          )}
          style={{
            top: buttonRect.bottom + window.scrollY + 4,
            left: buttonRect.left + window.scrollX,
            width: buttonRect.width,
            zIndex: 'var(--z-index-portal-dropdown)',
            pointerEvents: 'auto'
          }}
          onMouseDown={(e) => {
            // Only stop propagation for non-scroll interactions
            const target = e.target as Element
            if (!target.closest('[data-scroll-area]')) {
              e.stopPropagation()
            }
          }}
          onWheel={(e) => {
            // Allow wheel events to pass through for scrolling
            e.stopPropagation()
          }}
        >
          <div className="flex flex-col">
            {/* Custom search input with aggressive focus management */}
            <div className="flex items-center border-b px-3 py-2">
              <input
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={handleInputFocus}
                onClick={handleInputClick}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                style={{ 
                  pointerEvents: 'auto',
                  userSelect: 'text',
                  WebkitUserSelect: 'text'
                }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                tabIndex={0}
              />
            </div>
            
            {/* Custom options list with proper scrolling */}
            <div 
              data-scroll-area=""
              className="max-h-[300px] overflow-y-auto p-1"
              style={{ 
                pointerEvents: 'auto',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent'
              }}
              onWheel={(e) => {
                // Allow wheel events for scrolling and prevent them from closing the dropdown
                e.stopPropagation()
              }}
              onScroll={(e) => {
                // Allow scroll events
                e.stopPropagation()
              }}
              onMouseDown={(e) => {
                // Don't prevent default on the scroll area itself
                e.stopPropagation()
              }}
            >
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      option.disabled && "pointer-events-none opacity-50"
                    )}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange(option.value === value ? null : option.value)
                        setOpen(false)
                      }
                    }}
                    onMouseDown={(e) => {
                      // Only prevent default for selection, not scrolling
                      if (e.button === 0) { // Left click only
                        e.preventDefault()
                      }
                    }}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
