import { supabase } from '../supabase.js';

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
async function generatePDF(wohnung, betriebskosten) {
    console.log('Wohnung data:', wohnung);
    console.log('Betriebskosten data:', betriebskosten);

    if (!wohnung || !wohnung.id) {
        console.error('Invalid wohnung data:', wohnung);
        showNotification('Fehler: Ungültige Wohnungsdaten', 'error');
        return;
    }

    console.log('Fetching Mieter data for wohnung-id:', wohnung.id);

    // Fetch Mieter data using wohnung-id
    const { data: mieterData, error: mieterError } = await supabase
        .from('Mieter')
        .select('*')
        .eq('wohnung-id', wohnung.id)
        .single();

    console.log('Mieter data:', mieterData);
    console.log('Mieter error:', mieterError);

    if (mieterError) {
        console.error('Error fetching Mieter data:', mieterError);
        showNotification('Fehler beim Laden der Mieterdaten. Bitte versuchen Sie es erneut.', 'error');
        return;
    }

    let mieter;
    if (!mieterData) {
        console.warn('No Mieter data found for wohnung-id:', wohnung.id);
        mieter = {
            name: 'Unbekannt',
            nebenkosten: 0
        };
    } else {
        mieter = mieterData;
    }

    // Fetch Wasserzähler data for the specific tenant
    const { data: wasserzaehlerData, error: wasserzaehlerError } = await supabase
        .from('Wasserzähler')
        .select('verbrauch')
        .eq('mieter-name', mieter.name)
        .eq('year', betriebskosten.year)
        .single();

    if (wasserzaehlerError) {
        console.error('Error fetching Wasserzähler data:', wasserzaehlerError);
        showNotification('Fehler beim Laden der Wasserzählerdaten. Bitte versuchen Sie es erneut.', 'error');
        return;
    }

    const tenantWasserverbrauch = wasserzaehlerData ? wasserzaehlerData.verbrauch || 0 : 0;
    const wasserzaehlerGesamtkosten = betriebskosten['wasserzaehler-gesamtkosten'] || 0;

    // Fetch total water consumption for the year
    const { data: totalWasserzaehlerData, error: totalWasserzaehlerError } = await supabase
        .from('Wasserzähler')
        .select('verbrauch')
        .eq('year', betriebskosten.year);

    if (totalWasserzaehlerError) {
        console.error('Error fetching total Wasserzähler data:', totalWasserzaehlerError);
        showNotification('Fehler beim Laden der gesamten Wasserzählerdaten. Bitte versuchen Sie es erneut.', 'error');
        return;
    }

    const gesamtverbrauch = totalWasserzaehlerData.reduce((sum, record) => sum + (record.verbrauch || 0), 0);
    const wasserkostenProKubik = gesamtverbrauch > 0 ? wasserzaehlerGesamtkosten / gesamtverbrauch : 0;
    const tenantWasserkosten = tenantWasserverbrauch * wasserkostenProKubik;

    // PDF generation code
    const doc = new jspdf.jsPDF();

    // Set font
    doc.setFont("helvetica");

    // Header
    doc.setFontSize(10);
    doc.text("Christina Plant, Kirchbrändelring 21a, 76669 Bad Schönborn", 20, 20);

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Jahresabrechnung", 20, 30);

    // Period
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Zeitraum: 01.01.${betriebskosten.year} - 31.12.${betriebskosten.year}`, 20, 40);

    // Property details
    doc.text(`Objekt: Wichertstraße 67, 10439 Berlin, ${wohnung.Wohnung}, ${wohnung.Größe} qm`, 20, 50);

    // Define headers
    const headers = ['Pos.', 'Leistungsart', 'Gesamtkosten In €', 'Verteiler Einheit/ qm', 'Kosten Pro qm', 'Kostenanteil In €'];

    // Use gesamtflaeche from betriebskosten table
    const totalArea = betriebskosten.gesamtflaeche;

    // Prepare data
    const data = betriebskosten.nebenkostenarten.map((art, index) => {
        const gesamtkosten = betriebskosten.betrag[index];
        const berechnungsart = betriebskosten.berechnungsarten[index];
        const verteilerEinheit = berechnungsart === 'pro_flaeche' ? totalArea : 1;
        const kostenProEinheit = gesamtkosten / verteilerEinheit;
        const kostenanteil = berechnungsart === 'pro_flaeche' ? kostenProEinheit * wohnung.Größe : kostenProEinheit;
        return [
            index + 1,
            art,
            gesamtkosten.toFixed(2),
            verteilerEinheit.toString(),
            kostenProEinheit.toFixed(2),
            kostenanteil.toFixed(2)
        ];
    });

    // Add water costs row
    data.push([
        data.length + 1,
        'Wasserkosten',
        wasserzaehlerGesamtkosten.toFixed(2),
        gesamtverbrauch.toFixed(2),
        wasserkostenProKubik.toFixed(2),
        tenantWasserkosten.toFixed(2)
    ]);

    // Create table
    doc.autoTable({
        head: [headers],
        body: data,
        startY: 60,
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: 50 },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'center' },
            4: { cellWidth: 30, halign: 'right' },
            5: { cellWidth: 30, halign: 'right' }
        },
        didParseCell: function (data) {
            if (data.section === 'head') {
                data.cell.styles.fillColor = [200, 200, 200];
            }
        }
    });

    const gesamtsumme = data.reduce((sum, row) => sum + parseFloat(row[5]), 0);
    const finalY = doc.lastAutoTable.finalY || 150;

    // Betriebskosten gesamt
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Betriebskosten gesamt", 20, finalY + 10);
    doc.text(`${gesamtsumme.toFixed(2)} €`, 170, finalY + 10, { align: 'right' });

    // Water consumption
    doc.setFont("helvetica", "normal");
    doc.text(`Wasserverbrauch m³: ${tenantWasserverbrauch.toFixed(2)}`, 20, finalY + 20);
    doc.text(`Wasserkosten: ${tenantWasserkosten.toFixed(2)} €`, 20, finalY + 25);
    doc.text(`(${wasserkostenProKubik.toFixed(2)} €/Cbm)`, 120, finalY + 25);

    // Additional calculations
    const gesamtBetrag = gesamtsumme;
    const monatlicheNebenkosten = mieter.nebenkosten || 0;
    console.log('Monatliche Nebenkosten:', monatlicheNebenkosten);
    const bereitsBezahlt = monatlicheNebenkosten * 12;
    const nachzahlung = gesamtBetrag - bereitsBezahlt;

    // Display results
    doc.setFont("helvetica", "bold");
    doc.text("Gesamt", 20, finalY + 35);
    doc.text(`${gesamtBetrag.toFixed(2)} €`, 170, finalY + 35, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.text("bereits geleistete Zahlungen", 20, finalY + 40);
    doc.text(`${bereitsBezahlt.toFixed(2)} €`, 170, finalY + 40, { align: 'right' });

    doc.setFont("helvetica", "bold");
    doc.text("Nachzahlung", 20, finalY + 45);
    doc.text(`${nachzahlung.toFixed(2)} €`, 170, finalY + 45, { align: 'right' });

    doc.save(`Jahresabrechnung_${wohnung.Wohnung}_${betriebskosten.year}.pdf`);
}

export { generatePDF };