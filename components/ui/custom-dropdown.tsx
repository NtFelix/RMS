"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

// Minimum space required below trigger before opening dropdown upward
const DROPDOWN_MIN_SPACE_BELOW = 200

interface CustomDropdownProps {
  children: React.ReactNode
  trigger: React.ReactNode
  align?: "start" | "center" | "end"
  className?: string
}

interface CustomDropdownItemProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

interface CustomDropdownLabelProps {
  children: React.ReactNode
  className?: string
}

interface CustomDropdownSeparatorProps {
  className?: string
}

const CustomDropdownContext = React.createContext<{
  closeDropdown: () => void
  focusedIndex: number
  setFocusedIndex: (index: number) => void
  isKeyboardMode: boolean
  setIsKeyboardMode: (mode: boolean) => void
} | null>(null)

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function CustomDropdown({ children, trigger, align = "end", className }: CustomDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className="cursor-pointer"
          data-dropdown-trigger
        >
          {trigger}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn("w-auto min-w-[200px] rounded-2xl border bg-popover p-2 shadow-xl backdrop-blur-sm", className)}
        sideOffset={8}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CustomDropdownItem({ children, onClick, disabled = false, className, ...props }: CustomDropdownItemProps & Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'>) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      onSelect={() => {
        if (onClick) {
          onClick()
        }
      }}
      className={cn(
        "rounded-lg px-3 py-2 text-sm transition-all duration-150 active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuItem>
  )
}


export function CustomDropdownLabel({ children, className }: CustomDropdownLabelProps) {
  return (
    <DropdownMenuLabel className={cn("px-3 py-2 text-sm font-semibold", className)}>
      {children}
    </DropdownMenuLabel>
  )
}

export function CustomDropdownSeparator({ className }: CustomDropdownSeparatorProps) {
  return <DropdownMenuSeparator className={cn("-mx-1 my-1 h-px bg-muted", className)} />
}