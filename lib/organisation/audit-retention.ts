/**
 * Aufbewahrung des Audit-Logs (GH-25): Die Datenbank setzt alte_daten und neue_daten von Einträgen nach 30 Tagen auf NULL,
 * die Metadaten bleiben länger erhalten. Die Oberfläche kennzeichnet solche Einträge, damit ein leerer Änderungsbereich
 * nicht als "keine Änderung" gelesen wird.
 */

/**
 * Muss zur Frist der Datenbank passen (Cron-Job cleanup-audit-log). Wird die Aufbewahrung planabhängig (Phase 2),
 * sollte stattdessen get_audit_log_details ein Kennzeichen liefern, und diese Datei entfällt.
 */
export const AUDIT_PAYLOAD_RETENTION_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Ob die Feldwerte eines Eintrags entfernt wurden: beide Payloads fehlen und der Eintrag ist älter als die Aufbewahrungsfrist.
 * Jüngere Einträge ohne Payload (z. B. reine Statuswechsel) gelten nicht als entfernt. Ein ungültiger Zeitstempel ergibt false.
 */
export function isAuditPayloadPurged(
  entry: { alte_daten: unknown; neue_daten: unknown; geaendert_am: string },
  now: Date = new Date()
): boolean {
  if (entry.alte_daten != null || entry.neue_daten != null) return false;

  return now.getTime() - new Date(entry.geaendert_am).getTime() > AUDIT_PAYLOAD_RETENTION_DAYS * MS_PER_DAY;
}
