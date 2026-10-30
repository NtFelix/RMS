import { BLOCKED_AGENT_API_MODULES, findBlockedModules } from './blocked-modules';

describe('BLOCKED_AGENT_API_MODULES', () => {
  it('sperrt genau das Modul kautionen', () => {
    expect([...BLOCKED_AGENT_API_MODULES]).toEqual(['kautionen']);
  });
});

describe('findBlockedModules', () => {
  it('findet kautionen im Agenten-Format (Aktionsliste je Modul)', () => {
    expect(findBlockedModules({ module: { mieter: ['ansehen'], kautionen: ['ansehen'] } })).toEqual(['kautionen']);
  });

  it('findet kautionen im API-Key-Format (Aktions-Flags je Modul)', () => {
    expect(findBlockedModules({ module: { kautionen: { ansehen: true } }, haeuser: null })).toEqual(['kautionen']);
  });

  it('findet kautionen auch mit leerer Aktionsliste (Schlüssel allein genügt)', () => {
    expect(findBlockedModules({ module: { kautionen: [] } })).toEqual(['kautionen']);
  });

  it('vergleicht ohne Beachtung von Groß-/Kleinschreibung und Leerraum', () => {
    expect(findBlockedModules({ module: { ' Kautionen ': ['ansehen'], KAUTIONEN: ['ansehen'] } })).toEqual([
      ' Kautionen ',
      'KAUTIONEN',
    ]);
  });

  it('findet kautionen, wenn module eine Liste von Modulnamen ist', () => {
    expect(findBlockedModules({ module: ['mieter', 'kautionen'] })).toEqual(['kautionen']);
  });

  it('liefert leer ohne gesperrtes Modul', () => {
    expect(findBlockedModules({ module: { mieter: ['ansehen'], haeuser: { ansehen: true } } })).toEqual([]);
  });

  it('hält Module mit ähnlichem Namen nicht für gesperrt', () => {
    expect(findBlockedModules({ module: { kautionen_extra: ['ansehen'], 'kautionen-konto': ['ansehen'] } })).toEqual([]);
  });

  it.each([undefined, null, 'kautionen', 42, [], ['kautionen'], {}, { module: null }, { module: 'kautionen' }, { module: 5 }])(
    'liefert leer bei unbekannter Struktur (%p)',
    (input) => {
      expect(findBlockedModules(input)).toEqual([]);
    }
  );
});
