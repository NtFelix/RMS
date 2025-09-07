"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DropdownProps, CaptionProps, useNavigation } from "react-day-picker" // Import useNavigation
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getYear, getMonth, setYear, setMonth } from "date-fns"
import { de } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  captionLayout?: "buttons" | "dropdown" // Keep this prop for potential future use or compatibility, but custom Caption handles dropdown logic
  fromYear?: number
  toYear?: number
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "buttons", // Default to buttons
  fromYear = new Date().getFullYear() - 100, // Default fromYear
  toYear = new Date().getFullYear(), // Default toYear
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      // Remove captionLayout, fromYear, toYear from DayPicker props as they are handled in the custom Caption
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        // Remove default caption styling as custom Caption will handle layout
        // caption: cn("flex justify-center pt-1 relative items-center", {
        //   "space-x-2": captionLayout === 'dropdown',
        // }),
        // caption_label: cn("text-sm font-medium", {
        //   "hidden": captionLayout === 'dropdown',
        // }),
        // caption_dropdowns: "flex space-x-2",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "min-h-[44px] min-w-[44px] bg-transparent p-0 opacity-50 hover:opacity-100 sm:h-7 sm:w-7 sm:min-h-0 sm:min-w-0"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md font-normal text-[0.8rem] min-w-[44px] min-h-[32px] flex items-center justify-center sm:w-9 sm:min-w-0 sm:min-h-0",
        row: "flex w-full mt-2",
        cell: "text-center text-sm p-0 relative min-w-[44px] min-h-[44px] flex items-center justify-center sm:h-9 sm:w-9 sm:min-w-0 sm:min-h-0 [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "min-h-[44px] min-w-[44px] p-0 font-normal aria-selected:opacity-100 sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        // Provide a custom Caption component
        Caption: ({ displayMonth }: CaptionProps) => {
          const { goToMonth } = useNavigation(); // Use useNavigation hook
          const currentYear = getYear(displayMonth);
          const currentMonth = getMonth(displayMonth);
          // Use fromYear and toYear from the outer Calendar component props
          const startYear = fromYear;
          const endYear = toYear;

          const handleMonthChange = (newMonthIndex: string) => {
            const newDate = setMonth(displayMonth, parseInt(newMonthIndex, 10));
            goToMonth(newDate); // Use goToMonth from useNavigation
          };

          const handleYearChange = (newYear: string) => {
            const newDate = setYear(displayMonth, parseInt(newYear, 10));
            goToMonth(newDate); // Use goToMonth from useNavigation
          };

          const years = [];
          for (let i = startYear; i <= endYear; i++) {
            years.push(i);
          }

          const months = Array.from({ length: 12 }, (_, i) => ({
            value: i,
            label: de.localize?.month(i, { width: 'wide' }) ?? i + 1
          }));

          return (
            <div className="flex justify-center pt-1 relative items-center space-x-2">
              <Select
                value={currentMonth.toString()}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="h-7 w-[100px] px-2 py-1 text-xs">
                  <SelectValue placeholder="Monat" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={currentYear.toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="h-7 w-[70px] px-2 py-1 text-xs">
                  <SelectValue placeholder="Jahr" />
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
          );
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
