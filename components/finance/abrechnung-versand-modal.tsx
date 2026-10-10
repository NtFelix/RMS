'use client';

/**
 * Versand-Modal der Nebenkostenabrechnung (GH-23): one mail per tenant through the user's own mail program.
 *
 * The header template applies to every tenant; an expanded row can override it and announce a
 * Vorauszahlungserhöhung. "Mail öffnen" downloads that tenant's PDF and opens a `mailto:` link (which cannot carry
 * attachments). Announced increases are saved in a second step (VorauszahlungUebernehmenModal).
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSONContent } from '@tiptap/react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Mail,
  MailX,
  Paperclip,
  TrendingUp,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { NumberInput } from '@/components/ui/number-input';
import { DatePicker } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth/auth-provider';
import { useModalStore } from '@/hooks/use-modal-store';
import { useTemplates } from '@/hooks/use-templates';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { BETRIEBSKOSTENABRECHNUNG_CATEGORY, MAIL_TEMPLATE_CATEGORIES } from '@/lib/template-constants';
import { buildMailtoUrl, isMailtoTooLong, openMailto } from '@/lib/mail/mailto';
import { renderTemplateText, type MailTemplateContext } from '@/lib/mail/template-variables';
import {
  downloadBlob,
  fetchCustomerBillingAddress,
  formatBillingAddress,
  generateTenantSettlementPdf,
  type BillingAddress,
} from '@/lib/abrechnung/pdf-export';
import { formatCurrency } from '@/utils/format';
import { formatLocalDateToIso, isoToGermanDate } from '@/utils/date-calculations';
import type { Template } from '@/types/template';
import type { AbrechnungVersandRowState, AbrechnungVersandTenant } from '@/types/abrechnung-versand';

/** Default date of an increase: 1 January of the year after the billing period */
export function defaultErhoehungAbDatum(enddatum: string | null | undefined): string {
  const year = Number((enddatum || '').slice(0, 4));
  return `${(Number.isFinite(year) && year > 0 ? year : new Date().getFullYear()) + 1}-01-01`;
}

/** Default amount of an increase: the Abrechnung's recommendation, else the current prepayment */
export function defaultErhoehungBetrag(tenant: AbrechnungVersandTenant): number {
  return tenant.recommendedMonthlyPrepayment ?? tenant.currentMonthlyPrepayment;
}

interface VermieterContext {
  name: string | null;
  vorname: string | null;
  nachname: string | null;
  adresse: string | null;
}

/** The context for one tenant's mail; the increase only when it is switched on */
export function buildTenantMailContext(
  tenant: AbrechnungVersandTenant,
  row: AbrechnungVersandRowState | undefined,
  abrechnung: { startdatum: string; enddatum: string },
  vermieter: VermieterContext
): MailTemplateContext {
  const erhoehung = row?.erhoehung?.aktiv ? { neuerBetrag: row.erhoehung.betrag, abDatum: row.erhoehung.abDatum } : null;
  return {
    mieter: { name: tenant.name, email: tenant.email },
    wohnung: { bezeichnung: tenant.apartmentName },
    vermieter,
    abrechnung: { startdatum: abrechnung.startdatum, enddatum: abrechnung.enddatum, ergebnis: tenant.finalSettlement },
    vorauszahlung: { alterBetrag: tenant.currentMonthlyPrepayment, erhoehung },
  };
}

export function renderTenantMail(template: Template, context: MailTemplateContext) {
  return {
    subject: template.titel,
    body: renderTemplateText(template.inhalt, context, { vorauszahlungSatz: template.vorauszahlung_satz as JSONContent | null | undefined }),
  };
}

function SettlementAmount({ value }: { value: number }) {
  const isNachzahlung = value >= 0;
  return (
    <span className={cn('tabular-nums font-medium', isNachzahlung ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400')}>
      {isNachzahlung ? 'Nachzahlung' : 'Guthaben'} {formatCurrency(Math.abs(value))}
    </span>
  );
}

function TemplateSelect({
  templates,
  value,
  onChange,
  id,
  ariaLabel,
}: {
  templates: Template[];
  value: string | undefined;
  onChange: (templateId: string) => void;
  id?: string;
  ariaLabel: string;
}) {
  const abrechnungTemplates = templates.filter(t => t.kategorie === BETRIEBSKOSTENABRECHNUNG_CATEGORY);
  const mailTemplates = templates.filter(t => t.kategorie !== BETRIEBSKOSTENABRECHNUNG_CATEGORY);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={ariaLabel} className="w-full sm:w-[320px]">
        <SelectValue placeholder="Vorlage wählen" />
      </SelectTrigger>
      <SelectContent>
        {abrechnungTemplates.length > 0 && (
          <SelectGroup>
            <SelectLabel>Betriebskostenabrechnung</SelectLabel>
            {abrechnungTemplates.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.titel}</SelectItem>
            ))}
          </SelectGroup>
        )}
        {mailTemplates.length > 0 && (
          <SelectGroup>
            <SelectLabel>E-Mail</SelectLabel>
            {mailTemplates.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.titel}</SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}

interface TenantRowProps {
  tenant: AbrechnungVersandTenant;
  row: AbrechnungVersandRowState | undefined;
  templates: Template[];
  headerTemplateId: string | undefined;
  abrechnung: { startdatum: string; enddatum: string };
  vermieter: VermieterContext;
  isOpening: boolean;
  onUpdateRow: (tenantId: string, patch: Partial<AbrechnungVersandRowState>) => void;
  onOpenMail: (tenant: AbrechnungVersandTenant, template: Template) => void;
  onCopyText: (text: string) => void;
}

const TenantRow = memo(function TenantRow({
  tenant,
  row,
  templates,
  headerTemplateId,
  abrechnung,
  vermieter,
  isOpening,
  onUpdateRow,
  onOpenMail,
  onCopyText,
}: TenantRowProps) {
  const templateId = row?.templateId ?? headerTemplateId;
  const template = templates.find(t => t.id === templateId);
  const hasOverride = !!row?.templateId && row.templateId !== headerTemplateId;
  const erhoehung = row?.erhoehung;
  const erhoehungAktiv = !!erhoehung?.aktiv;
  const switchId = `erhoehung-${tenant.tenantId}`;

  const setErhoehung = (patch: Partial<NonNullable<AbrechnungVersandRowState['erhoehung']>>) => {
    const base = erhoehung ?? {
      aktiv: false,
      betrag: defaultErhoehungBetrag(tenant),
      abDatum: defaultErhoehungAbDatum(abrechnung.enddatum),
    };
    // A changed increase has not been saved yet
    onUpdateRow(tenant.tenantId, { erhoehung: { ...base, ...patch }, uebernommen: false });
  };

  return (
    <AccordionItem value={tenant.tenantId} className="border rounded-xl px-3 sm:px-4 bg-card">
      <AccordionTrigger className="py-3 hover:no-underline gap-3">
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-left min-w-0">
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{tenant.name}</div>
            <div className="text-xs text-muted-foreground truncate">{tenant.apartmentName || 'Ohne Wohnung'}</div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <SettlementAmount value={tenant.finalSettlement} />
            {hasOverride && <Badge variant="outline" className="text-xs">Andere Vorlage</Badge>}
            {erhoehungAktiv && (
              <Badge variant="secondary" className="text-xs gap-1">
                <TrendingUp className="h-3 w-3" /> Erhöhung
              </Badge>
            )}
            {row?.mailGeoeffnet && (
              <Badge variant="outline" className="text-xs gap-1 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" /> Mail geöffnet
              </Badge>
            )}
            {!tenant.email && (
              <Badge variant="outline" className="text-xs gap-1 text-amber-700 dark:text-amber-400">
                <MailX className="h-3 w-3" /> Keine E-Mail
              </Badge>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`vorlage-${tenant.tenantId}`}>Vorlage</Label>
          <TemplateSelect
            id={`vorlage-${tenant.tenantId}`}
            ariaLabel={`Vorlage für ${tenant.name}`}
            templates={templates}
            value={templateId}
            onChange={id => onUpdateRow(tenant.tenantId, { templateId: id === headerTemplateId ? undefined : id })}
          />
        </div>

        <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={switchId} className="flex items-center gap-2 cursor-pointer">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Vorauszahlung anpassen
            </Label>
            <Switch id={switchId} checked={erhoehungAktiv} onCheckedChange={checked => setErhoehung({ aktiv: checked })} />
          </div>
          {erhoehungAktiv && erhoehung && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`betrag-${tenant.tenantId}`}>Neue monatliche Vorauszahlung (€)</Label>
                <NumberInput
                  id={`betrag-${tenant.tenantId}`}
                  inputMode="decimal"
                  value={erhoehung.betrag}
                  onChange={e => {
                    const value = Number(e.target.value);
                    setErhoehung({ betrag: Number.isFinite(value) ? value : 0 });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`ab-${tenant.tenantId}`}>Gültig ab</Label>
                <DatePicker
                  id={`ab-${tenant.tenantId}`}
                  value={erhoehung.abDatum}
                  showClearButton={false}
                  onChange={date => date && setErhoehung({ abDatum: formatLocalDateToIso(date) })}
                />
              </div>
              <p className="sm:col-span-2 text-sm text-muted-foreground">
                Bisher <span className="tabular-nums">{formatCurrency(tenant.currentMonthlyPrepayment)}</span>
                {' → '}neu <span className="tabular-nums font-medium text-foreground">{formatCurrency(erhoehung.betrag)}</span> monatlich
                {' '}ab {isoToGermanDate(erhoehung.abDatum)}
                {tenant.recommendedMonthlyPrepayment != null && (
                  <span className="block text-xs">Empfehlung der Abrechnung: {formatCurrency(tenant.recommendedMonthlyPrepayment)}</span>
                )}
              </p>
            </div>
          )}
        </div>

        {template ? (
          <TenantMailPreview
            tenant={tenant}
            row={row}
            template={template}
            abrechnung={abrechnung}
            vermieter={vermieter}
            isOpening={isOpening}
            onOpenMail={onOpenMail}
            onCopyText={onCopyText}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Bitte eine Vorlage wählen.</p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
});

function TenantMailPreview({
  tenant,
  row,
  template,
  abrechnung,
  vermieter,
  isOpening,
  onOpenMail,
  onCopyText,
}: Pick<TenantRowProps, 'tenant' | 'row' | 'abrechnung' | 'vermieter' | 'isOpening' | 'onOpenMail' | 'onCopyText'> & { template: Template }) {
  // Same function as the mail itself, so the preview shows exactly what arrives in the mail program
  const mail = useMemo(
    () => renderTenantMail(template, buildTenantMailContext(tenant, row, abrechnung, vermieter)),
    [template, tenant, row, abrechnung, vermieter]
  );

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="text-sm font-medium">Vorschau</div>
        <div className="rounded-lg border bg-background">
          <div className="border-b px-3 py-2 text-xs text-muted-foreground space-y-0.5">
            <div className="truncate">An: {tenant.email || '—'}</div>
            <div className="truncate">Betreff: {mail.subject}</div>
          </div>
          <pre className="px-3 py-2 max-h-64 overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere] font-sans text-sm text-foreground">
            {mail.body || <span className="text-muted-foreground">Die Vorlage hat keinen Text.</span>}
          </pre>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
        {tenant.email ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Paperclip className="h-3 w-3 shrink-0" /> Das PDF wird heruntergeladen und muss in der Mail angehängt werden.
          </p>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" /> Für diesen Mieter ist keine E-Mail-Adresse hinterlegt. Bitte im Mieter ergänzen.
          </p>
        )}
        <div className="flex gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onCopyText(mail.body)}>
            <Copy className="h-4 w-4 mr-1.5" /> Text kopieren
          </Button>
          <Button type="button" size="sm" disabled={!tenant.email || isOpening} onClick={() => onOpenMail(tenant, template)}>
            {isOpening ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Mail className="h-4 w-4 mr-1.5" />}
            Mail öffnen
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AbrechnungVersandModal() {
  const {
    isAbrechnungVersandModalOpen,
    abrechnungVersandData,
    abrechnungVersandHeaderTemplateId,
    abrechnungVersandRows,
    abrechnungVersandExpandedIds,
    isAbrechnungVersandModalDirty,
    closeAbrechnungVersandModal,
    setAbrechnungVersandHeaderTemplateId,
    updateAbrechnungVersandRow,
    setAbrechnungVersandExpandedIds,
    openVorauszahlungUebernehmenModal,
    openTemplatesModal,
    isTemplatesModalOpen,
  } = useModalStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const { templates: allTemplates, loading, error, refreshTemplates } = useTemplates();
  const [billingAddress, setBillingAddress] = useState<BillingAddress>(null);
  const [openingTenantId, setOpeningTenantId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCustomerBillingAddress().then(address => {
      if (!cancelled) setBillingAddress(address);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Templates created or changed in the templates manager (opened from here) show up once it closes
  const templatesManagerWasOpen = useRef(false);
  useEffect(() => {
    if (isTemplatesModalOpen) {
      templatesManagerWasOpen.current = true;
    } else if (templatesManagerWasOpen.current) {
      templatesManagerWasOpen.current = false;
      refreshTemplates();
    }
  }, [isTemplatesModalOpen, refreshTemplates]);

  const templates = useMemo(
    () =>
      allTemplates
        .filter(t => MAIL_TEMPLATE_CATEGORIES.includes(t.kategorie))
        .sort((a, b) => a.titel.localeCompare(b.titel, 'de')),
    [allTemplates]
  );
  // The header falls back to the first Betriebskostenabrechnung template, then to any mail template
  const headerTemplateId =
    (abrechnungVersandHeaderTemplateId && templates.some(t => t.id === abrechnungVersandHeaderTemplateId)
      ? abrechnungVersandHeaderTemplateId
      : undefined) ??
    (templates.find(t => t.kategorie === BETRIEBSKOSTENABRECHNUNG_CATEGORY) ?? templates[0])?.id;

  const nebenkostenItem = abrechnungVersandData?.nebenkostenItem;
  const abrechnung = useMemo(
    () => ({ startdatum: nebenkostenItem?.startdatum || '', enddatum: nebenkostenItem?.enddatum || '' }),
    [nebenkostenItem?.startdatum, nebenkostenItem?.enddatum]
  );

  const firstName: string | null = user?.user_metadata?.first_name || null;
  const lastName: string | null = user?.user_metadata?.last_name || null;
  const ownerName = abrechnungVersandData?.ownerName || null;
  const ownerAddress = abrechnungVersandData?.ownerAddress || null;
  const vermieter = useMemo<VermieterContext>(
    () => ({
      vorname: firstName,
      nachname: lastName,
      name: [firstName, lastName].filter(Boolean).join(' ') || ownerName,
      // Same sender address as the PDF: the billing address, else the address the Abrechnung was opened with
      adresse: formatBillingAddress(billingAddress) || ownerAddress,
    }),
    [firstName, lastName, ownerName, billingAddress, ownerAddress]
  );

  const tenants = abrechnungVersandData?.tenants ?? [];
  const hasActiveErhoehung = Object.values(abrechnungVersandRows).some(row => row.erhoehung?.aktiv);

  const handleCopyText = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: 'Text kopiert', description: 'Sie können ihn jetzt in Ihre Mail einfügen.' });
      } catch {
        toast({ title: 'Kopieren nicht möglich', description: 'Bitte den Text in der Vorschau markieren und kopieren.', variant: 'destructive' });
      }
    },
    [toast]
  );

  const handleOpenMail = useCallback(
    async (tenant: AbrechnungVersandTenant, template: Template) => {
      if (!tenant.email || !abrechnungVersandData) return;
      setOpeningTenantId(tenant.tenantId);
      try {
        const { blob, filename } = await generateTenantSettlementPdf({
          tenantData: tenant.tenantData,
          nebenkostenItem: abrechnungVersandData.nebenkostenItem,
          ownerName: abrechnungVersandData.ownerName,
          ownerAddress: abrechnungVersandData.ownerAddress,
          billingAddress,
        });
        downloadBlob(blob, filename);
      } catch (pdfError) {
        console.error('Abrechnung-Versand: PDF generation failed', pdfError);
        toast({
          title: 'PDF konnte nicht erstellt werden',
          description: 'Die Mail wurde nicht geöffnet. Bitte versuchen Sie es erneut.',
          variant: 'destructive',
        });
        setOpeningTenantId(null);
        return;
      }

      // Read the row at click time, so the mail matches the increase shown right now
      const row = useModalStore.getState().abrechnungVersandRows[tenant.tenantId];
      const mail = renderTenantMail(template, buildTenantMailContext(tenant, row, abrechnung, vermieter));
      const url = buildMailtoUrl({ to: tenant.email, subject: mail.subject, body: mail.body });
      openMailto(url);
      updateAbrechnungVersandRow(tenant.tenantId, { mailGeoeffnet: true });
      setOpeningTenantId(null);

      toast({
        title: 'PDF bitte anhängen',
        description: isMailtoTooLong(url)
          ? 'Das PDF liegt im Download-Ordner. Der Text ist lang; falls er im Mail-Programm gekürzt ist, nutzen Sie „Text kopieren“.'
          : 'Das PDF liegt im Download-Ordner. Bitte hängen Sie es an die Mail an.',
        duration: 8000,
      });
    },
    [abrechnungVersandData, abrechnung, billingAddress, vermieter, toast, updateAbrechnungVersandRow]
  );

  const handleAttemptClose = () => closeAbrechnungVersandModal();

  return (
    <Dialog open={isAbrechnungVersandModalOpen} onOpenChange={open => !open && handleAttemptClose()}>
      <DialogContent
        className="w-full max-w-full h-dvh sm:h-auto sm:max-h-[90vh] sm:max-w-3xl rounded-none sm:rounded-2xl flex flex-col gap-0 p-0"
        isDirty={isAbrechnungVersandModalDirty}
        onAttemptClose={handleAttemptClose}
      >
        <DialogHeader className="shrink-0 px-4 sm:px-6 pt-6 pb-4 border-b text-left">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Abrechnung versenden
          </DialogTitle>
          <DialogDescription>
            {abrechnung.startdatum && abrechnung.enddatum
              ? `Abrechnungszeitraum ${isoToGermanDate(abrechnung.startdatum)} – ${isoToGermanDate(abrechnung.enddatum)} · `
              : ''}
            {tenants.length} Mieter. Je Mieter öffnet sich eine Mail in Ihrem Mail-Programm.
          </DialogDescription>
          <div className="pt-3 flex flex-col sm:flex-row sm:items-center gap-2">
            <Label htmlFor="versand-vorlage" className="shrink-0">Vorlage für alle</Label>
            {loading ? (
              <Skeleton className="h-10 w-full sm:w-[320px]" />
            ) : (
              <TemplateSelect
                id="versand-vorlage"
                ariaLabel="Vorlage für alle Mieter"
                templates={templates}
                value={headerTemplateId}
                onChange={setAbrechnungVersandHeaderTemplateId}
              />
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
          {error ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> Die Vorlagen konnten nicht geladen werden: {error}
            </div>
          ) : !loading && templates.length === 0 ? (
            <div className="flex flex-col items-center text-center py-10 gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground max-w-sm">
                Es gibt noch keine Mail-Vorlage. Legen Sie eine Vorlage vom Typ „Betriebskostenabrechnung“ an, um die Abrechnung zu versenden.
              </p>
              <Button type="button" variant="outline" onClick={() => openTemplatesModal(BETRIEBSKOSTENABRECHNUNG_CATEGORY)}>
                Vorlagen öffnen
              </Button>
            </div>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Für diese Abrechnung gibt es keine Mieter.</p>
          ) : (
            <Accordion
              type="multiple"
              value={abrechnungVersandExpandedIds}
              onValueChange={setAbrechnungVersandExpandedIds}
              className="space-y-2"
            >
              {tenants.map(tenant => (
                <TenantRow
                  key={tenant.tenantId}
                  tenant={tenant}
                  row={abrechnungVersandRows[tenant.tenantId]}
                  templates={templates}
                  headerTemplateId={headerTemplateId}
                  abrechnung={abrechnung}
                  vermieter={vermieter}
                  isOpening={openingTenantId === tenant.tenantId}
                  onUpdateRow={updateAbrechnungVersandRow}
                  onOpenMail={handleOpenMail}
                  onCopyText={handleCopyText}
                />
              ))}
            </Accordion>
          )}
        </div>

        <DialogFooter className="shrink-0 px-4 sm:px-6 py-4 border-t gap-2 sm:gap-2">
          {hasActiveErhoehung ? (
            <>
              <Button type="button" variant="outline" onClick={handleAttemptClose}>
                Fertig
              </Button>
              <Button type="button" onClick={openVorauszahlungUebernehmenModal}>
                Fertig und Werte übernehmen
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => closeAbrechnungVersandModal({ force: true })}>
              Fertig
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
