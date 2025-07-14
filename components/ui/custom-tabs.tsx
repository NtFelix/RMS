"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CustomTabsProps {
  options: {
    value: string
    label: string
  }[]
  value: string
  onChange: (value: string) => void
  className?: string
}

const CustomTabs = ({ options, value, onChange, className }: CustomTabsProps) => {
  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-between rounded-full bg-gray-100 p-1 dark:bg-gray-800",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative z-10 flex-1 rounded-full px-4 py-2 text-sm font-medium text-gray-700 transition-colors duration-300 dark:text-gray-300",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            {
              "text-white dark:text-gray-900": value === option.value,
            }
          )}
        >
          {option.label}
        </button>
      ))}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1/2 rounded-full bg-blue-500 shadow-md transition-transform duration-300 ease-in-out",
          {
            "translate-x-0": value === options[0].value,
            "translate-x-full": value === options[1].value,
          }
        )}
      />
    </div>
  )
}

export { CustomTabs }
