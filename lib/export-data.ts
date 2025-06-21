import { Haus, Mieter, Finanzen, Wohnung, Nebenkosten, Aufgabe, Rechnung } from './data-fetching';

// Helper function to convert an array of objects to CSV
function convertToCSV(data: any[], columns: string[]): string {
  if (!data || data.length === 0) {
    return '';
  }
  const header = columns.join(',') + '\n';
  const rows = data.map(row => {
    return columns.map(col => {
      let cell = row[col];
      if (cell === null || cell === undefined) {
        cell = '';
      } else if (Array.isArray(cell)) {
        // Convert array to a string representation, e.g., "item1;item2"
        cell = `"${cell.join(';')}"`;
      } else if (typeof cell === 'string' && cell.includes(',')) {
        // Enclose string with comma in double quotes
        cell = `"${cell}"`;
      }
      return cell;
    }).join(',');
  }).join('\n');
  return header + rows;
}

// Define a type for the input data structure
export type AllExportData = {
  haeuser: Haus[];
  mieter: Mieter[];
  finanzen: Finanzen[];
  wohnungen: Wohnung[];
  nebenkosten: Nebenkosten[];
  aufgaben: Aufgabe[];
  rechnungen: Rechnung[];
};

export function processDataToCsv(allData: AllExportData): { [key: string]: string } {
  const csvData: { [key: string]: string } = {};

  if (allData.haeuser && allData.haeuser.length > 0) {
    const columns = ['ort', 'name', 'strasse', 'groesse'];
    csvData['haeuser.csv'] = convertToCSV(allData.haeuser, columns);
  }

  if (allData.mieter && allData.mieter.length > 0) {
    const columns = ['name', 'einzug', 'auszug', 'email', 'telefonnummer', 'notiz', 'nebenkosten', 'nebenkosten_datum'];
    // Ensure all selected columns exist on Mieter type, especially FKs that might have been removed if not populated.
    // For example, 'wohnung_id' is excluded in the original select.
    csvData['mieter.csv'] = convertToCSV(allData.mieter, columns);
  }

  if (allData.finanzen && allData.finanzen.length > 0) {
    const columns = ['name', 'datum', 'betrag', 'ist_einnahmen', 'notiz'];
    // 'wohnung_id' excluded
    csvData['finanzen.csv'] = convertToCSV(allData.finanzen, columns);
  }

  if (allData.wohnungen && allData.wohnungen.length > 0) {
    const columns = ['groesse', 'name', 'miete'];
    // 'haus_id' excluded
    csvData['wohnungen.csv'] = convertToCSV(allData.wohnungen, columns);
  }

  if (allData.nebenkosten && allData.nebenkosten.length > 0) {
    const columns = ['jahr', 'nebenkostenart', 'betrag', 'berechnungsart', 'wasserkosten'];
    // 'haeuser_id' excluded
    csvData['nebenkosten.csv'] = convertToCSV(allData.nebenkosten, columns);
  }

  if (allData.aufgaben && allData.aufgaben.length > 0) {
    const columns = ['ist_erledigt', 'name', 'beschreibung', 'erstellungsdatum', 'aenderungsdatum'];
    // 'user_id' excluded
    csvData['aufgaben.csv'] = convertToCSV(allData.aufgaben, columns);
  }

  if (allData.rechnungen && allData.rechnungen.length > 0) {
    const columns = ['name', 'betrag'];
    // 'nebenkosten_id', 'mieter_id' excluded
    csvData['rechnungen.csv'] = convertToCSV(allData.rechnungen, columns);
  }

  // Note: Wasserzaehler table was previously skipped. If it's added to AllExportData,
  // similar processing logic would be needed here.
  // Example:
  // if (allData.wasserzaehler && allData.wasserzaehler.length > 0) {
  //   const columns = ['id', 'ablese_datum', 'zaehlerstand', 'verbrauch']; // Adjust columns as needed
  //   csvData['wasserzaehler.csv'] = convertToCSV(allData.wasserzaehler, columns);
  // }

  return csvData;
}
