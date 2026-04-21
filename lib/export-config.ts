export const ALLOWED_EXPORT_SCHEMA: Record<string, string[]> = {
  Aufgaben: ['ist_erledigt', 'name', 'beschreibung', 'erstellungsdatum', 'aenderungsdatum'],
  Finanzen: ['name', 'datum', 'betrag', 'ist_einnahmen', 'notiz'],
  Haeuser: ['ort', 'name', 'strasse', 'groesse'],
  Mieter: ['name', 'einzug', 'auszug', 'email', 'telefonnummer', 'notiz', 'nebenkosten', 'nebenkosten_datum'],
  Nebenkosten: ['jahr', 'nebenkostenart', 'betrag', 'berechnungsart', 'wasserkosten', 'wasserverbrauch'],
  Rechnungen: ['name', 'betrag'],
  Zaehler_Ablesungen: ['ablese_datum', 'zaehlerstand', 'verbrauch', 'kommentar'],
  Wohnungen: ['groesse', 'name', 'miete'],
};

export type ExportConfig = {
  mode: 'all' | 'tenants_only';
  selectedColumns: Record<string, string[]>;
};
