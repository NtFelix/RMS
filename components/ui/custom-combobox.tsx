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
  disabled?: boolean;
}

interface CustomComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  width?: string;
  disabled?: boolean;
  id?: string;
  triggerClassName?: string;
}

interface ComboboxState {
  open: boolean;
  inputValue: string;
  highlightedIndex: number;
  isKeyboardNavigation: boolean;
  portalContainer: HTMLElement | null;
}

type ComboboxAction =
  | { type: 'OPEN'; portalContainer: HTMLElement | null; selectedIndex: number }
  | { type: 'CLOSE' }
  | { type: 'SET_INPUT_VALUE'; value: string }
  | { type: 'SET_HIGHLIGHTED_INDEX'; index: number; isKeyboard?: boolean }
  | { type: 'RESET_KEYBOARD_NAV' }

function comboboxReducer(state: ComboboxState, action: ComboboxAction): ComboboxState {
  switch (action.type) {
    case 'OPEN':
      return {
        ...state,
        open: true,
        portalContainer: action.portalContainer,
        highlightedIndex: action.selectedIndex >= 0 ? action.selectedIndex : 0,
        isKeyboardNavigation: false,
      }
    case 'CLOSE':
      return {
        ...state,
        open: false,
        inputValue: "",
        highlightedIndex: -1,
        isKeyboardNavigation: false,
        portalContainer: null,
      }
    case 'SET_INPUT_VALUE':
      return {
        ...state,
        inputValue: action.value,
        highlightedIndex: 0,
        isKeyboardNavigation: true,
      }
    case 'SET_HIGHLIGHTED_INDEX':
      return {
        ...state,
        highlightedIndex: action.index,
        isKeyboardNavigation: action.isKeyboard !== undefined ? action.isKeyboard : state.isKeyboardNavigation,
      }
    case 'RESET_KEYBOARD_NAV':
      return {
        ...state,
        isKeyboardNavigation: false,
      }
    default:
      return state
  }
}

// Subcomponent: Search Input
interface ComboboxSearchInputProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputValue: string;
  searchPlaceholder: string;
  onChange: (value: string) => void;
}

function ComboboxSearchInput({
  inputRef,
  inputValue,
  searchPlaceholder,
  onChange,
}: ComboboxSearchInputProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-popover px-2 mx-1 mt-1">
      <input
        ref={inputRef}
        type="text"
        role="searchbox"
        data-combobox-input=""
        aria-label="Search options"
        placeholder={searchPlaceholder}
        value={inputValue}
        onChange={(e) => {
          e.stopPropagation()
          onChange(e.target.value)
        }}
        className="flex h-9 w-full rounded-md bg-transparent px-2 py-2 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />
    </div>
  )
}

// Subcomponent: Options List
interface ComboboxOptionsListProps {
  filteredOptions: ComboboxOption[];
  value: string | null;
  highlightedIndex: number;
  optionRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  emptyText: string;
  onSelect: (val: string) => void;
  onMouseEnter: (index: number) => void;
  onMouseMove: () => void;
}

function ComboboxOptionsList({
  filteredOptions,
  value,
  highlightedIndex,
  optionRefs,
  emptyText,
  onSelect,
  onMouseEnter,
  onMouseMove,
}: ComboboxOptionsListProps) {
  return (
    <div
      role="listbox"
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
              "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg p-2 text-sm outline-hidden transition-all duration-150 active:scale-[0.98]",
              option.disabled
                ? "pointer-events-none opacity-50"
                : [
                  highlightedIndex === index ? "bg-hover-bg text-foreground" : "text-foreground hover:bg-hover-bg"
                ]
            )}
            onClick={() => {
              if (!option.disabled) {
                onSelect(option.value)
              }
            }}
            onMouseEnter={() => onMouseEnter(index)}
            onMouseMove={onMouseMove}
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
  )
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
  triggerClassName,
}: CustomComboboxProps) {
  const [state, dispatch] = React.useReducer(comboboxReducer, {
    open: false,
    inputValue: "",
    highlightedIndex: -1,
    isKeyboardNavigation: false,
    portalContainer: null,
  })

  const { open, inputValue, highlightedIndex, isKeyboardNavigation, portalContainer } = state

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

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      const dialogContent = buttonRef.current?.closest('[role="dialog"], [data-sheet-content="true"], [data-dialog-content="true"]') as HTMLElement | null
      const selectedIndex = filteredOptions.findIndex(option => option.value === value)
      dispatch({ type: 'OPEN', portalContainer: dialogContent, selectedIndex })
    } else {
      dispatch({ type: 'CLOSE' })
    }
  }, [filteredOptions, value])

  const closeCombobox = React.useCallback(() => {
    handleOpenChange(false)
  }, [handleOpenChange])

  // Shared keyboard navigation logic
  const handleNavigationKey = React.useCallback((key: string, event: KeyboardEvent | React.KeyboardEvent) => {
    switch (key) {
      case 'ArrowDown':
        event.preventDefault()
        dispatch({
          type: 'SET_HIGHLIGHTED_INDEX',
          index: highlightedIndex < filteredOptions.length - 1 ? highlightedIndex + 1 : 0,
          isKeyboard: true
        })
        break

      case 'ArrowUp':
        event.preventDefault()
        dispatch({
          type: 'SET_HIGHLIGHTED_INDEX',
          index: highlightedIndex > 0 ? highlightedIndex - 1 : filteredOptions.length - 1,
          isKeyboard: true
        })
        break

      case 'Enter':
        event.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const opt = filteredOptions[highlightedIndex]
          if (!opt.disabled) {
            onChange(opt.value === value ? null : opt.value)
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
        dispatch({ type: 'SET_HIGHLIGHTED_INDEX', index: 0, isKeyboard: true })
        break

      case 'End':
        event.preventDefault()
        dispatch({ type: 'SET_HIGHLIGHTED_INDEX', index: filteredOptions.length - 1, isKeyboard: true })
        break

      case 'Tab':
        closeCombobox()
        break
    }
  }, [filteredOptions, highlightedIndex, value, onChange, closeCombobox])

  // Ref-based useEffectEvent simulation to avoid global keydown re-subscriptions
  const handleNavigationKeyRef = React.useRef(handleNavigationKey)
  React.useEffect(() => {
    handleNavigationKeyRef.current = handleNavigationKey
  }, [handleNavigationKey])

  // Global keydown listener to support keyboard navigation when open
  React.useEffect(() => {
    if (!open) return

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const navigationKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Home', 'End', 'Tab']
      if (navigationKeys.includes(e.key)) {
        if (
          document.activeElement === inputRef.current ||
          document.activeElement === buttonRef.current ||
          buttonRef.current?.contains(document.activeElement)
        ) {
          if (e.key !== 'Tab') {
            e.preventDefault()
          }
          handleNavigationKeyRef.current(e.key, e)
        }
      } else if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        (document.activeElement === buttonRef.current || (inputRef.current && document.activeElement === inputRef.current && inputRef.current.value === ""))
      ) {
        e.preventDefault()
        if (inputRef.current) {
          inputRef.current.focus()
          dispatch({ type: 'SET_INPUT_VALUE', value: e.key })
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true)
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

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <Button
          ref={buttonRef}
          variant="outline"
          role="combobox"
          tabIndex={disabled ? -1 : 0}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={id ? undefined : (selectedOption ? `Selected: ${selectedOption.label}` : placeholder)}
          className={cn("justify-between px-3 min-h-[40px] h-auto cursor-pointer", width, !value && "text-muted-foreground", triggerClassName)}
          disabled={disabled}
          id={id}
          data-dropdown-trigger
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (!open) {
                handleOpenChange(true)
              }
            }
          }}
        >
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        container={portalContainer}
        className={cn("p-2 border border-border rounded-2xl shadow-2xl backdrop-blur-xs bg-popover z-100", width)}
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          setTimeout(() => {
            inputRef.current?.focus({ preventScroll: true })
          }, 0)
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          buttonRef.current?.focus({ preventScroll: true })
        }}
        data-combobox-dropdown=""
      >
        <div className="flex flex-col gap-2">
          <ComboboxSearchInput
            inputRef={inputRef}
            inputValue={inputValue}
            searchPlaceholder={searchPlaceholder}
            onChange={(val) => dispatch({ type: 'SET_INPUT_VALUE', value: val })}
          />

          <ComboboxOptionsList
            filteredOptions={filteredOptions}
            value={value}
            highlightedIndex={highlightedIndex}
            optionRefs={optionRefs}
            emptyText={emptyText}
            onSelect={(val) => {
              onChange(val === value ? null : val)
              closeCombobox()
            }}
            onMouseEnter={(idx) => {
              if (!isKeyboardNavigation) {
                dispatch({ type: 'SET_HIGHLIGHTED_INDEX', index: idx })
              }
            }}
            onMouseMove={() => {
              if (isKeyboardNavigation) {
                dispatch({ type: 'RESET_KEYBOARD_NAV' })
              }
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
