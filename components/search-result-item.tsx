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
  MoreHorizontal,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface SearchResultItemProps {
  result: SearchResult
  onSelect: (result: SearchResult) => void
  onAction?: (result: SearchResult, actionIndex: number) => void
  searchQuery?: string
}

// Entity Theme Configuration
const getEntityTheme = (type: SearchResult['type']) => {
  switch (type) {
    case 'tenant':
      return {
        bg: 'bg-blue-100 dark:bg-blue-500/20',
        text: 'text-blue-600 dark:text-blue-400',
        icon: Users
      }
    case 'house':
      return {
        bg: 'bg-indigo-100 dark:bg-indigo-500/20',
        text: 'text-indigo-600 dark:text-indigo-400',
        icon: Building2
      }
    case 'apartment':
      return {
        bg: 'bg-emerald-100 dark:bg-emerald-500/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        icon: Home
      }
    case 'finance':
      return {
        bg: 'bg-amber-100 dark:bg-amber-500/20',
        text: 'text-amber-600 dark:text-amber-400',
        icon: Wallet
      }
    case 'task':
      return {
        bg: 'bg-rose-100 dark:bg-rose-500/20',
        text: 'text-rose-600 dark:text-rose-400',
        icon: CheckSquare
      }
    default:
      return {
        bg: 'bg-muted',
        text: 'text-muted-foreground',
        icon: Circle
      }
  }
}

// Localized label for entity type
const getEntityLabel = (type: SearchResult['type']) => {
  switch (type) {
    case 'tenant': return 'Mieter'
    case 'house': return 'Haus'
    case 'apartment': return 'Wohnung'
    case 'finance': return 'Finanzen'
    case 'task': return 'Aufgabe'
    default: return ''
  }
}

// Render formatted metadata in a grid/list style
const renderMetadata = (result: SearchResult) => {
  const { type, metadata } = result

  switch (type) {
    case 'tenant':
      return (
        <>
          {metadata?.email && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Mail className="!h-3 !w-3 opacity-70 group-data-[selected=true]:opacity-100 transition-opacity" />
              <span className="truncate">{metadata.email}</span>
            </div>
          )}
          {metadata?.phone && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Phone className="!h-3 !w-3 opacity-70 group-data-[selected=true]:opacity-100 transition-opacity" />
              <span className="truncate">{metadata.phone}</span>
            </div>
          )}
          {metadata?.address && (
            <div className="flex items-center gap-1.5 min-w-0 col-span-2">
              <MapPin className="!h-3 !w-3 opacity-70 group-data-[selected=true]:opacity-100 transition-opacity" />
              <span className="truncate">{metadata.address}</span>
            </div>
          )}
        </>
      )

    case 'house':
      return (
        <>
          <div className="flex items-center gap-1.5 min-w-0">
            <Home className="!h-3 !w-3 opacity-70 group-data-[selected=true]:opacity-100 transition-opacity" />
            <span>{metadata?.apartment_count || 0} Wohnungen</span>
          </div>
          {metadata?.total_rent && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Euro className="!h-3 !w-3 opacity-70 group-data-[selected=true]:opacity-100 transition-opacity" />
              <span>{metadata.total_rent} / Monat</span>
            </div>
          )}
          {metadata?.address && (
            <div className="flex items-center gap-1.5 min-w-0 col-span-2">
              <MapPin className="!h-3 !w-3 opacity-70 group-data-[selected=true]:opacity-100 transition-opacity" />
              <span className="truncate">{metadata.address}</span>
            </div>
          )}
        </>
      )

    case 'apartment':
      return (
        <>
          {metadata?.house_name && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="!h-3 !w-3 opacity-70 group-data-[selected=true]:opacity-100 transition-opacity" />
              <span className="truncate">{metadata.house_name}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            {metadata?.size && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Ruler className="!h-3 !w-3 opacity-70 group-data-[selected=true]:opacity-100 transition-opacity" />
                <span>{metadata.size}m²</span>
              </div>
            )}
            {metadata?.rent && (
              <div className="flex items-center gap-1.5 min-w-0">
                <Euro className="!h-3 !w-3 opacity-70 group-data-[selected=true]:opacity-100 transition-opacity" />
                <span>{metadata.rent}</span>
              </div>
            )}
          </div>
          {metadata?.current_tenant && (
            <div className="flex items-center gap-1.5 min-w-0 col-span-2 text-primary/80">
              <Users className="!h-3 !w-3" />
              <span className="truncate font-medium">{metadata.current_tenant.name}</span>
            </div>
          )}
        </>
      )

    case 'finance':
      return (
        <>
          <div className="flex items-center gap-1.5 min-w-0">
            {metadata?.type === 'income' ? (
              <TrendingUp className="!h-3 !w-3 text-emerald-500" />
            ) : (
              <TrendingDown className="!h-3 !w-3 text-rose-500" />
            )}
            <span className={cn("font-medium", metadata?.type === 'income' ? "text-emerald-600" : "text-rose-600")}>
              {metadata?.amount !== undefined ? `${metadata.type === 'income' ? '+' : '-'}${Math.abs(metadata.amount)}€` : '-'}
            </span>
          </div>
          {metadata?.date && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Calendar className="!h-3 !w-3 opacity-70 group-data-[selected=true]:opacity-100 transition-opacity" />
              <span>{new Date(metadata.date).toLocaleDateString('de-DE')}</span>
            </div>
          )}
          {metadata?.apartment && (
            <div className="flex items-center gap-1.5 min-w-0 col-span-2">
              <Home className="!h-3 !w-3 opacity-70 group-data-[selected=true]:opacity-100 transition-opacity" />
              <span className="truncate">{metadata.apartment.name}</span>
              <span className="text-muted-foreground/40 mx-0.5">•</span>
              <span className="truncate opacity-70 group-data-[selected=true]:opacity-100 transition-opacity">{metadata.apartment.house_name}</span>
            </div>
          )}
        </>
      )

    case 'task':
      return (
        <>
          <div className="flex items-center gap-1.5 min-w-0">
            {metadata?.due_date ? (
              <>
                <Calendar className="!h-3 !w-3 opacity-70 group-data-[selected=true]:opacity-100 transition-opacity" />
                <span>{new Date(metadata.due_date).toLocaleDateString('de-DE')}</span>
              </>
            ) : (
              <span className="text-muted-foreground/60">Kein Datum</span>
            )}
          </div>
          {metadata?.description && (
            <div className="flex items-center gap-1.5 min-w-0 col-span-2">
              <FileText className="!h-3 !w-3 opacity-70 group-data-[selected=true]:opacity-100 transition-opacity" />
              <span className="truncate">{metadata.description}</span>
            </div>
          )}
        </>
      )

    default:
      return null
  }
}

export function SearchResultItem({ result, onSelect, onAction }: SearchResultItemProps) {
  const theme = getEntityTheme(result.type)

  const Icon = theme.icon

  return (
    <CommandItem
      key={result.id}
      onSelect={() => onSelect(result)}
      className="group flex items-center justify-between p-2 rounded-xl hover:bg-primary data-[selected=true]:bg-primary hover:text-primary-foreground data-[selected=true]:text-primary-foreground cursor-pointer transition-all duration-200 ease-in-out hover:scale-[1.01] active:scale-[0.98] border border-transparent hover:border-primary data-[selected=true]:border-primary my-1 opacity-100"
      tabIndex={0}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">

        {/* Icon Container */}
        <div className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm border border-transparent",
          theme.bg,
          theme.text,
          "group-data-[selected=true]:shadow-md transition-shadow duration-200"
        )}>
          <Icon className="!h-6 !w-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 py-0.5">
          {/* Header Row */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate text-foreground">
              {result.title}
            </span>

            {/* Context/Subtitle placed nicely next to title if short, or below */}
            {result.subtitle && result.type !== 'tenant' && result.type !== 'house' && (
              <span className="text-xs text-muted-foreground group-data-[selected=true]:text-primary-foreground/80 group-hover:text-primary-foreground/80 transition-colors truncate hidden sm:inline-block">
                • {result.subtitle}
              </span>
            )}

            {/* Status Badges */}
            {result.type === 'tenant' && result.metadata?.status && (
              <Badge variant={result.metadata.status === 'active' ? 'outline' : 'secondary'} className={cn("text-[10px] h-5 px-1.5 font-normal", result.metadata.status === 'active' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20")}>
                {result.metadata.status === 'active' ? 'Aktiv' : 'Ausgezogen'}
              </Badge>
            )}
            {result.type === 'apartment' && result.metadata?.status && (
              <Badge variant={result.metadata.status === 'free' ? 'secondary' : 'outline'} className={cn("text-[10px] h-5 px-1.5 font-normal", result.metadata.status === 'free' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20")}>
                {result.metadata.status === 'free' ? 'Frei' : 'Vermietet'}
              </Badge>
            )}
            {result.type === 'task' && result.metadata?.completed !== undefined && (
              <Badge variant={result.metadata.completed ? 'outline' : 'secondary'} className={cn("text-[10px] h-5 px-1.5 font-normal", result.metadata.completed && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20")}>
                {result.metadata.completed ? 'Erledigt' : 'Offen'}
              </Badge>
            )}
          </div>

          {/* Subtitle Mobile Only (if hidden above) or if Context needs showing */}
          {(result.context) && (
            <div className="text-xs text-muted-foreground group-data-[selected=true]:text-primary-foreground/80 group-hover:text-primary-foreground/80 transition-colors line-clamp-1">
              {result.context}
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-[auto_auto] sm:flex sm:flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/80 group-data-[selected=true]:text-primary-foreground/80 group-hover:text-primary-foreground/80 transition-colors mt-0.5">
            {renderMetadata(result)}
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="flex items-center self-center pl-2 opacity-0 group-data-[selected=true]:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">

        {result.actions && result.actions.length > 0 && (
          <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm p-1 rounded-lg border shadow-sm">
            {result.actions.slice(0, 3).map((action, index) => (
              <Button
                key={index}
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                title={action.label}
                onClick={(e) => {
                  e.stopPropagation()
                  onAction?.(result, index)
                }}
              >
                {React.createElement(action.icon, { className: "!h-3.5 !w-3.5" })}
              </Button>
            ))}

            {/* Enter Action Hint */}
            <div className="w-px h-4 bg-border mx-1" />
            <div className="flex items-center justify-center h-7 w-7 text-muted-foreground/50">
              <ArrowRight className="!h-3.5 !w-3.5" />
            </div>
          </div>
        )}
      </div>
    </CommandItem>
  )
}