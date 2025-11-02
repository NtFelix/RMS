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
  const [isKeyboardNavigation, setIsKeyboardNavigation] = React.useState(false)

  const closeCombobox = React.useCallback(() => {
    setOpen(false)
    // Clean up active flag when closing
    if (inputRef.current) {
      inputRef.current.removeAttribute('data-combobox-active')
    }
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
      setIsKeyboardNavigation(false)
      // Reset buttonRect when closing so it gets recaptured fresh next time
      setButtonRect(null)
      
      // Only return focus to button when closing if no other element should have focus
      if (buttonRef.current && document.activeElement === inputRef.current) {
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
      // Start in mouse mode by default
      setIsKeyboardNavigation(false)
      
      // Focus the input when opening - simplified
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

  // Handle keyboard navigation and outside clicks
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

      // Only handle keyboard events if the combobox button is focused
      const isComboboxFocused = document.activeElement === buttonRef.current
      const isInputFocused = document.activeElement === inputRef.current
      
      if (!isComboboxFocused && !isInputFocused) {
        // If neither the button nor input is focused, don't interfere with typing
        return
      }

      // If the input is focused, don't handle navigation here - let the input's onKeyDown handle it
      if (isInputFocused) {
        return
      }
      
      // Handle keys when combobox button is focused
      const navigationKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Home', 'End', 'Tab']
      
      if (navigationKeys.includes(event.key)) {
        handleNavigationKey(event.key, event)
      } else {
        // Handle typing only when the combobox button is focused
        const isPrintableChar = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
        if (isPrintableChar) {
          event.preventDefault()
          if (inputRef.current) {
            // Focus the input and add the character
            inputRef.current.focus()
            setInputValue(event.key)
            setHighlightedIndex(0)
          }
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

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent any form validation from being triggered
    const form = e.currentTarget.closest('form')
    if (form) {
      // Temporarily disable form validation
      const originalNoValidate = form.noValidate
      form.noValidate = true
      
      // Restore original validation state after a delay
      setTimeout(() => {
        form.noValidate = originalNoValidate
      }, 100)
    }
    
    if (!disabled) {
      setOpen(!open)
    }
  }

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation()
    
    // Mark this input as actively focused
    e.target.setAttribute('data-combobox-active', 'true')
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const relatedTarget = e.relatedTarget as Element
    
    // Always clean up the active flag when blurring
    e.target.removeAttribute('data-combobox-active')
    
    // Allow blur to combobox options, buttons, or other valid form elements
    if (relatedTarget && (
      relatedTarget.closest('[role="option"]') ||
      relatedTarget.closest('[data-dropdown-trigger]') ||
      relatedTarget === buttonRef.current ||
      relatedTarget.closest('button') ||
      relatedTarget.tagName === 'BUTTON'
    )) {
      return
    }
    
    // If focus is moving to another input in the same form, allow it
    if (relatedTarget && (
      relatedTarget.tagName === 'INPUT' ||
      relatedTarget.tagName === 'SELECT' ||
      relatedTarget.tagName === 'TEXTAREA'
    )) {
      return
    }
    
    // For clicking outside the combobox, close it
    if (open && !relatedTarget) {
      // Small delay to allow option clicks to register
      setTimeout(() => {
        if (open) {
          closeCombobox()
        }
      }, 150)
    }
  }

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation()
    
    // Prevent any form validation from being triggered
    const form = e.currentTarget.closest('form')
    if (form) {
      // Temporarily disable form validation
      const originalNoValidate = form.noValidate
      form.noValidate = true
      
      // Restore original validation state after a delay
      setTimeout(() => {
        form.noValidate = originalNoValidate
      }, 100)
    }
    
    // Mark as active and ensure focus
    const input = e.currentTarget
    input.setAttribute('data-combobox-active', 'true')
    
    // Simple focus without preventing default (allow normal input behavior)
    if (document.activeElement !== input) {
      input.focus({ preventScroll: true })
    }
    
    // Don't set cursor position - let the browser handle it naturally
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
          // Handle keyboard opening - only for specific navigation keys, not typing
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!open) {
              setOpen(true)
            }
          }
          // Remove automatic opening on typing - user must click to open
        }}
      >
        {selectedOption ? selectedOption.label : placeholder}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && buttonRect && (() => {
        const isInModal = buttonRef.current?.closest('[role="dialog"]')
        const portalTarget = isInModal ? isInModal : document.body
        
        // Calculate position based on portal target
        let top, left
        if (isInModal) {
          // When portaling to modal, calculate position relative to modal
          const modalRect = isInModal.getBoundingClientRect()
          top = buttonRect.bottom - modalRect.top + 4
          left = buttonRect.left - modalRect.left
        } else {
          // When portaling to body, use viewport coordinates
          top = buttonRect.bottom + window.scrollY + 4
          left = buttonRect.left + window.scrollX
        }
        
        return createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            aria-label="Options"
            className={cn(
              isInModal ? "absolute" : "fixed",
              "bg-popover border border-border rounded-2xl shadow-xl p-2 pointer-events-auto backdrop-blur-sm",
              width
            )}
            style={{
              top,
              left,
              width: buttonRect.width,
              zIndex: isInModal ? 9999 : 'var(--z-index-portal-dropdown)',
              pointerEvents: 'auto'
            }}
            data-dialog-ignore-interaction
            data-combobox-dropdown
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
          <div className="flex flex-col gap-2">
            {/* Custom search input with aggressive focus management */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-popover px-2">
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
                onFocus={(e) => {
                  e.stopPropagation()
                  e.target.setAttribute('data-combobox-active', 'true')
                }}
                onBlur={(e) => {
                  e.target.removeAttribute('data-combobox-active')
                }}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                className="flex h-9 w-full rounded-md bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-dialog-ignore-interaction
                data-combobox-input
              />
            </div>
            
            {/* Custom options list with proper scrolling */}
            <div 
              data-scroll-area=""
              className="flex max-h-[300px] flex-col gap-2 overflow-y-auto"
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
                  className="rounded-lg px-4 py-6 text-center text-sm text-muted-foreground"
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
                      "relative flex w-full cursor-default select-none items-center gap-2 rounded-lg p-2 text-sm outline-none transition-all duration-150",
                      option.disabled
                        ? "pointer-events-none opacity-50"
                        : [
                            // Base interactive styles
                            "cursor-pointer",
                            // Keyboard navigation highlight (takes priority)
                            isKeyboardNavigation && highlightedIndex === index && "bg-accent text-accent-foreground",
                            // Mouse hover styles (only when not in keyboard navigation mode)
                            !isKeyboardNavigation && "hover:bg-accent hover:text-accent-foreground",
                            // Mouse hover highlight (when not in keyboard mode)
                            !isKeyboardNavigation && highlightedIndex === index && "bg-accent text-accent-foreground"
                          ]
                    )}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange(option.value === value ? null : option.value)
                        closeCombobox()
                        buttonRef.current?.focus()
                      }
                    }}
                    onMouseEnter={() => handleOptionMouseEnter(index)}
                    onMouseMove={handleOptionMouseMove}
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
          portalTarget
        )
      })()}
    </>
  )
}
