import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import JSZip from 'jszip';
import Papa from 'papaparse';

// Define the tables and columns to export
// Exclude foreign keys and sensitive data
const tablesToExport = {
  Haeuser: ['id', 'name', 'strasse', 'ort', 'plz', 'land', 'baujahr', 'modernisierungsjahr', 'heizungsart', 'energietraeger', 'energieausweis_typ', 'energieausweis_datum', 'energieausweis_gueltigkeit', 'endenergiebedarf', 'primaerenergiebedarf', 'energieeffizienzklasse', 'wohnflaeche_gesamt', 'grundstuecksflaeche', 'anzahl_wohneinheiten', 'anzahl_stellplaetze', 'kaufpreis', 'kaufdatum', 'notarkosten', 'maklerkosten', 'grundbuchkosten', 'grunderwerbssteuer', 'sonstige_kaufnebenkosten', 'darlehenssumme', 'tilgungsrate', 'zinssatz', 'restschuld', 'bankname', 'bemerkungen'],
  Wohnungen: ['id', 'name', 'nummer', 'etage', 'groesse', 'zimmeranzahl', 'balkon_terrasse', 'kellerabteil', 'stellplatz', 'kaltmiete', 'nebenkosten_wohnung', 'heizkosten_wohnung', 'stromkosten_wohnung', 'wasseranschluss', 'heizungsart_wohnung', 'bodenbelag', 'kueche', 'bad_ausstattung', 'bemerkungen_wohnung', 'erstellungsdatum', 'letzte_aenderung'],
  Mieter: ['id', 'anrede', 'vorname', 'nachname', 'geburtsdatum', 'email', 'telefon_mobil', 'telefon_festnetz', 'strasse_mieter', 'plz_mieter', 'ort_mieter', 'land_mieter', 'beruf', 'arbeitgeber', 'einkommen', 'familienstand', 'anzahl_kinder', 'haustiere', 'rauchen', 'schufa_score', 'schufa_datum', 'selbstauskunft_datum', 'vorvermieter_name', 'vorvermieter_kontakt', 'mietvertrag_beginn', 'mietvertrag_ende', 'kaution_betrag', 'kaution_datum', 'bemerkungen_mieter', 'erstellungsdatum_mieter', 'letzte_aenderung_mieter'],
  Finanzen: ['id', 'name', 'datum', 'betrag', 'ist_einnahmen', 'kategorie', 'beschreibung', 'beleg_url', 'erstellungsdatum_finanz', 'letzte_aenderung_finanz'],
  Nebenkosten: ['id', 'jahr', 'nebenkostenart', 'betrag', 'berechnungsart', 'wasserkosten', 'wasserverbrauch', 'gesamtkosten_nebenkosten', 'abrechnungsdatum', 'zahlungsfrist', 'bemerkungen_nebenkosten', 'erstellungsdatum_nebenkosten', 'letzte_aenderung_nebenkosten'],
  Aufgaben: ['id', 'name', 'beschreibung', 'faelligkeitsdatum', 'prioritaet', 'status', 'erinnerungsdatum', 'erstellungsdatum_aufgabe', 'letzte_aenderung_aufgabe'],
  // Add other tables and their respective columns as needed
  // Example:
  // Dokumente: ['id', 'name', 'typ', 'datei_url', 'upload_datum', 'beschreibung_dokument', 'erstellungsdatum_dokument', 'letzte_aenderung_dokument'],
  // Vertraege: ['id', 'name', 'vertragsart', 'vertragspartner', 'beginndatum', 'enddatum', 'kuendigungsfrist', 'monatliche_kosten', 'bemerkungen_vertrag', 'erstellungsdatum_vertrag', 'letzte_aenderung_vertrag'],
};

export async function GET() {
  try {
    const supabase = await createClient();
    const zip = new JSZip();

    for (const [tableName, columns] of Object.entries(tablesToExport)) {
      const { data, error } = await supabase.from(tableName).select(columns.join(','));

      if (error) {
        console.error(`Error fetching data for table ${tableName}:`, error);
        // Optionally skip this table or return an error response
        continue;
      }

      if (data && data.length > 0) {
        const csv = Papa.unparse(data);
        zip.file(`${tableName}.csv`, csv);
      } else {
        // Create an empty CSV with headers if no data
        const csv = Papa.unparse([Object.fromEntries(columns.map(col => [col, '']))]);
        zip.file(`${tableName}.csv`, csv);
      }
    }

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipContent, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="datenexport.zip"`,
        'Content-Type': 'application/zip',
      },
    });
  } catch (error) {
    console.error('Error during data export:', error);
    return new NextResponse(JSON.stringify({ error: 'Fehler beim Exportieren der Daten.', details: (error as Error).message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
