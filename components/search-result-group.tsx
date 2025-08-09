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

// Color mapping for group headers
const getGroupColor = (type: SearchResult['type']) => {
  switch (type) {
    case 'tenant':
      return 'text-blue-600'
    case 'house':
      return 'text-green-600'
    case 'apartment':
      return 'text-purple-600'
    case 'finance':
      return 'text-orange-600'
    case 'task':
      return 'text-gray-600'
    default:
      return 'text-gray-500'
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
  showSeparator = false 
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
      {showSeparator && <CommandSeparator />}
      <CommandGroup heading={`${groupTitle} (${results.length})`}>
        {results.map((result) => (
          <SearchResultItem
            key={result.id}
            result={result}
            onSelect={onSelect}
            onAction={onAction}
          />
        ))}
      </CommandGroup>
    </>
  )
}