import { supabase } from '../supabase.js';
import { calculateMonthlyPayments } from '../shared/shared.js';

/**
 * Generates a PDF document for the given wohnung and betriebskosten data.
 * Fetches Mieter data using wohnung-id and Wasserzähler data for the specific tenant.
 * Calculates the tenant's water consumption and costs.
 * Prepares data for the PDF table.
 * Creates the PDF table and adds the calculated costs.
 * Adds a footer with the total costs and a note about the already paid costs.
 * Saves the PDF document to the user's downloads folder.
 * @param {object} wohnung - The Wohnung data.
 * @param {object} betriebskosten - The Betriebskosten data.
 */
async function generatePDF(wohnung, betriebskosten, returnBlob = false) {
    console.log('Wohnung data:', wohnung);
    console.log('Betriebskosten data:', betriebskosten);

    if (!wohnung || !wohnung.id) {
        console.error('Invalid wohnung data:', wohnung);
        showNotification('Fehler: Ungültige Wohnungsdaten', 'error');
        return;
    }

    console.log('Fetching Mieter data for wohnung-id:', wohnung.id);

    // Fetch Mieter data using wohnung-id - entferne .single(), um alle Mieter zu erhalten
    const { data: mieterData, error: mieterError } = await supabase
        .from('Mieter')
        .select('*')
        .eq('wohnung-id', wohnung.id);

    console.log('Mieter data:', mieterData);
    console.log('Mieter error:', mieterError);

    if (mieterError) {
        console.error('Error fetching Mieter data:', mieterError);
        showNotification('Fehler beim Laden der Mieterdaten. Bitte versuchen Sie es erneut.', 'error');
        return;
    }

    // Verarbeite die Mieterdaten
    let mieter;
    if (!mieterData || mieterData.length === 0) {
        console.warn('No Mieter data found for wohnung-id:', wohnung.id);
        mieter = {
            name: 'Unbekannt',
            nebenkosten: 0
        };
    } else {
        // Suche nach dem spezifischen Mieter "Mieter-Fantasie-3/4"
        const specificMieter = mieterData.find(m => m.name === 'Mieter-Fantasie-3/4');
        if (specificMieter) {
            mieter = specificMieter;
        } else {
            // Verwende den ersten Mieter aus der Liste
            mieter = mieterData[0];
            console.log(`Mehrere Mieter gefunden, verwende ersten Mieter: ${mieter.name}`);
        }
    }

    // Fetch Wasserzähler data for the specific tenant
    const { data: wasserzaehlerData, error: wasserzaehlerError } = await supabase
        .from('Wasserzähler')
        .select('verbrauch, old-zaehlerstand, new-zaehlerstand')
        .eq('mieter-name', mieter.name)
        .eq('year', betriebskosten.year);

    let tenantWasserverbrauch = 0;
    let altZaehlerstand = 0;
    let neuZaehlerstand = 0;

    if (wasserzaehlerError) {
        console.error('Error fetching Wasserzähler data:', wasserzaehlerError);
        // Continue with 0 consumption instead of returning
        console.warn(`Using 0 consumption for tenant ${mieter.name}`);
    } else if (wasserzaehlerData && wasserzaehlerData.length > 0) {
        // Sum up all consumption values in case there are multiple entries
        tenantWasserverbrauch = wasserzaehlerData.reduce((sum, record) => sum + (record.verbrauch || 0), 0);
        
        // Get the old and new meter readings if available
        if (wasserzaehlerData[0]['old-zaehlerstand']) {
            altZaehlerstand = wasserzaehlerData[0]['old-zaehlerstand'];
        }
        if (wasserzaehlerData[0]['new-zaehlerstand']) {
            neuZaehlerstand = wasserzaehlerData[0]['new-zaehlerstand'];
        }
    } else {
        console.warn(`No water consumption data found for tenant ${mieter.name}`);
    }

    const wasserzaehlerGesamtkosten = betriebskosten['wasserzaehler-gesamtkosten'] || 0;

    // Fetch total water consumption for the year
    const { data: totalWasserzaehlerData, error: totalWasserzaehlerError } = await supabase
        .from('Wasserzähler')
        .select('verbrauch')
        .eq('year', betriebskosten.year);

    let gesamtverbrauch = 0;
    if (totalWasserzaehlerError) {
        console.error('Error fetching total Wasserzähler data:', totalWasserzaehlerError);
        // Continue with calculations using 0 total consumption
    } else if (totalWasserzaehlerData) {
        gesamtverbrauch = totalWasserzaehlerData.reduce((sum, record) => sum + (record.verbrauch || 0), 0);
    }

    const wasserkostenProKubik = gesamtverbrauch > 0 ? wasserzaehlerGesamtkosten / gesamtverbrauch : 0;
    const tenantWasserkosten = tenantWasserverbrauch * wasserkostenProKubik;

    // PDF generation code
    const doc = new jspdf.jsPDF();

    // Set font
    doc.setFont("helvetica");

    // Header
    doc.setFontSize(10);
    doc.text("Christina Plant, Kirchbrändelring 21a, 76669 Bad Schönborn", 20, 20);

    // Title - zentriert
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const title = "Jahresabrechnung";
    const titleWidth = doc.getStringUnitWidth(title) * 18 / doc.internal.scaleFactor;
    const titleX = (doc.internal.pageSize.width - titleWidth) / 2;
    doc.text(title, titleX, 30);

    // Period - zentriert
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const period = `Zeitraum\n01.01.${betriebskosten.year} – 31.12.${betriebskosten.year}`;
    const periodWidth = doc.getStringUnitWidth(period.split('\n')[0]) * 12 / doc.internal.scaleFactor;
    const periodX = (doc.internal.pageSize.width - periodWidth) / 2;
    doc.text(period, periodX, 40, { align: 'center' });

    // Property details
    doc.text(`Objekt: Wichertstraße 67, 10439 Berlin, ${wohnung.Wohnung}, ${wohnung.Größe} qm`, 20, 55);

    // Define headers - angepasst an die Vorlage
    const headers = ['Leistungsart', 'Gesamtkosten\nIn €', 'Verteiler\nEinheit/ qm', 'Kosten\nPro qm', 'Kostenanteil\nIn €'];

    // Use gesamtflaeche from betriebskosten table
    const totalArea = betriebskosten.gesamtflaeche;

    // Prepare data - ohne Positionsspalte, wie in der Vorlage
    const data = betriebskosten.nebenkostenarten.map((art, index) => {
        const gesamtkosten = betriebskosten.betrag[index];
        const berechnungsart = betriebskosten.berechnungsarten[index];
        const verteilerEinheit = berechnungsart === 'pro_flaeche' ? totalArea : 1;
        const kostenProEinheit = gesamtkosten / verteilerEinheit;
        const kostenanteil = berechnungsart === 'pro_flaeche' ? kostenProEinheit * wohnung.Größe : kostenProEinheit;
        return [
            art,
            gesamtkosten.toFixed(2) + ' €',
            verteilerEinheit.toString(),
            kostenProEinheit.toFixed(2),
            kostenanteil.toFixed(2) + ' €'
        ];
    });

    // Add water costs row
    data.push([
        'Wasserkosten',
        wasserzaehlerGesamtkosten.toFixed(2) + ' €',
        gesamtverbrauch.toFixed(2),
        wasserkostenProKubik.toFixed(2),
        tenantWasserkosten.toFixed(2) + ' €'
    ]);

    // Create table with adjusted column widths and styling
    doc.autoTable({
        head: [headers],
        body: data,
        startY: 60,
        styles: { 
            fontSize: 9, 
            cellPadding: 2,
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 50 },                    // Leistungsart
            1: { cellWidth: 30, halign: 'right' },   // Gesamtkosten
            2: { cellWidth: 30, halign: 'center' },  // Verteiler
            3: { cellWidth: 30, halign: 'right' },   // Kosten Pro qm
            4: { cellWidth: 30, halign: 'right' }    // Kostenanteil
        },
        margin: { left: 20, right: 20 },  // Seitenränder anpassen
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        didParseCell: function (data) {
            if (data.section === 'head') {
                data.cell.styles.fillColor = [240, 240, 240];
                data.cell.styles.textColor = [0, 0, 0];
                data.cell.styles.fontStyle = 'bold';
            }
            // Zebrastreifenmuster für Zeilen
            if (data.section === 'body' && data.row.index % 2 === 0) {
                data.cell.styles.fillColor = [245, 245, 245];
            }
        }
    });

    const gesamtsumme = data.reduce((sum, row) => {
        // Entferne das Euro-Zeichen und konvertiere zu Zahl
        const value = parseFloat(row[4].replace(' €', ''));
        return sum + value;
    }, 0);
    
    const finalY = doc.lastAutoTable.finalY || 150;

    // Betriebskosten gesamt - mit entsprechendem Abstand und Styling
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Betriebskosten gesamt", 20, finalY + 10);
    doc.text(`${gesamtsumme.toFixed(2)} €`, 170, finalY + 10, { align: 'right' });

    // Wasserverbrauch-Details - angepasst mit altem und neuem Zählerstand, wie in der Vorlage
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Wasserverbrauch m³: ${tenantWasserverbrauch.toFixed(2)}`, 20, finalY + 20);
    if (altZaehlerstand && neuZaehlerstand) {
        doc.text(`Verbrauch alter WZ m³: ${altZaehlerstand.toFixed(2)}`, 20, finalY + 25);
        doc.text(`Verbrauch neuer WZ m³: ${neuZaehlerstand.toFixed(2)}`, 20, finalY + 30);
    }
    doc.text(`Wasserkosten: ${tenantWasserkosten.toFixed(2)} €`, 20, finalY + 35);
    doc.text(`(${wasserkostenProKubik.toFixed(2)} €/Cbm)`, 120, finalY + 35);

    // Berechnungen mit den korrekten Zahlungen
    const gesamtBetrag = gesamtsumme;
    const totalPaid = await calculateMonthlyPayments([mieter], betriebskosten.year)
        .then(result => result.totalPaid)
        .catch(error => {
            console.error('Fehler bei der Berechnung der Zahlungen:', error);
            return 0;
        });
    const nachzahlung = gesamtBetrag - totalPaid;

    // Abschlusssummen mit deutlicherem Abstand und Hervorhebung
    const summaryY = finalY + 45;
    
    // Trennlinie vor Gesamtbeträgen
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(20, summaryY - 5, 170, summaryY - 5);

    // Display results - mit angepasstem Styling
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Gesamt", 20, summaryY);
    doc.text(`${gesamtBetrag.toFixed(2)} €`, 170, summaryY, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.text("bereits geleistete Zahlungen", 20, summaryY + 5);
    doc.text(`${totalPaid.toFixed(2)} €`, 170, summaryY + 5, { align: 'right' });

    // Nachzahlung/Rückerstattung mit Unterstreichung für Hervorhebung
    doc.setFont("helvetica", "bold");
    const zahlungsText = nachzahlung >= 0 ? "Nachzahlung" : "Rückerstattung";
    doc.text(zahlungsText, 20, summaryY + 10);
    doc.text(`${Math.abs(nachzahlung).toFixed(2)} €`, 170, summaryY + 10, { align: 'right' });
    
    // Unterstreichung für den Nachzahlungsbetrag
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(150, summaryY + 12, 170, summaryY + 12);

    // Vor dem doc.save() folgende Änderung:
    if (returnBlob) {
        return doc.output('blob');
    } else {
        doc.save(`Jahresabrechnung_${wohnung.Wohnung}_${mieter.name}_${betriebskosten.year}.pdf`);
    }
}

export { generatePDF };
