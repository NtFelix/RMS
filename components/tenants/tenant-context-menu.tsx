"use client"

import * as React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Edit, User, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { deleteTenantAction } from "@/app/mieter-actions"
import { bewerberLoeschenAction, bewerberAnnehmenAction } from "@/app/bewerber-actions"
import { starteLoeschenMitKautionen } from "@/lib/kautionen-loeschen"
import { useModalStore } from "@/hooks/use-modal-store"
import { useKautionOeffnen } from "@/hooks/use-kaution-oeffnen"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { tenantActions, getVisibleActions, type TenantActionDef } from "@/components/tenants/tenant-menu-actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Tenant } from "@/types/Tenant";

interface TenantContextMenuProps {
  children: React.ReactNode
  tenant: Tenant
  onEdit: () => void
  onRefresh: () => void
  canEdit?: boolean
  canDelete?: boolean
  /** Modulrecht `kautionen: ansehen` (GH-6): ohne dieses Recht fehlt der Menüeintrag "Kaution". Standard: kein Recht. */
  canViewKautionen?: boolean
  /** Wohnungen für "Als Mieter übernehmen" (Auswahl im Dialog). */
  wohnungen?: { id: string; name: string }[]
}

/** Datum als `YYYY-MM-DD` in lokaler Zeit (ohne Zeitzonenverschiebung durch toISOString). */
function datumAlsIso(datum: Date): string {
  const jahr = datum.getFullYear()
  const monat = String(datum.getMonth() + 1).padStart(2, "0")
  const tag = String(datum.getDate()).padStart(2, "0")
  return `${jahr}-${monat}-${tag}`
}

export function TenantContextMenu({
  children,
  tenant,
  onEdit,
  onRefresh,
  canEdit = true,
  canDelete = true,
  canViewKautionen = false,
  wohnungen = [],
}: TenantContextMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [uebernehmenOpen, setUebernehmenOpen] = React.useState(false)
  const [isUebernehmen, setIsUebernehmen] = React.useState(false)
  const [uebernehmenWohnungId, setUebernehmenWohnungId] = React.useState<string>("")
  const [uebernehmenEinzug, setUebernehmenEinzug] = React.useState<Date | undefined>(undefined)

  // Bewerber (status 'bewerber') liegen in der Tabelle "Bewerber", Mieter in "Mieter".
  const istBewerber = tenant.status === "bewerber"

  const { openTenantMailTemplatesModal, openApplicantScoreModal } = useModalStore()
  const oeffneKaution = useKautionOeffnen()
  const templatesEnabled = useFeatureFlagEnabled('template-modal-enabled')

  const handleKaution = () => {
    // Der Kautionsdialog lädt seine Daten selbst (getKautionDetailsAction); hier wird nur der Mieter übergeben.
    // Das Öffnen im nächsten Event-Loop-Tick bleibt, damit sich das Kontextmenü zuerst sauber schließt.
    setTimeout(() => {
      void oeffneKaution({ id: tenant.id, name: tenant.name, wohnung_id: tenant.wohnung_id });
    }, 0);
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const result = istBewerber
        ? await bewerberLoeschenAction(tenant.id)
        : await deleteTenantAction(tenant.id);

      if (result.success) {
        toast({
          title: "Erfolg",
          description: istBewerber
            ? `Der Bewerber "${tenant.name}" wurde erfolgreich gelöscht.`
            : `Der Mieter "${tenant.name}" wurde erfolgreich gelöscht.`,
          variant: "success",
        });
        setTimeout(() => {
          onRefresh();
        }, 100); // Delay of 100 milliseconds
      } else {
        toast({
          title: "Fehler",
          description: result.error?.message || (istBewerber ? "Der Bewerber konnte nicht gelöscht werden." : "Der Mieter konnte nicht gelöscht werden."),
          variant: "destructive",
        });
      }
    } catch (error) { // Catch unexpected errors from the action call itself or UI updates
      console.error("Unerwarteter Fehler beim Löschen des Mieters:", error);
      toast({
        title: "Systemfehler",
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleTemplates = () => {
    // Open tenant mail templates modal with tenant name and email in the next tick
    setTimeout(() => {
      openTenantMailTemplatesModal({
        name: tenant.name,
        email: tenant.email ?? null,
        anrede: tenant.anrede ?? null,
        vorname: tenant.vorname ?? null,
        nachname: tenant.nachname ?? null,
        telefonnummer: tenant.telefonnummer ?? null,
      });
    }, 0);
  };

  const handleScoreDetails = () => {
    // Open applicant score details modal in the next tick
    setTimeout(() => {
      openApplicantScoreModal({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email || undefined,
          bewerbung_score: tenant.bewerbung_score,
          bewerbung_metadaten: tenant.bewerbung_metadaten,
          bewerbung_mail_id: tenant.bewerbung_mail_id
        }
      });
    }, 0);
  };

  const handleUebernehmenOeffnen = () => {
    setTimeout(() => {
      setUebernehmenWohnungId("")
      setUebernehmenEinzug(undefined)
      setUebernehmenOpen(true)
    }, 0)
  }

  const handleUebernehmen = async () => {
    if (!uebernehmenWohnungId || !uebernehmenEinzug) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie eine Wohnung und ein Einzugsdatum.",
        variant: "destructive",
      })
      return
    }
    try {
      setIsUebernehmen(true)
      const result = await bewerberAnnehmenAction(tenant.id, uebernehmenWohnungId, datumAlsIso(uebernehmenEinzug))
      if (result.success) {
        toast({
          title: "Erfolg",
          description: `Der Bewerber "${tenant.name}" wurde als Mieter übernommen.`,
          variant: "success",
        })
        setUebernehmenOpen(false)
        setTimeout(() => {
          onRefresh()
        }, 100)
      } else {
        toast({
          title: "Fehler",
          description: result.error?.message || "Der Bewerber konnte nicht übernommen werden.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Unerwarteter Fehler beim Übernehmen des Bewerbers:", error)
      toast({
        title: "Systemfehler",
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      })
    } finally {
      setIsUebernehmen(false)
    }
  }

  const actionHandlers: Record<string, () => void> = {
    kaution: handleKaution,
    datenblatt: handleScoreDetails,
    uebernehmen: handleUebernehmenOeffnen,
    vorlagen: handleTemplates,
  }

  // Bewerber haben keine Kautionen: direkt die übliche Frage. Mieter: zuerst die Auswirkung laden, dann EIN Dialog
  // (ohne gebuchte Kaution die übliche Frage, sonst die Übersicht, die die Frage ersetzt).
  const handleDeleteStart = () => {
    if (istBewerber) {
      setDeleteDialogOpen(true)
      return
    }
    void starteLoeschenMitKautionen("Mieter", [tenant.id], { einfach: () => setDeleteDialogOpen(true), loeschen: handleDelete })
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem 
            onClick={() => {
              setTimeout(() => {
                onEdit();
              }, 0);
            }} 
            disabled={!canEdit} 
            className="flex items-center gap-2 cursor-pointer"
          >
            <Edit className="h-4 w-4" />
            <span>Bearbeiten</span>
          </ContextMenuItem>
          {getVisibleActions(tenant, { templatesEnabled: !!templatesEnabled, canViewKautionen, canEdit }).map((action) => {
            const handler = actionHandlers[action.key]
            if (!handler) return null
            return (
              <ContextMenuItem key={action.key} onClick={handler} className={cn("flex items-center gap-2 cursor-pointer", action.className)}>
                <action.icon className="h-4 w-4" />
                <span>{action.label}</span>
              </ContextMenuItem>
            )
          })}
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={handleDeleteStart}
            disabled={!canDelete}
            className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            <span>Löschen</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{istBewerber ? "Bewerber löschen?" : "Mieter löschen?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {istBewerber
                ? <>Möchten Sie den Bewerber "{tenant.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</>
                : <>Möchten Sie den Mieter "{tenant.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete()} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Löschen..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={uebernehmenOpen} onOpenChange={(offen) => !isUebernehmen && setUebernehmenOpen(offen)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Als Mieter übernehmen</DialogTitle>
            <DialogDescription>
              Der Bewerber "{tenant.name}" wird als Mieter in der gewählten Wohnung angelegt. Der Bewerber gilt danach als angenommen.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`uebernehmen-wohnung-${tenant.id}`}>Wohnung</Label>
              <Select value={uebernehmenWohnungId} onValueChange={setUebernehmenWohnungId} disabled={isUebernehmen}>
                <SelectTrigger id={`uebernehmen-wohnung-${tenant.id}`}>
                  <SelectValue placeholder="Wohnung auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {wohnungen.map((wohnung) => (
                    <SelectItem key={wohnung.id} value={wohnung.id}>
                      {wohnung.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`uebernehmen-einzug-${tenant.id}`}>Einzugsdatum</Label>
              <DatePicker
                id={`uebernehmen-einzug-${tenant.id}`}
                value={uebernehmenEinzug}
                onChange={setUebernehmenEinzug}
                placeholder="Einzugsdatum auswählen"
                disabled={isUebernehmen}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUebernehmenOpen(false)} disabled={isUebernehmen}>
              Abbrechen
            </Button>
            <Button onClick={() => void handleUebernehmen()} disabled={isUebernehmen || !uebernehmenWohnungId || !uebernehmenEinzug}>
              {isUebernehmen ? "Übernehme..." : "Als Mieter übernehmen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
