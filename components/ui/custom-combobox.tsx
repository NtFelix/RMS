// components/ui/custom-combobox.tsx
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const [isKeyboardNavigation, setIsKeyboardNavigation] = React.useState(false)

  const closeCombobox = React.useCallback(() => {
    setOpen(false)
  }, [])
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const optionRefs = React.useRef<(HTMLDivElement | null)[]>([])

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions = React.useMemo(() =>
    options.filter(option =>
      inputValue === "" ||
      option.label.toLowerCase().includes(inputValue.toLowerCase())
    ), [options, inputValue]
  )

  // Shared keyboard navigation logic used by both global handler and input handler
  // This eliminates code duplication and ensures consistent navigation behavior
  const handleNavigationKey = React.useCallback((key: string, event: KeyboardEvent | React.KeyboardEvent) => {
    switch (key) {
      case 'ArrowDown':
        event.preventDefault()
        setIsKeyboardNavigation(true)
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0
          return nextIndex
        })
        break

      case 'ArrowUp':
        event.preventDefault()
        setIsKeyboardNavigation(true)
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1
          return nextIndex
        })
        break

      case 'Enter':
        event.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const selectedOption = filteredOptions[highlightedIndex]
          if (!selectedOption.disabled) {
            onChange(selectedOption.value === value ? null : selectedOption.value)
            closeCombobox()
          }
        }
        break

      case 'Escape':
        event.preventDefault()
        closeCombobox()
        break

      case 'Home':
        event.preventDefault()
        setIsKeyboardNavigation(true)
        setHighlightedIndex(0)
        break

      case 'End':
        event.preventDefault()
        setIsKeyboardNavigation(true)
        setHighlightedIndex(filteredOptions.length - 1)
        break

      case 'Tab':
        // Allow tab to close dropdown and move focus
        closeCombobox()
        break
    }
  }, [filteredOptions, highlightedIndex, value, onChange, closeCombobox])

  // Reset input and highlighted index when opening/closing
  React.useEffect(() => {
    if (!open) {
      setInputValue("")
      setHighlightedIndex(-1)
      setIsKeyboardNavigation(false)
    } else {
      // Set initial highlighted index to current selection or first option
      const currentIndex = filteredOptions.findIndex(option => option.value === value)
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0)
      // Start in mouse mode by default
      setIsKeyboardNavigation(false)

      // Focus the input when opening
      if (inputRef.current) {
        setTimeout(() => {
          if (inputRef.current && open) {
            inputRef.current.focus({ preventScroll: true })
          }
        }, 50)
      }
    }
  }, [open])



  // Scroll highlighted option into view
  React.useEffect(() => {
    if (open && highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [highlightedIndex, open])

  // Handle mouse hover to update highlighted index
  const handleOptionMouseEnter = (index: number) => {
    // Only update highlight on mouse hover if we're not in keyboard navigation mode
    if (!isKeyboardNavigation) {
      setHighlightedIndex(index)
    }
  }

  // Reset keyboard navigation mode when mouse moves
  const handleOptionMouseMove = () => {
    if (isKeyboardNavigation) {
      setIsKeyboardNavigation(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={buttonRef}
          variant="outline"
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={id ? undefined : (selectedOption ? `Selected: ${selectedOption.label}` : placeholder)}
          className={cn("justify-between px-3 min-h-[40px] h-auto", width, !value && "text-muted-foreground")}
          disabled={disabled}
          id={id}
          data-dropdown-trigger
        >
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-2 border border-border rounded-2xl shadow-2xl backdrop-blur-sm bg-popover", width)}
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-2">
          {/* Custom search input with aggressive focus management */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-popover px-2 mx-1 mt-1">
            <input
              ref={inputRef}
              type="text"
              role="searchbox"
              aria-label="Search options"
              placeholder={searchPlaceholder}
              value={inputValue}
              onChange={(e) => {
                e.stopPropagation()
                setInputValue(e.target.value)
                // Reset highlighted index when searching and enable keyboard navigation
                setIsKeyboardNavigation(true)
                setHighlightedIndex(0)
              }}
              onKeyDown={(e) => {
                // Handle navigation keys using shared helper
                const navigationKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Home', 'End', 'Tab']

                if (navigationKeys.includes(e.key)) {
                  // Stop propagation to prevent the global handler from also processing this event
                  e.stopPropagation()
                  handleNavigationKey(e.key, e)
                }
                // For all other keys, let the browser handle them naturally
              }}
              className="flex h-9 w-full rounded-md bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>

          {/* Custom options list with proper scrolling */}
          <div
            className="flex max-h-[300px] flex-col gap-1 overflow-y-auto p-1 custom-scrollbar"
            style={{ overscrollBehavior: 'contain' }}
          >
            {filteredOptions.length === 0 ? (
              <div
                className="rounded-lg px-4 py-6 text-center text-sm text-muted-foreground font-medium"
                role="option"
                aria-disabled="true"
              >
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  ref={(el) => {
                    optionRefs.current[index] = el
                  }}
                  role="option"
                  aria-selected={value === option.value}
                  aria-disabled={option.disabled}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg p-2 text-sm outline-none transition-all duration-150 active:scale-[0.98]",
                    option.disabled
                      ? "pointer-events-none opacity-50"
                      : [
                        highlightedIndex === index ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      ]
                  )}
                  onClick={() => {
                    if (!option.disabled) {
                      onChange(option.value === value ? null : option.value)
                      closeCombobox()
                    }
                  }}
                  onMouseEnter={() => handleOptionMouseEnter(index)}
                  onMouseMove={handleOptionMouseMove}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 transition-all duration-200",
                      value === option.value ? "opacity-100 scale-100" : "opacity-0 scale-50"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
