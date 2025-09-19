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
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)

  const closeCombobox = React.useCallback(() => {
    setOpen(false)
  }, [])
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
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
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0
          return nextIndex
        })
        break
        
      case 'ArrowUp':
        event.preventDefault()
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
            buttonRef.current?.focus()
          }
        }
        break
        
      case 'Escape':
        event.preventDefault()
        closeCombobox()
        buttonRef.current?.focus()
        break
        
      case 'Home':
        event.preventDefault()
        setHighlightedIndex(0)
        break
        
      case 'End':
        event.preventDefault()
        setHighlightedIndex(filteredOptions.length - 1)
        break
        
      case 'Tab':
        // Allow tab to close dropdown and move focus
        closeCombobox()
        break
    }
  }, [filteredOptions, highlightedIndex, value, onChange])

  // Global dropdown coordination - close other dropdowns when this opens
  React.useEffect(() => {
    if (open) {
      // Dispatch custom event to close other dropdowns
      window.dispatchEvent(new CustomEvent('dropdown-opened', { 
        detail: { source: buttonRef.current } 
      }))
    }
  }, [open])

  // Listen for other dropdowns opening
  React.useEffect(() => {
    const handleOtherDropdownOpened = (event: CustomEvent) => {
      // Close this combobox if another dropdown opened (but not if it's this one)
      if (event.detail.source !== buttonRef.current && open) {
        closeCombobox()
      }
    }

    window.addEventListener('dropdown-opened', handleOtherDropdownOpened as EventListener)
    
    return () => {
      window.removeEventListener('dropdown-opened', handleOtherDropdownOpened as EventListener)
    }
  }, [open, closeCombobox])

  // Reset input and highlighted index when opening/closing
  React.useEffect(() => {
    if (!open) {
      setInputValue("")
      setHighlightedIndex(-1)
      // Reset buttonRect when closing so it gets recaptured fresh next time
      setButtonRect(null)
      
      // Return focus to button when closing (similar to custom dropdown)
      if (buttonRef.current && document.activeElement !== buttonRef.current) {
        buttonRef.current.focus()
      }
    } else {
      // Capture button position only once when opening (not on subsequent renders)
      if (buttonRef.current && !buttonRect) {
        const rect = buttonRef.current.getBoundingClientRect()
        setButtonRect(rect)
      }
      
      // Set initial highlighted index to current selection or first option
      const currentIndex = filteredOptions.findIndex(option => option.value === value)
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0)
      
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

      // Try focusing immediately and again after the next frame to handle race conditions
      focusInput()
      requestAnimationFrame(focusInput)
    }
  }, [open, filteredOptions, value])

  // Reset highlighted index when filtered options change
  React.useEffect(() => {
    if (open && filteredOptions.length > 0) {
      const currentIndex = filteredOptions.findIndex(option => option.value === value)
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0)
    }
  }, [filteredOptions, value, open])

  // Scroll highlighted option into view
  React.useEffect(() => {
    if (open && highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [highlightedIndex, open])

  // Handle keyboard navigation, typing capture, and outside clicks
  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      
      // Close if clicking outside this combobox
      if (!dropdownRef.current?.contains(target as Node) && 
          !buttonRef.current?.contains(target as Node)) {
        
        // Check if clicking on another dropdown trigger or interactive element
        const isClickingOnInteractiveElement = target.closest('[role="button"], [role="combobox"], button, [data-dropdown-trigger]')
        
        closeCombobox()
        
        // If clicking on another interactive element, let it handle the interaction
        if (isClickingOnInteractiveElement) {
          return
        }
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return

      // If the input is focused, let it handle everything except escape
      const isInputFocused = document.activeElement === inputRef.current
      
      if (isInputFocused) {
        // Only handle escape when input is focused
        if (event.key === 'Escape') {
          event.preventDefault()
          closeCombobox()
          buttonRef.current?.focus()
        }
        return
      }
      
      // Check if this is a printable character for typing
      const isPrintableChar = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
      
      // Handle keys when input is not focused
      const navigationKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Home', 'End', 'Tab']
      
      if (navigationKeys.includes(event.key)) {
        handleNavigationKey(event.key, event)
      } else {
        // Handle non-navigation keys
        switch (event.key) {
          case 'Backspace':
          case 'Delete':
            event.preventDefault()
            if (inputRef.current) {
              inputRef.current.focus()
              
              // Handle Cmd+Delete (or Cmd+Backspace) to clear entire input
              if (event.metaKey || event.ctrlKey) {
                setInputValue('')
              } else {
                // Handle single character deletion shortcuts (when input is not focused)
                if (event.key === 'Backspace') {
                  // Backspace shortcut: focus input and remove last character
                  setInputValue(prev => prev.slice(0, -1))
                } else if (event.key === 'Delete') {
                  // Delete shortcut: focus input but preserve value
                  // This allows user to then use native Delete behavior (remove char to right of cursor)
                }
              }
              setHighlightedIndex(0)
            }
            break
            
          default:
            // Handle printable characters for auto-typing
            if (isPrintableChar) {
              event.preventDefault()
              if (inputRef.current) {
                // Focus the input and add the character
                inputRef.current.focus()
                setInputValue(prev => prev + event.key)
                setHighlightedIndex(0)
              }
            }
            break
        }
      }
    }

    // Use capture phase for click outside, but normal phase for keyboard
    document.addEventListener('mousedown', handleClickOutside, true)
    document.addEventListener('keydown', handleKeyDown, false)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('keydown', handleKeyDown, false)
    }
  }, [open, filteredOptions, highlightedIndex, value, onChange, handleNavigationKey])

  // Handle mouse hover to update highlighted index
  const handleOptionMouseEnter = (index: number) => {
    setHighlightedIndex(index)
  }

  const handleButtonClick = (e: React.MouseEvent) => {
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
        tabIndex={disabled ? -1 : 0}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={id ? undefined : (selectedOption ? `Selected: ${selectedOption.label}` : placeholder)}
        className={cn("justify-between", width, !value && "text-muted-foreground")}
        disabled={disabled}
        id={id}
        data-dropdown-trigger
        onClick={handleButtonClick}
        onKeyDown={(e) => {
          // Check if this is a printable character
          const isPrintableChar = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey
          
          // Handle keyboard opening and typing
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!open) {
              setOpen(true)
            }
          } else if (isPrintableChar && !open) {
            // Open dropdown and start typing
            e.preventDefault()
            setOpen(true)
            // Set the initial input value
            setTimeout(() => {
              setInputValue(e.key)
              setHighlightedIndex(0)
            }, 0)
          }
        }}
      >
        {selectedOption ? selectedOption.label : placeholder}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && buttonRect && createPortal(
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="Options"
          className={cn(
            "fixed bg-popover border border-border rounded-2xl shadow-xl p-0 pointer-events-auto backdrop-blur-sm",
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
                role="searchbox"
                aria-label="Search options"
                placeholder={searchPlaceholder}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  // Reset highlighted index when searching
                  setHighlightedIndex(0)
                }}
                onKeyDown={(e) => {
                  // Handle navigation keys using shared helper
                  const navigationKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Home', 'End', 'Tab']
                  
                  if (navigationKeys.includes(e.key)) {
                    handleNavigationKey(e.key, e)
                  }
                  // For all other keys (including text input, Cmd+A, Cmd+C, Cmd+V, Cmd+Delete, etc.)
                  // let the native input handle them and just update our state
                  // Don't prevent default or stop propagation
                }}
                onFocus={handleInputFocus}
                onClick={handleInputClick}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex h-8 w-full rounded-lg bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
                data-dialog-ignore-interaction
              />
            </div>
            
            {/* Custom options list with proper scrolling */}
            <div 
              data-scroll-area=""
              className="max-h-[300px] overflow-y-auto p-2"
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
                <div 
                  className="py-6 text-center text-sm text-muted-foreground"
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
                      "relative flex cursor-default select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      highlightedIndex === index && "bg-accent text-accent-foreground",
                      option.disabled && "pointer-events-none opacity-50"
                    )}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange(option.value === value ? null : option.value)
                        closeCombobox()
                        buttonRef.current?.focus()
                      }
                    }}
                    onMouseEnter={() => handleOptionMouseEnter(index)}
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
