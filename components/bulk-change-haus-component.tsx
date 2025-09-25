'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Home } from 'lucide-react'
import { BulkOperationProps } from '@/types/bulk-operations'
import { useToast } from '@/hooks/use-toast'

interface Haus {
  id: string
  name: string
}

interface BulkChangeHausComponentProps extends BulkOperationProps {
  selectedIds: string[]
  onConfirm: (data: any) => Promise<void>
  onCancel: () => void
  onDataChange?: (data: any) => void
}

export function BulkChangeHausComponent({
  selectedIds,
  onConfirm,
  onCancel,
  onDataChange
}: BulkChangeHausComponentProps) {
  const [selectedHausId, setSelectedHausId] = useState<string>('')
  const [houses, setHouses] = useState<Haus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHouses, setIsLoadingHouses] = useState(true)
  const { toast } = useToast()

  // Fetch available houses
  useEffect(() => {
    const fetchHouses = async () => {
      try {
        setIsLoadingHouses(true)
        const response = await fetch('/api/haeuser')
        if (!response.ok) {
          throw new Error('Failed to fetch houses')
        }
        const data = await response.json()
        setHouses(data || [])
      } catch (error) {
        console.error('Error fetching houses:', error)
        toast({
          title: 'Fehler',
          description: 'Häuser konnten nicht geladen werden.',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingHouses(false)
      }
    }

    fetchHouses()
  }, [toast])

  const handleConfirm = async () => {
    if (!selectedHausId) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie ein Haus aus.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await onConfirm({ hausId: selectedHausId })
      
      // Show success toast
      const selectedHaus = houses.find(h => h.id === selectedHausId)
      toast({
        title: 'Erfolgreich',
        description: `${selectedIds.length} Wohnung${selectedIds.length !== 1 ? 'en' : ''} wurde${selectedIds.length !== 1 ? 'n' : ''} dem Haus "${selectedHaus?.name}" zugewiesen.`,
      })
    } catch (error) {
      console.error('Error in bulk change haus:', error)
      toast({
        title: 'Fehler',
        description: 'Die Wohnungen konnten nicht zugewiesen werden.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedHaus = houses.find(h => h.id === selectedHausId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Home className="h-5 w-5 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold">Haus ändern</h3>
          <p className="text-sm text-gray-600">
            {selectedIds.length} Wohnung{selectedIds.length !== 1 ? 'en' : ''} einem neuen Haus zuweisen
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="haus-select">Neues Haus auswählen</Label>
          {isLoadingHouses ? (
            <div className="flex items-center gap-2 p-3 border rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-600">Häuser werden geladen...</span>
            </div>
          ) : (
            <Select value={selectedHausId} onValueChange={(value) => {
              setSelectedHausId(value)
              // Notify parent of data change for validation
              onDataChange?.({ hausId: value })
            }}>
              <SelectTrigger id="haus-select">
                <SelectValue placeholder="Haus auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {houses.map((haus) => (
                  <SelectItem key={haus.id} value={haus.id}>
                    {haus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedHausId && selectedHaus && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Ausgewähltes Haus:</strong> {selectedHaus.name}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Alle {selectedIds.length} ausgewählten Wohnungen werden diesem Haus zugewiesen.
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
          disabled={isLoading || !selectedHausId || isLoadingHouses}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Wird geändert...
            </>
          ) : (
            `${selectedIds.length} Wohnung${selectedIds.length !== 1 ? 'en' : ''} zuweisen`
          )}
        </Button>
      </div>
    </div>
  )
}