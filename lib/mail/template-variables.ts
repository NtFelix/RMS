/**
 * Turns a TipTap mail template into the plain text that lands in the mail program.
 *
 * The one implementation of the template variables: the tenant mail dialog and the Abrechnung-Versand use it
 * for both the preview and the mail body, so what the preview shows is exactly what the mail contains.
 */
import type { JSONContent } from '@tiptap/react';
import { GERMAN_MONTHS } from '@/lib/constants';
import { getMentionVariableById, VORAUSZAHLUNG_SATZ_VARIABLE_ID } from '@/lib/template-constants';
import { isoToGermanDate } from '@/utils/date-calculations';
import { formatCurrency } from '@/utils/format';

export interface MailTemplateContext {
  mieter?: { name?: string | null; email?: string | null; telefon?: string | null };
  wohnung?: { bezeichnung?: string | null };
  vermieter?: { name?: string | null; vorname?: string | null; nachname?: string | null; adresse?: string | null };
  abrechnung?: {
    /** ISO dates (YYYY-MM-DD) of the billing period */
    startdatum: string;
    enddatum: string;
    /** Tenant result: positive = Nachzahlung, negative = Guthaben */
    ergebnis: number;
  };
  vorauszahlung?: {
    /** Current monthly prepayment */
    alterBetrag?: number | null;
    /** Set only when an increase is announced; without it the Vorauszahlung sentence is left out */
    erhoehung?: { neuerBetrag: number; abDatum: string } | null;
  };
  /** Reference date for the datum.* variables (defaults to now) */
  heute?: Date;
}

export interface RenderTemplateOptions {
  /** TipTap JSON of the template's Vorauszahlung sentence, placed via @vorauszahlung.satz */
  vorauszahlungSatz?: JSONContent | null;
}

/** A resolved value: a string (possibly empty on purpose) or undefined when the context does not know it */
type Resolver = (ctx: MailTemplateContext) => string | null | undefined;

const presentOrUndefined = (value: string | null | undefined): string | undefined =>
  value && value.trim() ? value : undefined;

const fullName = (vorname?: string | null, nachname?: string | null) =>
  [vorname, nachname].filter(part => part && part.trim()).join(' ');

const RESOLVERS: Record<string, Resolver> = {
  'mieter.name': ctx => presentOrUndefined(ctx.mieter?.name),
  'mieter.email': ctx => presentOrUndefined(ctx.mieter?.email),
  'mieter.telefon': ctx => presentOrUndefined(ctx.mieter?.telefon),
  'wohnung.bezeichnung': ctx => presentOrUndefined(ctx.wohnung?.bezeichnung),
  'datum.heute': ctx => (ctx.heute ?? new Date()).toLocaleDateString('de-DE'),
  'datum.monat': ctx => GERMAN_MONTHS[(ctx.heute ?? new Date()).getMonth()],
  'datum.jahr': ctx => String((ctx.heute ?? new Date()).getFullYear()),
  'vermieter.name': ctx =>
    presentOrUndefined(ctx.vermieter?.name) ?? presentOrUndefined(fullName(ctx.vermieter?.vorname, ctx.vermieter?.nachname)),
  'vermieter.vorname': ctx => presentOrUndefined(ctx.vermieter?.vorname),
  'vermieter.nachname': ctx => presentOrUndefined(ctx.vermieter?.nachname),
  'vermieter.adresse': ctx => presentOrUndefined(ctx.vermieter?.adresse),
  'abrechnung.zeitraum': ctx =>
    ctx.abrechnung ? `${isoToGermanDate(ctx.abrechnung.startdatum)} – ${isoToGermanDate(ctx.abrechnung.enddatum)}` : undefined,
  // Exactly one of Nachzahlung and Guthaben is filled; the other one is empty on purpose
  'abrechnung.nachzahlung': ctx =>
    ctx.abrechnung ? (ctx.abrechnung.ergebnis > 0 ? formatCurrency(ctx.abrechnung.ergebnis) : '') : undefined,
  'abrechnung.guthaben': ctx =>
    ctx.abrechnung ? (ctx.abrechnung.ergebnis < 0 ? formatCurrency(Math.abs(ctx.abrechnung.ergebnis)) : '') : undefined,
  'vorauszahlung.alter_betrag': ctx =>
    ctx.vorauszahlung?.alterBetrag != null ? formatCurrency(ctx.vorauszahlung.alterBetrag) : undefined,
  // Without an announced increase these stay empty instead of showing a placeholder in the mail
  'vorauszahlung.neuer_betrag': ctx => {
    if (!ctx.vorauszahlung) return undefined;
    const erhoehung = ctx.vorauszahlung.erhoehung;
    return erhoehung ? formatCurrency(erhoehung.neuerBetrag) : '';
  },
  'vorauszahlung.ab_datum': ctx => {
    if (!ctx.vorauszahlung) return undefined;
    const erhoehung = ctx.vorauszahlung.erhoehung;
    return erhoehung ? isoToGermanDate(erhoehung.abDatum) : '';
  },
};

const placeholderFor = (node: JSONContent): string => {
  const id = node.attrs?.id as string | undefined;
  const label = (node.attrs?.label as string | undefined) || (id && getMentionVariableById(id)?.label) || id || 'Variable';
  return `[${label}]`;
};

interface RenderState {
  ctx: MailTemplateContext;
  satz: JSONContent | null | undefined;
  /** The sentence is rendered with the same renderer; it must never place itself again */
  insideSatz: boolean;
}

function renderSatz(state: RenderState): string {
  const erhoehung = state.ctx.vorauszahlung?.erhoehung;
  if (state.insideSatz || !erhoehung || !state.satz) return '';
  return renderBlocks(state.satz.content, { ...state, insideSatz: true }).join('\n');
}

function renderInline(nodes: JSONContent[] | undefined, state: RenderState): string {
  if (!Array.isArray(nodes)) return '';
  let removedVariable = false;
  const text = nodes
    .map(node => {
      switch (node.type) {
        case 'text':
          return node.text || '';
        case 'hardBreak':
          return '\n';
        case 'mention': {
          const id = node.attrs?.id as string | undefined;
          if (id === VORAUSZAHLUNG_SATZ_VARIABLE_ID) {
            const satz = renderSatz(state);
            if (!satz) removedVariable = true;
            return satz;
          }
          const resolver = id ? RESOLVERS[id] : undefined;
          const value = resolver ? resolver(state.ctx) : undefined;
          return value ?? placeholderFor(node);
        }
        default:
          return renderInline(node.content, state);
      }
    })
    .join('');
  // A dropped Vorauszahlung sentence must not leave a double space behind in the surrounding text
  return removedVariable ? text.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+([.,;:!?])/g, '$1') : text;
}

function renderListItems(items: JSONContent[] | undefined, state: RenderState, ordered: boolean, start = 1): string {
  if (!Array.isArray(items)) return '';
  return items
    .map(item => renderBlocks(item.content, state).join('\n'))
    .filter(text => text.trim())
    .map((text, index) => `${ordered ? `${start + index}.` : '-'} ${text.trim()}`)
    .join('\n');
}

function renderBlock(node: JSONContent, state: RenderState): string {
  switch (node.type) {
    case 'paragraph':
    case 'heading':
      return renderInline(node.content, state);
    case 'bulletList':
      return renderListItems(node.content, state, false);
    case 'orderedList':
      return renderListItems(node.content, state, true, Number(node.attrs?.start) || 1);
    case 'blockquote':
      return renderBlocks(node.content, state).join('\n');
    case 'horizontalRule':
      return '---';
    default:
      return node.content ? renderInline(node.content, state) : node.text || '';
  }
}

/** Renders each block and drops the empty ones, so a paragraph holding only a removed variable disappears entirely */
function renderBlocks(nodes: JSONContent[] | undefined, state: RenderState): string[] {
  if (!Array.isArray(nodes)) return [];
  return nodes.map(node => renderBlock(node, state).trim()).filter(Boolean);
}

/**
 * Plain mail text of a template: paragraphs separated by a blank line, list items one per line.
 *
 * `@vorauszahlung.satz` is replaced by the template's Vorauszahlung sentence when an increase is set. Without
 * an increase the variable is dropped; a paragraph that held nothing else disappears, other text in it stays.
 * Variables the context does not know become `[Label]`.
 */
export function renderTemplateText(
  inhalt: JSONContent | null | undefined,
  ctx: MailTemplateContext,
  options: RenderTemplateOptions = {}
): string {
  if (!inhalt?.content) return '';
  return renderBlocks(inhalt.content, { ctx, satz: options.vorauszahlungSatz, insideSatz: false }).join('\n\n');
}

/** Whether the template body places the Vorauszahlung sentence at all */
export function templateUsesVorauszahlungSatz(inhalt: JSONContent | null | undefined): boolean {
  const visit = (node: JSONContent | undefined): boolean =>
    !!node &&
    ((node.type === 'mention' && node.attrs?.id === VORAUSZAHLUNG_SATZ_VARIABLE_ID) ||
      (Array.isArray(node.content) && node.content.some(visit)));
  return visit(inhalt ?? undefined);
}
