"use client"

import { SearchResult } from "@/types/search"
import { CommandGroup, CommandSeparator } from "@/components/ui/command"
import { SearchResultItem } from "./search-result-item"
import {
  Users,
  Building2,
  Home,
  Wallet,
  CheckSquare
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
      return null
  }
}

// Color mapping for group headers (all using primary color for consistency)
const getGroupColor = () => 'text-primary'

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
  const groupColor = getGroupColor()
  const groupTitle = title || getGroupTitle(type, results.length)

  return (
    <>
      {showSeparator && <CommandSeparator />}
      <CommandGroup>

        {/* Group Header */}
        <div className="flex items-center gap-2 px-2 py-2 mb-1 text-sm font-medium text-foreground/80">
          {GroupIcon && (
            <GroupIcon className={cn("h-4 w-4 text-muted-foreground", groupColor)} />
          )}
          <span>{groupTitle}</span>
          <span className="ml-auto text-xs text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded font-mono">
            {results.length}
          </span>
        </div>

        {/* Results */}
        <div className="space-y-0">
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