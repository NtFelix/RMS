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
  Ruler,
  CheckCircle,
  Circle,
  FileText,
  MoreHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

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

// Color mapping for different entity types (all using primary color)
const getEntityColor = () => 'text-primary'

// Localized label for entity type (for a compact badge)
const getEntityLabel = (type: SearchResult['type']) => {
  switch (type) {
    case 'tenant':
      return 'Mieter'
    case 'house':
      return 'Haus'
    case 'apartment':
      return 'Wohnung'
    case 'finance':
      return 'Finanzen'
    case 'task':
      return 'Aufgabe'
    default:
      return ''
  }
}

// Format metadata for display based on entity type
const formatMetadata = (result: SearchResult) => {
  const { type, metadata } = result

  switch (type) {
    case 'tenant':
      return (
        <div className="space-y-1">
          {metadata?.email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 text-primary" />
              <a href={`mailto:${metadata.email}`} className="hover:underline truncate">{metadata.email}</a>
            </div>
          )}
          {metadata?.address && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 text-primary" />
              <span className="truncate">{metadata.address}</span>
            </div>
          )}
          {metadata?.phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 text-primary" />
              <a href={`tel:${metadata.phone}`} className="hover:underline truncate">{metadata.phone}</a>
            </div>
          )}
          {metadata?.move_in_date && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 text-primary" />
              <span>Eingezogen: {new Date(metadata.move_in_date).toLocaleDateString('de-DE')}</span>
            </div>
          )}
        </div>
      )

    case 'house':
      return (
        <div className="space-y-2">
          {metadata?.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{metadata.address}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {metadata?.apartment_count && (
              <div className="flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5 text-primary" />
                <span>{metadata.apartment_count} Wohnungen</span>
              </div>
            )}
            {metadata?.free_apartments !== undefined && (
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-primary" />
                <span>{metadata.free_apartments} frei</span>
              </div>
            )}
          </div>
          {metadata?.total_rent && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Euro className="h-3.5 w-3.5 text-primary" />
              <span>Gesamtmiete: {metadata.total_rent}€</span>
            </div>
          )}
        </div>
      )

    case 'apartment':
      return (
        <div className="space-y-1">
          {metadata?.current_tenant && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>{metadata.current_tenant.name}</span>
            </div>
          )}
          {metadata?.house_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="truncate">{metadata.house_name}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {metadata?.size && (
              <div className="flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5 text-primary" />
                <span>{metadata.size}m²</span>
              </div>
            )}
            {metadata?.rent && (
              <div className="flex items-center gap-1.5">
                <Euro className="h-3.5 w-3.5 text-primary" />
                <span>{metadata.rent}€/Monat</span>
              </div>
            )}
          </div>
        </div>
      )

    case 'finance':
      return (
        <div className="space-y-2">
          {metadata?.apartment && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Home className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">{metadata.apartment.name}</span>
              <span className="text-muted-foreground/60">•</span>
              <Building2 className="h-3 w-3 text-muted-foreground/80" />
              <span className="text-muted-foreground/80">{metadata.apartment.house_name}</span>
            </div>
          )}
          <div className="flex items-center gap-4">
            {metadata?.date && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{new Date(metadata.date).toLocaleDateString('de-DE')}</span>
              </div>
            )}
            {metadata?.amount && (
              <div className="flex items-center gap-1.5">
                <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                <span
                  className={cn(
                    'font-semibold',
                    metadata.type === 'income' ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {metadata.type === 'income' ? '+' : '-'}{Math.abs(metadata.amount)}€
                </span>
              </div>
            )}
          </div>
          {metadata?.notes && (
            <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground/90">
              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
              <span className="line-clamp-2">{metadata.notes}</span>
            </div>
          )}
        </div>
      )

    case 'task':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {metadata?.completed !== undefined && (
              <div className="flex items-center gap-1.5">
                {metadata.completed ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/70" />
                )}
                <span className="text-sm font-medium">
                  {metadata.completed ? 'Erledigt' : 'Offen'}
                </span>
              </div>
            )}
            {metadata?.due_date && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Fällig: {new Date(metadata.due_date).toLocaleDateString('de-DE')}</span>
              </div>
            )}
          </div>
          {metadata?.description && (
            <div className="flex items-center gap-2 pt-1 text-sm text-muted-foreground/90">
              <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
              <span className="line-clamp-2">{metadata.description}</span>
            </div>
          )}
        </div>
      )

    default:
      return null
  }
}

export function SearchResultItem({ result, onSelect, onAction }: SearchResultItemProps) {
  const EntityIcon = getEntityIcon(result.type)
  const entityColor = getEntityColor()
  const entityLabel = getEntityLabel(result.type)

  return (
    <CommandItem
      key={result.id}
      onSelect={() => onSelect(result)}
      className="group flex items-center justify-between p-3 rounded-md hover:bg-secondary/25 focus:bg-secondary/25 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-colors"
      tabIndex={0}
    >


      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Entity Icon */}
        <div className="flex-shrink-0 mt-0.5 text-primary">
          <EntityIcon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title with status badge */}
          <div className="font-medium text-sm truncate flex items-center gap-2">
            <span className="truncate">{result.title}</span>
            {result.type === 'tenant' && result.metadata?.status ? (
              <Badge
                variant={result.metadata.status === 'active' ? 'default' : 'secondary'}
                className="text-[10px] px-1.5 py-0 h-5"
              >
                {result.metadata.status === 'active' ? 'Aktiv' : 'Ausgezogen'}
              </Badge>
            ) : result.type === 'apartment' && result.metadata?.status ? (
              <Badge
                variant={result.metadata.status === 'free' ? 'secondary' : 'default'}
                className="text-[10px] px-1.5 py-0 h-5"
              >
                {result.metadata.status === 'free' ? 'Frei' : 'Vermietet'}
              </Badge>
            ) : entityLabel && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-primary border-primary/40">
                {entityLabel}
              </Badge>
            )}
          </div>

          {/* Subtitle - hidden for tenant and house to avoid duplicating information */}
          {result.type !== 'tenant' && result.type !== 'house' && result.subtitle && (
            <div className="text-xs text-muted-foreground truncate">
              {result.subtitle}
            </div>
          )}

          {/* Context */}
          {result.context && (
            <div className="text-xs text-muted-foreground/80 truncate">
              {result.context}
            </div>
          )}

          {/* Enhanced Details */}
          {/* Removed visible ID as it is irrelevant to the user */}

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