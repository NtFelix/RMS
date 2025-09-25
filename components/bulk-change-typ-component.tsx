'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { BulkOperationProps } from '@/types/bulk-operations'
import { useToast } from '@/hooks/use-toast'

interface BulkChangeTypComponentProps extends BulkOperationProps {
  selectedIds: string[]
  onConfirm: (data: any) => Promise<void>
  onCancel: () => void
  onDataChange?: (data: any) => void
}

export function BulkChangeTypComponent({
  selectedIds,
  onConfirm,
  onCancel,
  onDataChange
}: BulkChangeTypComponentProps) {
  const [selectedTyp, setSelectedTyp] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleConfirm = async () => {
    if (!selectedTyp) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie einen Typ aus.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const istEinnahmen = selectedTyp === 'einnahmen'
      const result = await onConfirm({ ist_einnahmen: istEinnahmen })
      
      // Show success toast
      const typLabel = istEinnahmen ? 'Einnahmen' : 'Ausgaben'
      toast({
        title: 'Erfolgreich',
        description: `${selectedIds.length} Finanz-Eintrag${selectedIds.length !== 1 ? 'e' : ''} wurde${selectedIds.length !== 1 ? 'n' : ''} zu "${typLabel}" geändert.`,
      })
    } catch (error) {
      console.error('Error in bulk change typ:', error)
      toast({
        title: 'Fehler',
        description: 'Die Finanz-Einträge konnten nicht geändert werden.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold">Typ ändern</h3>
          <p className="text-sm text-gray-600">
            {selectedIds.length} Finanz-Eintrag{selectedIds.length !== 1 ? 'e' : ''} zwischen Einnahmen und Ausgaben wechseln
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="typ-select">Neuen Typ auswählen</Label>
          <Select value={selectedTyp} onValueChange={(value) => {
            setSelectedTyp(value)
            // Notify parent of data change for validation
            const istEinnahmen = value === 'einnahmen'
            onDataChange?.({ ist_einnahmen: istEinnahmen })
          }}>
            <SelectTrigger id="typ-select">
              <SelectValue placeholder="Typ auswählen..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="einnahmen">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span>Einnahmen</span>
                </div>
              </SelectItem>
              <SelectItem value="ausgaben">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span>Ausgaben</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedTyp && (
          <div className={`p-3 border rounded-md ${
            selectedTyp === 'einnahmen' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {selectedTyp === 'einnahmen' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <p className={`text-sm font-medium ${
                selectedTyp === 'einnahmen' ? 'text-green-800' : 'text-red-800'
              }`}>
                <strong>Ausgewählter Typ:</strong> {selectedTyp === 'einnahmen' ? 'Einnahmen' : 'Ausgaben'}
              </p>
            </div>
            <p className={`text-sm ${
              selectedTyp === 'einnahmen' ? 'text-green-700' : 'text-red-700'
            }`}>
              Alle {selectedIds.length} ausgewählten Finanz-Einträge werden zu diesem Typ geändert.
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Alle anderen Eigenschaften der Einträge bleiben unverändert.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Abbrechen
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isLoading || !selectedTyp}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Wird geändert...
            </>
          ) : (
            `${selectedIds.length} Eintrag${selectedIds.length !== 1 ? 'e' : ''} ändern`
          )}
        </Button>
      </div>
    </div>
  )
}