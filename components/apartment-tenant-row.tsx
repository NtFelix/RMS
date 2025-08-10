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

interface ApartmentTenantRowProps extends React.HTMLAttributes<HTMLDivElement> {
  apartment: WohnungOverviewData;
  hausName: string;
  onEditApartment: () => void;
  onEditTenant: () => void;
  onViewDetails: () => void;
  expandable?: boolean;
  expandedContent?: React.ReactNode;
  className?: string;
}

export const ApartmentTenantRow = React.forwardRef<
  HTMLDivElement,
  ApartmentTenantRowProps
>((
  {
    apartment,
    hausName,
    onEditApartment,
    onEditTenant,
    onViewDetails,
    expandable = false,
    expandedContent,
    className,
    ...props
  },
  ref
) => {
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
    <div 
      ref={!expandable ? ref : undefined}
      className={cn(
        "flex items-center justify-between p-4 border rounded-lg transition-all duration-200 ease-in-out",
        "hover:bg-muted/60 hover:shadow-sm hover:-translate-y-0.5 hover:border-primary/30",
        "active:translate-y-0 active:shadow-none",
        isVacant ? "border-dashed border-muted-foreground/30" : "border-muted-foreground/20",
        "group",
        className
      )}
      {...(!expandable ? props : {})}
    >
      {/* Left side - Apartment info */}
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <div>
            <div className="font-medium group-hover:text-foreground transition-colors">
              {apartment.name}
            </div>
            <div className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
              {apartment.groesse} m² • {hausName}
            </div>
          </div>
        </div>
      </div>

      {/* Center - Tenant info */}
      <div className="flex items-center gap-4 flex-1">
        {isVacant ? (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
            <User className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <div>
              <div className="font-medium group-hover:text-foreground transition-colors">
                {apartment.currentTenant?.name}
              </div>
              <div className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
                {apartment.currentTenant?.einzug && `Seit ${formatDate(apartment.currentTenant.einzug)}`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right side - Rent info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Euro className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <div className="text-right">
            <div className="font-medium group-hover:text-foreground transition-colors">
              {formatCurrency(apartment.miete)}
            </div>
            <div className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors">
              {apartment.groesse > 0 ? `${formatCurrency(apartment.miete / apartment.groesse)}/m²` : 'N/A'}
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
        <div ref={ref} className="cursor-pointer" {...props}>
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
})

ApartmentTenantRow.displayName = "ApartmentTenantRow"
