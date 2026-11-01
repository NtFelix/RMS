"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import {
  Building2,
  Droplet,
  Home,
  Lock,
} from "lucide-react"
import { WaterDropletLoader } from "@/components/ui/water-droplet-loader"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useModalStore } from "@/hooks/use-modal-store"
import { API_PERMISSION_DENIED_CODE } from "@/lib/permissions-core"

interface Wohnung {
  id: string
  name: string
  groesse: number
  miete: number
}

interface MeterVerwaltungModalProps {
  isOpen: boolean
  onClose: () => void
  hausId: string
  hausName: string
}

export function MeterVerwaltungModal({
  isOpen,
  onClose,
  hausId,
  hausName,
}: MeterVerwaltungModalProps) {
  const { openWasserZaehlerModal } = useModalStore()
  const [wohnungen, setWohnungen] = React.useState<Wohnung[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  // GET /api/wohnungen answers 403 + PERMISSION_DENIED without wohnungen:ansehen: no list, but also no error
  const [noWohnungenAccess, setNoWohnungenAccess] = React.useState(false)

  // Load apartments when modal opens
  React.useEffect(() => {
    if (isOpen && hausId) {
      loadWohnungen()
    }
  }, [isOpen, hausId])

  const loadWohnungen = async () => {
    setIsLoading(true)
    setNoWohnungenAccess(false)
    try {
      const response = await fetch(`/api/wohnungen`)
      // Only a 403 with the permission code means "no right"; a 403 without it (e.g. from a proxy) stays an error
      if (response.status === 403) {
        const body = await response.json().catch(() => null)
        if (body?.code === API_PERMISSION_DENIED_CODE) {
          setWohnungen([])
          setNoWohnungenAccess(true)
          return
        }
      }
      if (response.ok) {
        const data = await response.json()
        const filteredWohnungen = data.filter((w: any) => w.haus_id === hausId)
        setWohnungen(filteredWohnungen)
      } else {
        throw new Error("Fehler beim Laden der Wohnungen")
      }
    } catch (error) {
      console.error("Error loading Wohnungen:", error)
      toast({
        title: "Fehler",
        description: "Wohnungen konnten nicht geladen werden.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenMeterModal = (wohnung: Wohnung) => {
    openWasserZaehlerModal(wohnung.id, wohnung.name)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Zähler verwalten</DialogTitle>
          <DialogDescription>
            Haus: <span className="font-medium">{hausName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <WaterDropletLoader size="md" />
              <p className="text-sm text-muted-foreground animate-pulse">
                Lade Wohnungen...
              </p>
            </div>
          ) : noWohnungenAccess ? (
            <Card className="bg-gray-50 dark:bg-[#22272e] border border-dashed border-gray-300 dark:border-gray-600 rounded-3xl">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <Lock className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium">Kein Zugriff auf Wohnungen</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Dafür wird das Recht „Wohnungen ansehen“ benötigt.
                </p>
              </CardContent>
            </Card>
          ) : wohnungen.length === 0 ? (
            <Card className="bg-gray-50 dark:bg-[#22272e] border border-dashed border-gray-300 dark:border-gray-600 rounded-3xl">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <Home className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Keine Wohnungen in diesem Haus gefunden
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {wohnungen.map((wohnung) => (
                <Card
                  key={wohnung.id}
                  className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl overflow-hidden hover:shadow-md transition-all duration-300"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Home className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-base">{wohnung.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {wohnung.groesse} m²
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {new Intl.NumberFormat('de-DE', {
                                style: 'currency',
                                currency: 'EUR'
                              }).format(wohnung.miete)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleOpenMeterModal(wohnung)}
                        className="gap-2"
                      >
                        <Droplet className="h-4 w-4" />
                        Zähler verwalten
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
