"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, User, Home, Euro } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface WohnungOverviewData {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  status: 'frei' | 'vermietet';
  currentTenant?: {
    id: string;
    name: string;
    einzug?: string;
  };
}

interface ApartmentTenantRowProps {
  apartment: WohnungOverviewData;
  hausName: string;
  onEditApartment: () => void;
  onEditTenant: () => void;
  onViewDetails: () => void;
  expandable?: boolean;
  expandedContent?: React.ReactNode;
  className?: string;
}

export function ApartmentTenantRow({
  apartment,
  hausName,
  onEditApartment,
  onEditTenant,
  onViewDetails,
  expandable = false,
  expandedContent,
  className,
}: ApartmentTenantRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const isVacant = apartment.status === 'frei' || !apartment.currentTenant

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('de-DE')
  }

  const rowContent = (
    <div className={cn(
      "flex items-center justify-between p-4 border rounded-lg transition-colors hover:bg-muted/50",
      isVacant && "border-dashed border-muted-foreground/30",
      className
    )}>
      {/* Left side - Apartment info */}
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{apartment.name}</div>
            <div className="text-sm text-muted-foreground">
              {apartment.groesse} m² • {hausName}
            </div>
          </div>
        </div>
      </div>

      {/* Center - Tenant info */}
      <div className="flex items-center gap-4 flex-1">
        {isVacant ? (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <Badge variant="outline" className="text-muted-foreground">
                Frei
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">
                Keine Mieter
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{apartment.currentTenant?.name}</div>
              <div className="text-sm text-muted-foreground">
                {apartment.currentTenant?.einzug && `Seit ${formatDate(apartment.currentTenant.einzug)}`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right side - Rent info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Euro className="h-4 w-4 text-muted-foreground" />
          <div className="text-right">
            <div className="font-medium">{formatCurrency(apartment.miete)}</div>
            <div className="text-sm text-muted-foreground">
              {formatCurrency(apartment.miete / apartment.groesse)}/m²
            </div>
          </div>
        </div>

        {/* Expand indicator */}
        {expandable && (
          <div className="ml-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
      </div>
    </div>
  )

  if (!expandable) {
    return rowContent
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <div className="cursor-pointer">
          {rowContent}
        </div>
      </CollapsibleTrigger>
      {expandedContent && (
        <CollapsibleContent className="px-4 pb-4">
          <div className="mt-2 pt-4 border-t border-muted">
            {expandedContent}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}