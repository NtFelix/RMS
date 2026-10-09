import { AUDIT_PAYLOAD_RETENTION_DAYS, isAuditPayloadPurged } from './audit-retention';

const NOW = new Date('2026-10-08T12:00:00.000Z');

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe('isAuditPayloadPurged', () => {
  it('erkennt einen Eintrag ohne Payloads, der älter als die Aufbewahrungsfrist ist, als entfernt', () => {
    const entry = { alte_daten: null, neue_daten: null, geaendert_am: daysAgo(AUDIT_PAYLOAD_RETENTION_DAYS + 1) };
    expect(isAuditPayloadPurged(entry, NOW)).toBe(true);
  });

  it('behandelt einen Eintrag innerhalb der Aufbewahrungsfrist nicht als entfernt, auch ohne Payloads', () => {
    expect(isAuditPayloadPurged({ alte_daten: null, neue_daten: null, geaendert_am: daysAgo(10) }, NOW)).toBe(false);
    expect(isAuditPayloadPurged({ alte_daten: null, neue_daten: null, geaendert_am: daysAgo(AUDIT_PAYLOAD_RETENTION_DAYS) }, NOW)).toBe(false);
  });

  it('behandelt einen alten Eintrag mit mindestens einem Payload nicht als entfernt', () => {
    const alt = daysAgo(60);
    expect(isAuditPayloadPurged({ alte_daten: { name: 'alt' }, neue_daten: null, geaendert_am: alt }, NOW)).toBe(false);
    expect(isAuditPayloadPurged({ alte_daten: null, neue_daten: { name: 'neu' }, geaendert_am: alt }, NOW)).toBe(false);
    expect(isAuditPayloadPurged({ alte_daten: {}, neue_daten: {}, geaendert_am: alt }, NOW)).toBe(false);
  });

  it('wertet einen ungültigen Zeitstempel nicht als entfernt', () => {
    expect(isAuditPayloadPurged({ alte_daten: null, neue_daten: null, geaendert_am: 'kein-datum' }, NOW)).toBe(false);
  });
});
