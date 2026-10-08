/**
 * Maskierte Werte im Audit-Log.
 *
 * Die Datenbank maskiert beim Protokollieren der Kautionstabellen personenbezogene bzw. sensible Felder
 * (IBAN: nur die letzten vier Zeichen bleiben sichtbar, Kontoinhaber/Empfänger: Platzhalter).
 * Die Oberfläche stellt solche Werte als maskiert dar, damit sie nicht für Originalwerte gehalten werden.
 */

/** Platzhalter für vollständig maskierte Felder (Kontoinhaber, Empfänger). */
export const AUDIT_MASKED_PLACEHOLDER = "[maskiert]";

/** Ob der Wert eines Audit-Felds von der Datenbank maskiert wurde. */
export function isMaskedAuditValue(key: string, value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value === AUDIT_MASKED_PLACEHOLDER) return true;
  // IBAN: Sternchen gefolgt von den letzten (bis zu vier) Zeichen.
  return key === "iban" && /^\*+[A-Z0-9]{0,4}$/.test(value);
}
