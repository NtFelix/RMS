"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Trash2, Home, Loader2 } from "lucide-react"
import { SelectionPill, SelectionPillAction } from "@/components/dashboard/shell"
import { Tenant } from "@/types/Tenant"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { starteLoeschenMitKautionen } from "@/lib/kautionen-loeschen"
import { formatBulkDeleteSuffix, formatFailureReasons, stripDbCodePrefix } from "@/lib/bulk-delete-summary"
import { bewerberLoeschenAction } from "@/app/bewerber-actions"

interface TenantBulkActionBarProps {
  selectedTenants: Set<string>
  tenants: Tenant[]
  wohnungsMap: Record<string, string>
  onClearSelection: () => void
  onExport: () => void
  onUpdate?: () => void // Callback to refresh the tenant list after a change (assign apartment, delete)
  canEdit?: boolean
  canDelete?: boolean
  /**
   * "bewerber": Die Auswahl sind Bewerber (Tabelle "Bewerber"). Löschen geht dann je ID über bewerberLoeschenAction,
   * "Wohnung zuweisen" entfällt (Bewerber werden nicht über /api/mieter/bulk-update geändert). Export bleibt.
   */
  modus?: "mieter" | "bewerber"
}

/** Löscht die Bewerber einzeln (Papierkorb) und fasst die Ergebnisse in die Form der Massenlösch-Route. */
async function loescheBewerber(ids: string[]): Promise<{ status: number; result: BulkLoeschErgebnis }> {
  const ergebnisse = await Promise.all(ids.map((id) => bewerberLoeschenAction(id)));
  const successCount = ergebnisse.filter((e) => e.success).length;
  const reasons = ergebnisse
    .filter((e) => !e.success)
    .map((e) => e.error?.message ?? "")
    .filter(Boolean);
  return {
    // Wie die Route: nichts gelöscht = 409 (reine Ablehnung), sonst Teil- oder Vollerfolg.
    status: successCount > 0 ? 200 : 409,
    result: { successCount, errorCount: ids.length - successCount, reasons },
  };
}

interface BulkLoeschErgebnis {
  successCount?: number;
  errorCount?: number;
  reasons?: unknown;
  error?: unknown;
}

export function TenantBulkActionBar({
  selectedTenants,
  tenants,
  wohnungsMap,
  onClearSelection,
  onExport,
  onUpdate,
  canEdit = true,
  canDelete = true,
  modus = "mieter",
}: TenantBulkActionBarProps) {
  const istBewerber = modus === "bewerber";
  const nomen = istBewerber ? "Bewerber" : "Mieter";
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedApartment, setSelectedApartment] = useState<string>("none")
  const [isUpdating, setIsUpdating] = useState(false)

  if (selectedTenants.size === 0) return null

  const handleDeleteClick = () => {
    if (selectedTenants.size === 0) {
      toast({
        title: "Keine Mieter ausgewählt",
        description: "Bitte wählen Sie mindestens einen Mieter zum Löschen aus.",
        variant: "destructive",
      });
      return;
    }
    // Bewerber haben keine Kaution: direkt die übliche Frage.
    if (istBewerber) {
      setIsDeleteDialogOpen(true);
      return;
    }
    // Zuerst die Auswirkung laden, dann EIN Dialog: ohne gebuchte Kaution die übliche Frage, sonst die Übersicht (ersetzt die Frage).
    void starteLoeschenMitKautionen("Mieter", Array.from(selectedTenants), {
      einfach: () => setIsDeleteDialogOpen(true),
      loeschen: handleConfirmDelete,
    });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);

    try {
      const ids = Array.from(selectedTenants);

      const { status, result } = istBewerber
        ? await loescheBewerber(ids)
        : await (async () => {
            const response = await fetch('/api/mieter/bulk-delete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ids }),
            });
            return { status: response.status, result: await response.json() as BulkLoeschErgebnis };
          })();

      // Die Datenbank kann einzelne Löschungen ablehnen (z. B. Mieter mit hinterlegter Kaution). Die Route meldet
      // Teilerfolge (HTTP 200) mit den Gründen ohne technisches Präfix; ohne jeden Erfolg antwortet sie mit 409/500.
      const successCount = Number(result.successCount) || 0;
      const errorCount = Number(result.errorCount) || 0;
      const reasons: string[] = Array.isArray(result.reasons)
        ? (result.reasons as unknown[])
            .filter((reason: unknown): reason is string => typeof reason === 'string')
            .map(stripDbCodePrefix)
            .filter(Boolean)
        : [];
      const reasonText = formatFailureReasons(reasons);

      // Bereits gelöschte Mieter sollen auch nach einem (Teil-)Fehlschlag aus der Liste verschwinden. Nur eine
      // reine Ablehnung (409, nichts gelöscht) lässt den Stand unverändert.
      if (successCount > 0 || status !== 409) {
        onUpdate?.();
      }

      if (successCount > 0) {
        toast({
          title: "Erfolg",
          description: `${successCount} ${nomen} erfolgreich gelöscht${formatBulkDeleteSuffix(errorCount, reasons)}`,
          variant: "success",
        });

        // Clear selection and close dialog
        onClearSelection();
        setIsDeleteDialogOpen(false);
      } else {
        // Nichts gelöscht: Die Auswahl bleibt, damit der abgelehnte Mieter abgewählt werden kann.
        setIsDeleteDialogOpen(false);
        const technicalMessage = typeof result.error === 'string' && result.error ? stripDbCodePrefix(result.error) : ''
        toast({
          title: "Fehler",
          description: reasonText
            ? `Keine ${nomen} konnten gelöscht werden. ${reasonText}`
            : technicalMessage || `Fehler beim Löschen der ${nomen}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      // Ergebnis unbekannt (z. B. Verbindungsabbruch): die Liste neu laden.
      onUpdate?.();
      toast({
        title: "Fehler",
        description: `Fehler beim Löschen der ${nomen}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAssignApartment = async () => {
    if (selectedApartment === "none") {
      toast({
        title: "Fehlende Auswahl",
        description: "Bitte wählen Sie eine Wohnung aus, um fortzufahren.",
        variant: "destructive"
      })
      return
    }

    if (selectedTenants.size === 0) {
      toast({
        title: "Keine Mieter ausgewählt",
        description: "Bitte wählen Sie mindestens einen Mieter aus.",
        variant: "destructive"
      })
      return
    }

    setIsUpdating(true)
    
    try {
      const response = await fetch('/api/mieter/bulk-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedTenants),
          updates: {
            wohnung_id: selectedApartment === "none" ? null : selectedApartment
          }
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Aktualisieren der Mieter')
      }

      const successCount = result.successCount || 0
      const totalCount = selectedTenants.size
      
      if (successCount > 0) {
        const teilweise = (result.errorCount || 0) > 0
        toast({
          title: teilweise ? "Teilweise aktualisiert" : "Erfolgreich aktualisiert",
          description: teilweise
            ? `${successCount} von ${totalCount} Mietern wurden aktualisiert. ${result.error ?? ''}`.trim()
            : `${successCount} von ${totalCount} Mietern wurden erfolgreich aktualisiert.`,
          variant: teilweise ? "destructive" : "success"
        })
        
        setIsAssignDialogOpen(false)
        setSelectedApartment("none")
        onUpdate?.()
        onClearSelection()
      } else {
        toast({
          title: "Keine Änderungen",
          description: "Es wurden keine Mieter aktualisiert.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Mieter:", error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const apartmentOptions = Object.entries(wohnungsMap).map(([id, name]) => ({
    id,
    name: name || `Wohnung ${id}`
  }))

  // Fragment statt Wrapper: die Pille ist das letzte Kind der Seite (sticky am unteren Rand), die Dialoge sind Portale.
  return (
    <>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sind Sie sicher?</DialogTitle>
            <DialogDescription>
              Möchten Sie wirklich {selectedTenants.size} ausgewählte {istBewerber ? "Bewerber" : "Mieter"} löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Abbrechen
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleConfirmDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gelöscht...
                </>
              ) : 'Löschen bestätigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Apartment Dialog (nur für Mieter) */}
      {!istBewerber && (
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Wohnung zuweisen</DialogTitle>
            <DialogDescription>
              Weisen Sie {selectedTenants.size} {selectedTenants.size === 1 ? 'ausgewähltem Mieter' : 'ausgewählten Mietern'} eine Wohnung zu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apartment" className="text-right">
                Wohnung
              </Label>
              <Select
                value={selectedApartment}
                onValueChange={setSelectedApartment}
                disabled={isUpdating}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Wohnung auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Wohnung</SelectItem>
                  {apartmentOptions.map((apartment) => (
                    <SelectItem key={apartment.id} value={apartment.id}>
                      {apartment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
              disabled={isUpdating}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleAssignApartment}
              disabled={!selectedApartment || isUpdating}
            >
              {isUpdating ? 'Wird gespeichert...' : 'Zuweisen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      <SelectionPill count={selectedTenants.size} noun={[nomen, nomen]} onClear={onClearSelection}>
        {!istBewerber && (
          <SelectionPillAction
            icon={Home}
            onClick={() => setIsAssignDialogOpen(true)}
            disabled={!canEdit || isUpdating}
          >
            Wohnung zuweisen
          </SelectionPillAction>
        )}
        <SelectionPillAction icon={Download} onClick={onExport}>
          Exportieren
        </SelectionPillAction>
        <SelectionPillAction
          icon={isDeleting ? Loader2 : Trash2}
          variant="destructive"
          onClick={handleDeleteClick}
          disabled={isDeleting || !canDelete}
          aria-label={`Löschen (${selectedTenants.size})`}
          className={isDeleting ? "[&_svg]:animate-spin" : undefined}
        >
          {isDeleting ? "Löschen…" : "Löschen"}
        </SelectionPillAction>
      </SelectionPill>
    </>
  )
}
