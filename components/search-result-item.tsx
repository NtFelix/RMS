"use client"

import React from "react"
import { SearchResult } from "@/types/search"
import { CommandItem } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Building2, 
  Home, 
  Wallet, 
  CheckSquare,
  Euro,
  Calendar,
  MapPin,
  Phone,
  Mail,
  User,
  CheckCircle,
  Circle,
  MoreHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// Helper function to highlight search matches
const highlightMatch = (text: string, query: string) => {
  if (!query.trim() || query.length < 2) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
        {part}
      </mark>
    ) : part
  );
};

interface SearchResultItemProps {
  result: SearchResult
  onSelect: (result: SearchResult) => void
  onAction?: (result: SearchResult, actionIndex: number) => void
  searchQuery?: string
}

// Icon mapping for different entity types
const getEntityIcon = (type: SearchResult['type']) => {
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
      return Circle
  }
}

// Color mapping for different entity types
const getEntityColor = (type: SearchResult['type']) => {
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

// Format metadata for display based on entity type
const formatMetadata = (result: SearchResult) => {
  const { type, metadata } = result
  
  switch (type) {
    case 'tenant':
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {metadata?.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span>{metadata.email}</span>
            </div>
          )}
          {metadata?.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>{metadata.phone}</span>
            </div>
          )}
          {metadata?.status && (
            <Badge variant={metadata.status === 'active' ? 'default' : 'secondary'} className="text-xs">
              {metadata.status === 'active' ? 'Aktiv' : 'Ausgezogen'}
            </Badge>
          )}
        </div>
      )
    
    case 'house':
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {metadata?.address && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{metadata.address}</span>
            </div>
          )}
          {metadata?.apartment_count && (
            <span>{metadata.apartment_count} Wohnungen</span>
          )}
          {metadata?.free_apartments !== undefined && (
            <span>{metadata.free_apartments} frei</span>
          )}
        </div>
      )
    
    case 'apartment':
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {metadata?.size && (
            <span>{metadata.size}m²</span>
          )}
          {metadata?.rent && (
            <div className="flex items-center gap-1">
              <Euro className="h-3 w-3" />
              <span>{metadata.rent}€</span>
            </div>
          )}
          {metadata?.status && (
            <Badge variant={metadata.status === 'free' ? 'secondary' : 'default'} className="text-xs">
              {metadata.status === 'free' ? 'Frei' : 'Vermietet'}
            </Badge>
          )}
        </div>
      )
    
    case 'finance':
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {metadata?.amount && (
            <div className="flex items-center gap-1">
              <Euro className="h-3 w-3" />
              <span className={cn(
                metadata.type === 'income' ? 'text-green-600' : 'text-red-600'
              )}>
                {metadata.type === 'income' ? '+' : '-'}{Math.abs(metadata.amount)}€
              </span>
            </div>
          )}
          {metadata?.date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(metadata.date).toLocaleDateString('de-DE')}</span>
            </div>
          )}
        </div>
      )
    
    case 'task':
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {metadata?.completed !== undefined && (
            <div className="flex items-center gap-1">
              {metadata.completed ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span>{metadata.completed ? 'Erledigt' : 'Offen'}</span>
            </div>
          )}
          {metadata?.created_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(metadata.created_date).toLocaleDateString('de-DE')}</span>
            </div>
          )}
        </div>
      )
    
    default:
      return null
  }
}

export function SearchResultItem({ result, onSelect, onAction, searchQuery = '' }: SearchResultItemProps) {
  const EntityIcon = getEntityIcon(result.type)
  const entityColor = getEntityColor(result.type)

  return (
    <CommandItem
      key={result.id}
      onSelect={() => onSelect(result)}
      className="group flex items-center justify-between p-3 hover:bg-accent/50 cursor-pointer"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Entity Icon */}
        <div className={cn("flex-shrink-0 mt-0.5", entityColor)}>
          <EntityIcon className="h-4 w-4" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title */}
          <div className="font-medium text-sm truncate">
            {highlightMatch(result.title, searchQuery)}
          </div>
          
          {/* Subtitle */}
          {result.subtitle && (
            <div className="text-xs text-muted-foreground truncate">
              {highlightMatch(result.subtitle, searchQuery)}
            </div>
          )}
          
          {/* Context */}
          {result.context && (
            <div className="text-xs text-muted-foreground/80 truncate">
              {highlightMatch(result.context, searchQuery)}
            </div>
          )}
          
          {/* Metadata */}
          {formatMetadata(result)}
        </div>
      </div>
      
      {/* Actions */}
      {result.actions && result.actions.length > 0 && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {result.actions.slice(0, 2).map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation()
                onAction?.(result, index)
              }}
            >
              {React.createElement(action.icon, { className: "h-3 w-3" })}
            </Button>
          ))}
          {result.actions.length > 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation()
                // Could open a context menu or dropdown for additional actions
              }}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </CommandItem>
  )
}