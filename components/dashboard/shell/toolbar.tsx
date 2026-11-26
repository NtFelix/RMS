"use client"

import { forwardRef, useEffect, useRef, useState } from "react"
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ListFilter, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Table toolbar in the PageTopBar (Notion-like): filter, sort and search as compact icon controls, the primary
// action last. All controls are 2rem high pills, matching the bar geometry (see --spacing-shell-bar).

type ToolbarIconButtonProps = {
  icon: React.ElementType
  label: string
  active?: boolean
  badge?: number
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export const ToolbarIconButton = forwardRef<HTMLButtonElement, ToolbarIconButtonProps>(function ToolbarIconButton(
  { icon: Icon, label, active, badge, className, ...rest },
  ref,
) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            ref={ref}
            type="button"
            aria-label={label}
            className={cn(
              "relative flex size-8 shrink-0 items-center justify-center rounded-full transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary/10 text-primary dark:bg-primary/40 dark:text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              className,
            )}
            {...rest}
          >
            <Icon className="size-4" aria-hidden="true" />
            {!!badge && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold tabular-nums text-primary-foreground">
                {badge}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})

/** Search as an icon that expands into a field; stays open while it holds a value. */
export function ToolbarSearch({
  value,
  onChange,
  placeholder = "Suchen…",
  "data-testid": testId,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  "data-testid"?: string
}) {
  const [open, setOpen] = useState(value !== "")
  const inputRef = useRef<HTMLInputElement>(null)
  const expanded = open || value !== ""

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!expanded) {
    return <ToolbarIconButton icon={Search} label="Suchen" onClick={() => setOpen(true)} />
  }

  return (
    <div className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-muted px-3 sm:w-52 sm:flex-none">
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => value === "" && setOpen(false)}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return
          onChange("")
          setOpen(false)
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        data-testid={testId}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
      />
      {value !== "" && (
        <button
          type="button"
          aria-label="Suche leeren"
          className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange("")
            inputRef.current?.focus()
          }}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export type ToolbarFilterGroup = {
  id: string
  label: string
  options: { value: string; label: string; count?: number }[]
  /** Empty = no filter on this group. */
  selected: string[]
  /** Selection of the default view (e.g. only current tenants); the group counts as filtered only when it differs. */
  defaultSelected?: string[]
  /** Single-select groups toggle: choosing the selected option again clears the group. */
  multiple?: boolean
  onChange: (selected: string[]) => void
}

export function ToolbarFilterMenu({ groups, onReset }: { groups: ToolbarFilterGroup[]; onReset?: () => void }) {
  const isFiltered = (g: ToolbarFilterGroup) => {
    const base = g.defaultSelected ?? []
    return g.selected.length !== base.length || g.selected.some((v) => !base.includes(v))
  }
  const activeCount = groups.filter(isFiltered).length

  const toggle = (group: ToolbarFilterGroup, value: string) => {
    const isSelected = group.selected.includes(value)
    if (group.multiple) {
      group.onChange(isSelected ? group.selected.filter((v) => v !== value) : [...group.selected, value])
    } else {
      group.onChange(isSelected ? [] : [value])
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarIconButton icon={ListFilter} label="Filter" active={activeCount > 0} badge={activeCount} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[min(28rem,var(--radix-dropdown-menu-content-available-height))] w-60 overflow-y-auto"
      >
        {groups.map((group, index) => (
          <div key={group.id}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{group.label}</DropdownMenuLabel>
            {group.options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={group.selected.includes(option.value)}
                onCheckedChange={() => toggle(group, option.value)}
                onSelect={(e) => e.preventDefault()}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.count !== undefined && (
                  <span className="ml-2 text-xs tabular-nums text-muted-foreground">{option.count}</span>
                )}
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        ))}
        {onReset && activeCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onReset}>Filter zurücksetzen</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export type SortDirection = "asc" | "desc"

export function ToolbarSortMenu({
  options,
  sortKey,
  direction,
  onChange,
}: {
  options: { value: string; label: string }[]
  sortKey: string
  direction: SortDirection
  onChange: (sortKey: string, direction: SortDirection) => void
}) {
  const current = options.find((o) => o.value === sortKey)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ToolbarIconButton
          icon={direction === "asc" ? ArrowUpNarrowWide : ArrowDownWideNarrow}
          label={current ? `Sortiert nach ${current.label}` : "Sortieren"}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Sortieren nach</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sortKey} onValueChange={(key) => onChange(key, direction)}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={direction} onValueChange={(dir) => onChange(sortKey, dir as SortDirection)}>
          <DropdownMenuRadioItem value="asc">Aufsteigend</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">Absteigend</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Primary action of the page, sized for the bar; the label collapses to the icon below `sm`. */
export const ToolbarPrimaryButton = forwardRef<
  HTMLButtonElement,
  {
    icon?: React.ElementType
    children: React.ReactNode
  } & React.ComponentProps<typeof Button>
>(function ToolbarPrimaryButton({ icon: Icon, children, className, ...rest }, ref) {
  return (
    <Button
      ref={ref}
      className={cn("h-8 shrink-0 gap-1.5 rounded-full px-3.5 text-sm max-sm:w-8 max-sm:px-0", className)}
      {...rest}
    >
      {Icon && <Icon className="size-4" aria-hidden="true" />}
      <span className="max-sm:sr-only">{children}</span>
    </Button>
  )
})
