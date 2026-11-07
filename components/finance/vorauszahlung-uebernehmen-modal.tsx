'use client';

/**
 * Second step of the Abrechnung-Versand (GH-23): saves the announced Vorauszahlungserhöhungen to the tenants'
 * prepayment schedules. Its own confirmation, so the change to the Soll never happens by accident.
 */
import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useModalStore } from '@/hooks/use-modal-store';
import { useToast } from '@/hooks/use-toast';
import { planNebenkostenVorauszahlungenAction, type VorauszahlungPlanResult } from '@/app/mieter-actions';
import { formatCurrency } from '@/utils/format';
import { isoToGermanDate } from '@/utils/date-calculations';

export function VorauszahlungUebernehmenModal() {
  const {
    isVorauszahlungUebernehmenModalOpen,
    closeVorauszahlungUebernehmenModal,
    closeAbrechnungVersandModal,
    abrechnungVersandData,
    abrechnungVersandRows,
    updateAbrechnungVersandRow,
  } = useModalStore();
  const { toast } = useToast();

  // Every tenant with an increase set; saved ones stay listed so the result remains visible
  const candidates = useMemo(
    () =>
      (abrechnungVersandData?.tenants ?? [])
        .map(tenant => ({ tenant, row: abrechnungVersandRows[tenant.tenantId] }))
        .filter(({ row }) => row?.erhoehung?.aktiv),
    [abrechnungVersandData?.tenants, abrechnungVersandRows]
  );

  const [deselected, setDeselected] = useState<Set<string>>(() => new Set());
  const [results, setResults] = useState<Record<string, VorauszahlungPlanResult>>({});
  const [isSaving, setIsSaving] = useState(false);

  const pending = candidates.filter(({ tenant, row }) => !row?.uebernommen && !deselected.has(tenant.tenantId));
  const hasResults = Object.keys(results).length > 0;
  const allSaved = candidates.length > 0 && candidates.every(({ tenant, row }) => row?.uebernommen || deselected.has(tenant.tenantId));

  const toggle = (tenantId: string, checked: boolean) => {
    setDeselected(previous => {
      const next = new Set(previous);
      if (checked) next.delete(tenantId);
      else next.add(tenantId);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (pending.length === 0) return;
    setIsSaving(true);
    try {
      const response = await planNebenkostenVorauszahlungenAction(
        pending.map(({ tenant, row }) => ({
          tenantId: tenant.tenantId,
          amount: row!.erhoehung!.betrag,
          date: row!.erhoehung!.abDatum,
        }))
      );
      if (response.error && response.results.length === 0) {
        toast({ title: 'Übernahme fehlgeschlagen', description: response.error.message, variant: 'destructive' });
        return;
      }
      const byTenant = Object.fromEntries(response.results.map(result => [result.tenantId, result]));
      setResults(previous => ({ ...previous, ...byTenant }));
      for (const result of response.results) {
        if (result.success) updateAbrechnungVersandRow(result.tenantId, { uebernommen: true });
      }
      const failed = response.results.filter(result => !result.success).length;
      toast(
        failed === 0
          ? { title: 'Vorauszahlungen übernommen', description: 'Die neuen Beträge gelten ab dem jeweiligen Datum.' }
          : { title: 'Nicht alle übernommen', description: `${failed} Mieter konnten nicht gespeichert werden.`, variant: 'destructive' }
      );
    } catch (saveError) {
      console.error('Vorauszahlung-Übernahme failed', saveError);
      toast({ title: 'Übernahme fehlgeschlagen', description: 'Bitte versuchen Sie es erneut.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    closeVorauszahlungUebernehmenModal();
    // Everything chosen is saved: the Versand is done as well
    if (hasResults && allSaved) closeAbrechnungVersandModal({ force: true });
  };

  return (
    <Dialog open={isVorauszahlungUebernehmenModalOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="w-full max-w-full h-dvh sm:h-auto sm:max-h-[85vh] sm:max-w-xl rounded-none sm:rounded-2xl flex flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 px-4 sm:px-6 pt-6 pb-4 border-b text-left">
          <DialogTitle>Neue Vorauszahlungen übernehmen</DialogTitle>
          <DialogDescription>
            Die gewählten Beträge werden in den Vorauszahlungen der Mieter hinterlegt und gelten ab dem angegebenen Datum,
            auch für die nächste Abrechnung.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 divide-y">
          {candidates.map(({ tenant, row }) => {
            const erhoehung = row!.erhoehung!;
            const result = results[tenant.tenantId];
            const checked = !deselected.has(tenant.tenantId);
            const checkboxId = `uebernehmen-${tenant.tenantId}`;
            return (
              <li key={tenant.tenantId} className="py-3 flex items-start gap-3">
                {row?.uebernommen ? (
                  <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-600 shrink-0" aria-label="Übernommen" />
                ) : (
                  <Checkbox
                    id={checkboxId}
                    className="mt-0.5"
                    checked={checked}
                    disabled={isSaving}
                    onCheckedChange={value => toggle(tenant.tenantId, value === true)}
                    aria-label={`${tenant.name} übernehmen`}
                  />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <label htmlFor={checkboxId} className="flex flex-wrap items-center gap-2 font-medium">
                    <span className="truncate">{tenant.name}</span>
                    {row?.mailGeoeffnet && <Badge variant="outline" className="text-xs">Mail geöffnet</Badge>}
                  </label>
                  <div className="text-sm text-muted-foreground tabular-nums">
                    {formatCurrency(tenant.currentMonthlyPrepayment)} → <span className="text-foreground font-medium">{formatCurrency(erhoehung.betrag)}</span>
                    {' '}monatlich ab {isoToGermanDate(erhoehung.abDatum)}
                  </div>
                  {!checked && !row?.uebernommen && row?.mailGeoeffnet && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      Die Mail mit dieser Erhöhung wurde bereits geöffnet. Ohne Übernahme passen Mail und Vorauszahlung nicht zusammen.
                    </p>
                  )}
                  {result && !result.success && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <XCircle className="h-3 w-3 shrink-0" /> {result.error || 'Nicht gespeichert.'}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <DialogFooter className="shrink-0 px-4 sm:px-6 py-4 border-t gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
            {hasResults ? 'Schließen' : 'Zurück'}
          </Button>
          {pending.length > 0 && (
            <Button type="button" onClick={handleConfirm} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {pending.length === 1 ? '1 Vorauszahlung übernehmen' : `${pending.length} Vorauszahlungen übernehmen`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
