"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { de } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

interface DatePickerProps {
  value?: Date | null | string // Allow Date, null, or string (ISO or DD.MM.YYYY)
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
  fromYear?: number
  toYear?: number
  showClearButton?: boolean
  variant?: "input" | "button"
  closeOnSelect?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Datum auswählen",
  className,
  disabled,
  id,
  fromYear = 1900,
  toYear = 2100,
  showClearButton = true,
  variant = "input",
  closeOnSelect = false
}: DatePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [inputValue, setInputValue] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  // Effect to synchronize internal state with external value prop
  useEffect(() => {
    let initialDate: Date | undefined = undefined;
    if (value instanceof Date) {
      initialDate = value;
    } else if (typeof value === 'string' && value.trim() !== '') {
      // Try parsing DD.MM.YYYY first
      try {
        const parsedDate = parse(value, "dd.MM.yyyy", new Date());
        if (!isNaN(parsedDate.getTime())) {
          initialDate = parsedDate;
        } else {
          // Try parsing ISO string
          const isoDate = new Date(value);
          if (!isNaN(isoDate.getTime())) {
            initialDate = isoDate;
          }
        }
      } catch (e) {
        // If parsing fails, try ISO
        const isoDate = new Date(value);
        if (!isNaN(isoDate.getTime())) {
          initialDate = isoDate;
        }
      }
    }

    setSelectedDate(initialDate);
    setInputValue(initialDate ? format(initialDate, "dd.MM.yyyy", { locale: de }) : "");
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setInputValue(date ? format(date, "dd.MM.yyyy", { locale: de }) : "");
    onChange?.(date);
    if (closeOnSelect) {
      setIsOpen(false); // Close popover on selection if closeOnSelect is true
    }
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    setInputValue(rawValue);

    // Try to parse the input value
    try {
      const parsedDate = parse(rawValue, "dd.MM.yyyy", new Date());
      if (!isNaN(parsedDate.getTime()) && rawValue.length >= 8) { // Basic check for valid format length
        // Check if the formatted date matches the input to avoid partial matches like "01.01.2"
        if (format(parsedDate, "dd.MM.yyyy", { locale: de }) === rawValue) {
          setSelectedDate(parsedDate);
          onChange?.(parsedDate);
        } else {
          // If format doesn't match exactly, maybe it's incomplete, clear selection
          setSelectedDate(undefined);
          onChange?.(undefined);
        }
      } else {
        setSelectedDate(undefined);
        onChange?.(undefined);
      }
    } catch (e) {
      setSelectedDate(undefined);
      onChange?.(undefined);
    }
  }

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            {variant === "input" ? (
              <>
                <Input
                  id={id}
                  type="text"
                  placeholder={placeholder}
                  value={inputValue}
                  onChange={handleInputChange}
                  className={cn("pr-10", !selectedDate && "text-muted-foreground")}
                  disabled={disabled}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!disabled) {
                      setIsOpen(true);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full text-muted-foreground hover:text-foreground border-0 bg-muted/50 hover:bg-muted hover:scale-105 transition-all duration-200",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                  disabled={disabled}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!disabled) {
                      setIsOpen(!isOpen);
                    }
                  }}
                  type="button"
                  aria-label="Kalender öffnen"
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(true)}
                type="button"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "dd.MM.yyyy", { locale: de })
                ) : (
                  <span>{placeholder}</span>
                )}
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={disabled}
            locale={de as unknown as Parameters<typeof Calendar>[0]['locale']}
            fromYear={fromYear}
            toYear={toYear}
            initialFocus
          />
          {showClearButton && selectedDate && (
            <div className="p-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  handleSelect(undefined);
                }}
              >
                Datum löschen
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
