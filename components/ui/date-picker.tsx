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
}

export function DatePicker({ value, onChange, placeholder = "Datum auswählen", className, disabled, id }: DatePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [inputValue, setInputValue] = useState<string>("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Effect to synchronize internal state with external value prop
  useEffect(() => {
    let initialDate: Date | undefined = undefined;
    if (value instanceof Date) {
      initialDate = value;
    } else if (typeof value === 'string') {
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
    setPopoverOpen(false); // Close popover on selection
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
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative w-full", className)}>
          <Input
            id={id}
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            className={cn("pr-10", !selectedDate && "text-muted-foreground")}
            disabled={disabled}
          />
          <Button
            variant={"outline"}
            size="icon"
            className={cn(
              // Mobile-first: larger touch target
              "absolute right-1 top-1/2 min-h-[36px] min-w-[36px] -translate-y-1/2 rounded-md text-muted-foreground hover:text-foreground",
              // Desktop: smaller sizing
              "sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0",
              disabled && "cursor-not-allowed opacity-50"
            )}
            disabled={disabled}
            onClick={(event) => { // Added event parameter
              event.preventDefault(); // Prevent default button behavior
              if (!disabled) {
                const today = new Date();
                setSelectedDate(today);
                setInputValue(format(today, "dd.MM.yyyy", { locale: de }));
                onChange?.(today);
                setPopoverOpen(true); // Open popover after setting date
              }
            }}
            aria-label="Kalender öffnen und heutiges Datum auswählen"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
          locale={de}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}
