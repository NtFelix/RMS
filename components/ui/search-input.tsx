"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { Input, InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SearchInputProps extends InputProps {
  onClear?: () => void
  wrapperClassName?: string
  mode?: "default" | "table" | "modal"
}

const DEFAULT_MODE = "default";

export function SearchInput({
  className,
  wrapperClassName,
  onClear,
  mode = DEFAULT_MODE,
  type = "search",
  sizeVariant,
  ...props
}: SearchInputProps) {

  const modeClasses = {
    default: "",
    table: "w-full sm:w-[300px]",
    modal: "w-full"
  }

  const showClearButton = onClear && (props.value ? String(props.value).length > 0 : false);

  return (
    <div className={cn(
      "relative transition-all duration-200 has-focus-visible:scale-[1.01]",
      modeClasses[mode],
      wrapperClassName
    )}>
      <Input
        type={type}
        sizeVariant={sizeVariant}
        className={cn(
          "pl-10 focus-visible:scale-100 [&::-webkit-search-cancel-button]:hidden",
          showClearButton ? "pr-10" : "",
          className
        )}
        {...props}
      />
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none z-10" />
      {showClearButton && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
        >
          <X className="size-4" />
          <span className="sr-only">Suche löschen</span>
        </button>
      )}
    </div>
  )
}
