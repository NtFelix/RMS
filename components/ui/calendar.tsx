"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type MonthCaptionProps, useDayPicker } from "react-day-picker"
import { getYear, getMonth, setYear, setMonth, addMonths, subMonths } from "date-fns"
import { de } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants, Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  // Custom props for our calendar implementation
  fromYear?: number
  toYear?: number
}

// Custom MonthCaption component with navigation arrows and dropdowns
function CustomMonthCaption({
  calendarMonth,
  fromYear,
  toYear
}: MonthCaptionProps & { fromYear: number; toYear: number }) {
  const { goToMonth } = useDayPicker();
  const displayMonth = calendarMonth.date;
  const currentYear = getYear(displayMonth);
  const currentMonth = getMonth(displayMonth);
  const startYear = fromYear;
  const endYear = toYear;

  const handleMonthChange = (value: string) => {
    const newMonthIndex = parseInt(value, 10);
    const newDate = setMonth(displayMonth, newMonthIndex);
    goToMonth(newDate);
  };

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value, 10);
    const newDate = setYear(displayMonth, newYear);
    goToMonth(newDate);
  };

  const handlePreviousMonth = () => {
    const previousMonth = subMonths(displayMonth, 1);
    goToMonth(previousMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(displayMonth, 1);
    goToMonth(nextMonth);
  };

  // Check if we can navigate to previous/next month based on year constraints
  const canGoPrevious = React.useCallback(() => {
    const prevMonth = subMonths(displayMonth, 1);
    return getYear(prevMonth) >= startYear;
  }, [displayMonth, startYear]);

  const canGoNext = React.useCallback(() => {
    const nextMonth = addMonths(displayMonth, 1);
    return getYear(nextMonth) <= endYear;
  }, [displayMonth, endYear]);

  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: (de.localize?.month(i, { width: 'abbreviated' }) ?? `Monat ${i + 1}`).slice(0, 3)
  }));

  return (
    <div className="flex items-center justify-between relative w-full">
      {/* Left arrow button */}
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 disabled:opacity-25 flex-shrink-0"
        onClick={handlePreviousMonth}
        disabled={!canGoPrevious()}
        type="button"
        aria-label="Vorheriger Monat"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Center dropdowns - dynamically sized */}
      <div className="flex items-center gap-2 flex-1 justify-center px-2 min-w-0">
        <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className="h-7 flex-1 min-w-[50px] max-w-[80px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={currentYear.toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="h-7 flex-1 min-w-[50px] max-w-[80px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right arrow button */}
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 disabled:opacity-25 flex-shrink-0"
        onClick={handleNextMonth}
        disabled={!canGoNext()}
        type="button"
        aria-label="Nächster Monat"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromYear = new Date().getFullYear() - 100, // Default fromYear
  toYear = 2100, // Default toYear
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4 w-full",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium hidden",
        nav: "hidden",
        button_previous: "hidden",
        button_next: "hidden",
        month_grid: "w-full border-collapse",
        weekdays: "flex justify-between w-full",
        weekday: "text-muted-foreground w-9 font-normal text-[0.8rem] text-center",
        week: "flex justify-between w-full mt-1",
        day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full hover:bg-accent hover:text-accent-foreground"
        ),
        range_end: "range_end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
        today: "bg-red-500 text-white rounded-full hover:bg-red-600",
        outside:
          "text-muted-foreground/50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeft className="h-4 w-4" />;
          }
          return <ChevronRight className="h-4 w-4" />;
        },
        MonthCaption: (captionProps) => (
          <CustomMonthCaption {...captionProps} fromYear={fromYear} toYear={toYear} />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
