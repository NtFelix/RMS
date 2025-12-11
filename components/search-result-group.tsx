"use client"

import { SearchResult } from "@/types/search"
import { CommandGroup, CommandSeparator } from "@/components/ui/command"
import { SearchResultItem } from "./search-result-item"
import {
  Users,
  Building2,
  Home,
  Wallet,
  CheckSquare,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchResultGroupProps {
  title: string
  type: SearchResult['type']
  results: SearchResult[]
  onSelect: (result: SearchResult) => void
  onAction?: (result: SearchResult, actionIndex: number) => void
  showSeparator?: boolean
  searchQuery?: string
}

// Icon mapping for group headers
const getGroupIcon = (type: SearchResult['type']) => {
  switch (type) {
    case 'tenant':
      return Users
    case 'house':
      return Building2
    case 'apartment':
      return Home
    case 'finance':
      return Wallet
    case 'task':
      return CheckSquare
    default:
      return Sparkles
  }
}

// Color mapping for group headers
const getGroupColor = (type: SearchResult['type']) => {
  switch (type) {
    case 'tenant': return 'text-blue-500'
    case 'house': return 'text-indigo-500'
    case 'apartment': return 'text-emerald-500'
    case 'finance': return 'text-amber-500'
    case 'task': return 'text-rose-500'
    default: return 'text-primary'
  }
}

// German translations for entity types
const getGroupTitle = (type: SearchResult['type'], count: number) => {
  const titles = {
    tenant: count === 1 ? 'Mieter' : 'Mieter',
    house: count === 1 ? 'Haus' : 'Häuser',
    apartment: count === 1 ? 'Wohnung' : 'Wohnungen',
    finance: count === 1 ? 'Finanzen' : 'Finanzen',
    task: count === 1 ? 'Aufgabe' : 'Aufgaben'
  }

  return titles[type] || 'Ergebnisse'
}

export function SearchResultGroup({
  title,
  type,
  results,
  onSelect,
  onAction,
  showSeparator = false,
  searchQuery = ''
}: SearchResultGroupProps) {
  // Don't render if no results
  if (!results || results.length === 0) {
    return null
  }

  const GroupIcon = getGroupIcon(type)
  const groupColor = getGroupColor(type)
  const groupTitle = title || getGroupTitle(type, results.length)

  return (
    <>
      {showSeparator && <CommandSeparator className="my-2" />}
      <CommandGroup>
        {/* Results */}
        <div className="space-y-1">
          {/* Custom Header within the group flow for better control than CommandGroup heading */}
          <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 select-none">
            {GroupIcon && (
              <GroupIcon className={cn("h-3.5 w-3.5", groupColor)} />
            )}
            <span>{groupTitle}</span>
            <div className="ml-auto flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-muted/50 text-[10px] font-medium text-muted-foreground">
              {results.length}
            </div>
          </div>

          {results.map((result) => (
            <SearchResultItem
              key={result.id}
              result={result}
              onSelect={onSelect}
              onAction={onAction}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      </CommandGroup>
    </>
  )
}