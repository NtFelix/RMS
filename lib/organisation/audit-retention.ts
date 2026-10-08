/**
 * Aufbewahrung des Audit-Logs (GH-25).
 *
 * Ein Cron-Job der Datenbank (cleanup-audit-log) setzt alte_daten und neue_daten von Einträgen, die älter als
 * 30 Tage sind, auf NULL. Die Metadaten (Tabelle, Datensatz, Aktion, Person, Zeitpunkt) bleiben länger erhalten.
 * Die Oberfläche kennzeichnet solche Einträge, damit ein leerer Änderungsbereich nicht als "keine Änderung" gelesen wird.
 */

/** Tage, nach denen die Feldwerte (Payloads) eines Audit-Log-Eintrags entfernt werden. */
export const AUDIT_PAYLOAD_RETENTION_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Ob die Feldwerte eines Eintrags entfernt wurden: beide Payloads fehlen und der Eintrag ist älter als die Aufbewahrungsfrist.
 * Jüngere Einträge ohne Payload (z. B. reine Statuswechsel) gelten nicht als entfernt.
 */
export function isAuditPayloadPurged(
  entry: { alte_daten: unknown; neue_daten: unknown; geaendert_am: string },
  now: Date = new Date()
): boolean {
  if (entry.alte_daten != null || entry.neue_daten != null) return false;

  const geaendertAm = new Date(entry.geaendert_am).getTime();
  if (Number.isNaN(geaendertAm)) return false;

  return now.getTime() - geaendertAm > AUDIT_PAYLOAD_RETENTION_DAYS * MS_PER_DAY;
}
