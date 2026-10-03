import { AUDIT_MASKED_PLACEHOLDER, isMaskedAuditValue } from './audit-masking';

describe('isMaskedAuditValue', () => {
  it('erkennt den Platzhalter für Kontoinhaber/Empfänger', () => {
    expect(isMaskedAuditValue('kontoinhaber', AUDIT_MASKED_PLACEHOLDER)).toBe(true);
    expect(isMaskedAuditValue('empfaenger', '[maskiert]')).toBe(true);
  });

  it('erkennt eine maskierte IBAN (Sternchen plus letzte Zeichen) nur im Feld iban', () => {
    expect(isMaskedAuditValue('iban', '******************1234')).toBe(true);
    expect(isMaskedAuditValue('iban', '****')).toBe(true);
    expect(isMaskedAuditValue('bank', '******1234')).toBe(false);
  });

  it('hält unmaskierte und nicht-textliche Werte nicht für maskiert', () => {
    expect(isMaskedAuditValue('iban', 'XX00TESTIBAN')).toBe(false);
    expect(isMaskedAuditValue('kontoinhaber', 'Beispiel')).toBe(false);
    expect(isMaskedAuditValue('iban', null)).toBe(false);
    expect(isMaskedAuditValue('iban', 1234)).toBe(false);
    expect(isMaskedAuditValue('iban', undefined)).toBe(false);
  });
});
