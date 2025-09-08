"use client"

import { useEffect, useState } from "react"
import { Control } from "react-hook-form"
import { Loader2 } from "lucide-react"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Template, ContextType } from "@/types/template-system"

// Entity interfaces
interface MieterEntity {
  id: string;
  name: string;
  email?: string;
  telefonnummer?: string;
  einzug?: string;
  auszug?: string;
  wohnung_id?: string;
}

interface WohnungEntity {
  id: string;
  name: string;
  groesse?: number;
  miete?: number;
  haus_id?: string;
}

interface HausEntity {
  id: string;
  name: string;
  ort?: string;
  strasse?: string;
  groesse?: string;
}

interface AvailableEntities {
  mieter: MieterEntity[];
  wohnungen: WohnungEntity[];
  haeuser: HausEntity[];
}

interface TemplateContextSelectorProps {
  template: Template;
  control: Control<any>;
  availableEntities: AvailableEntities;
  isLoading?: boolean;
  onEntityChange?: (entityType: string, entityId: string) => void;
}

export function TemplateContextSelector({
  template,
  control,
  availableEntities,
  isLoading = false,
  onEntityChange
}: TemplateContextSelectorProps) {
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({})

  const handleEntityChange = (entityType: string, entityId: string) => {
    setSelectedValues(prev => ({ ...prev, [entityType]: entityId }))
    onEntityChange?.(entityType, entityId)
  }

  const getFilteredEntities = (entityType: 'mieter' | 'wohnungen' | 'haeuser') => {
    switch (entityType) {
      case 'mieter':
        // Filter mieter by selected wohnung if any
        if (selectedValues.wohnung_id) {
          return availableEntities.mieter.filter(m => m.wohnung_id === selectedValues.wohnung_id)
        }
        return availableEntities.mieter
        
      case 'wohnungen':
        // Filter wohnungen by selected haus if any
        if (selectedValues.haus_id) {
          return availableEntities.wohnungen.filter(w => w.haus_id === selectedValues.haus_id)
        }
        return availableEntities.wohnungen
        
      case 'haeuser':
        return availableEntities.haeuser
        
      default:
        return []
    }
  }

  const isContextRequired = (contextType: ContextType): boolean => {
    return template.kontext_anforderungen.includes(contextType)
  }

  const shouldShowContext = (contextType: ContextType): boolean => {
    // Show context if it's required or if it's part of common context mappings
    return (
      template.kontext_anforderungen.includes(contextType) ||
      template.kontext_anforderungen.includes('mail') ||
      template.kontext_anforderungen.includes('vertrag') ||
      template.kontext_anforderungen.includes('kuendigung')
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Lade verfügbare Entitäten...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Kontext auswählen</h3>
        {template.kontext_anforderungen.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {template.kontext_anforderungen.map((context) => (
              <Badge key={context} variant="secondary" className="text-xs">
                {context}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mieter Selection */}
        {shouldShowContext('mieter') && (
          <FormField
            control={control}
            name="mieter_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Mieter
                  {isContextRequired('mieter') && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value)
                    handleEntityChange('mieter_id', value)
                  }} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Mieter auswählen" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(getFilteredEntities('mieter') as MieterEntity[]).map((mieter) => (
                      <SelectItem key={mieter.id} value={mieter.id}>
                        <div className="flex flex-col">
                          <span>{mieter.name}</span>
                          {mieter.email && (
                            <span className="text-xs text-muted-foreground">
                              {mieter.email}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Wohnung Selection */}
        {shouldShowContext('wohnung') && (
          <FormField
            control={control}
            name="wohnung_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Wohnung
                  {isContextRequired('wohnung') && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value)
                    handleEntityChange('wohnung_id', value)
                  }} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Wohnung auswählen" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(getFilteredEntities('wohnungen') as WohnungEntity[]).map((wohnung) => (
                      <SelectItem key={wohnung.id} value={wohnung.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{wohnung.name}</span>
                          {wohnung.miete && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {wohnung.miete}€
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Haus Selection */}
        {shouldShowContext('haus') && (
          <FormField
            control={control}
            name="haus_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Haus
                  {isContextRequired('haus') && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value)
                    handleEntityChange('haus_id', value)
                  }} 
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Haus auswählen" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(getFilteredEntities('haeuser') as HausEntity[]).map((haus) => (
                      <SelectItem key={haus.id} value={haus.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{haus.name}</span>
                          {haus.ort && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {haus.ort}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Entity Count Information */}
      <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
        {shouldShowContext('mieter') && (
          <div>
            {getFilteredEntities('mieter').length} Mieter verfügbar
          </div>
        )}
        {shouldShowContext('wohnung') && (
          <div>
            {getFilteredEntities('wohnungen').length} Wohnungen verfügbar
          </div>
        )}
        {shouldShowContext('haus') && (
          <div>
            {getFilteredEntities('haeuser').length} Häuser verfügbar
          </div>
        )}
      </div>
    </div>
  )
}