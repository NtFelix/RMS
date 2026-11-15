/**
 * Shared class names of the tenancy section (GH-17). They are the same as in the tenant dialog
 * (`components/tenants/tenant-edit-modal.tsx`), so the section looks like the rest of the dialog.
 */

/** One row: label column (140px) and value column on desktop, stacked on mobile. */
export const ZEILE = "sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-1 sm:space-y-0";

/** Row whose value is taller than one line (label stays at the top). */
export const ZEILE_OBEN = "sm:grid sm:grid-cols-[140px_1fr] sm:items-start sm:gap-4 space-y-1 sm:space-y-0";

/** Borderless inline text or number input. */
export const FELD =
  "bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/10 focus:bg-muted/20 px-2 py-1 -mx-2 rounded-lg transition-all h-auto text-sm focus-visible:scale-100 hover:border-transparent focus:border-transparent";

/** Borderless inline date picker. */
export const DATUM =
  "bg-transparent border-none shadow-none hover:bg-muted/10 focus:bg-muted/20 px-2 py-1 -mx-2 rounded-lg transition-all h-auto text-sm focus-visible:scale-100";

/** Section heading (small, uppercase), as "Kontaktdaten" and "Nebenkosten". */
export const UEBERSCHRIFT = "flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest";

/** Card that holds a list, as the Nebenkosten card. */
export const KARTE = "bg-muted/20 rounded-xl border border-border/50";

/** Read-only value in a row. */
export const WERT = "text-sm py-1";

/** Error text below a field. */
export const FEHLERTEXT = "text-xs text-red-500";
