import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import Papa from 'papaparse';

// PDF Helpers from original app logic
const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "-";
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const isoToGermanDate = (isoString: string | null | undefined) => {
    if (!isoString) return "N/A";
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        return isoString;
    }
};

const sumZaehlerValues = (obj: any): number => {
    if (!obj || typeof obj !== 'object') return 0;
    return Object.values(obj).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
};

const roundToNearest5 = (value: number) => {
    return Math.round(value / 5) * 5;
};

// --- Single Tenant PDF Generation (Restored Original Logic) ---
function generateSingleTenantPDF(doc: jsPDF, payload: any) {
    const { tenantData, nebenkostenItem, ownerName, ownerAddress, billingAddress, houseCity } = payload;
    let startY = 20;

    // Determine display name and address
    let displayAddress = ownerAddress || '';
    let displayCity = houseCity || '';

    // If no houseCity provided, try to extract from ownerAddress
    if (!displayCity && ownerAddress) {
        const parts = ownerAddress.split(',').map((p: string) => p.trim());
        if (parts.length > 1) {
            // Take the last part, and if it starts with a postal code, strip it
            const lastPart = parts[parts.length - 1];
            displayCity = lastPart.replace(/^\d{5}\s+/, '').trim();
        } else {
            // Try splitting by space and taking the last part
            const spaceParts = ownerAddress.split(' ').map((p: string) => p.trim());
            if (spaceParts.length > 1) {
                displayCity = spaceParts[spaceParts.length - 1];
            }
        }
    }

    if (billingAddress) {
        const { line1, line2, city, postal_code } = billingAddress;
        if (line1) {
            displayAddress = `${line1}${line2 ? ' ' + line2 : ''}, ${postal_code || ''} ${city || ''}`.trim();
        }
        if (city) {
            displayCity = city;
        }
    }

    // Owner Information & Title
    doc.setFontSize(10);
    doc.text(ownerName || '', 20, startY);
    startY += 6;
    doc.text(displayAddress, 20, startY);
    startY += 10;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Jahresabrechnung", doc.internal.pageSize.getWidth() / 2, startY, { align: "center" });
    startY += 10;

    // Settlement Period
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Zeitraum: ${isoToGermanDate(nebenkostenItem.startdatum)} - ${isoToGermanDate(nebenkostenItem.enddatum)}`, 20, startY);
    startY += 6;

    // Property Details
    const propertyDetails = `Objekt: ${nebenkostenItem.Haeuser?.name || 'N/A'}, ${tenantData.apartmentName}, ${tenantData.apartmentSize} qm`;
    doc.text(propertyDetails, 20, startY);
    startY += 6;

    // Tenant Details
    const tenantDetails = `Mieter: ${tenantData.tenantName}`;
    doc.text(tenantDetails, 20, startY);
    startY += 10;

    // Costs Table
    const tableColumn = ["Leistungsart", "Gesamtkosten\nin €", "Verteiler\nEinheit/ qm", "Kosten\nPro qm", "Kostenanteil\nIn €"];
    const tableRows: any[][] = [];

    if (tenantData.costItems) {
        tenantData.costItems.forEach((item: any) => {
            tableRows.push([
                item.costName,
                formatCurrency(item.totalCostForItem),
                item.verteiler || '-',
                item.pricePerSqm ? formatCurrency(item.pricePerSqm) : '-',
                formatCurrency(item.tenantShare)
            ]);
        });
    }

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        theme: 'plain',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            lineWidth: { bottom: 0.3 },
            lineColor: [0, 0, 0]
        },
        styles: {
            fontSize: 9,
            cellPadding: 1.5,
            lineWidth: 0
        },
        bodyStyles: {
            lineWidth: { bottom: 0.1 },
            lineColor: [0, 0, 0]
        },
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' }
        },
        willDrawCell: function (data: any) {
            if (data.section === 'head' && data.column.index >= 1) {
                data.cell.styles.halign = 'right';
            }
        },
        tableWidth: doc.internal.pageSize.getWidth() - 40,
        margin: { left: 20, right: 20 }
    });

    let tableFinalY = (doc as any).lastAutoTable?.finalY;
    startY = typeof tableFinalY === 'number' ? tableFinalY + 6 : startY + 10;

    const sumOfTotalCostForItem = tenantData.costItems ? tenantData.costItems.reduce((sum: number, item: any) => sum + item.totalCostForItem, 0) : 0;
    const sumOfTenantSharesFromCostItems = tenantData.costItems ? tenantData.costItems.reduce((sum: number, item: any) => sum + item.tenantShare, 0) : 0;

    startY += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");

    const pageWidth = doc.internal.pageSize.getWidth();
    const tableWidth = pageWidth - 40;
    const leftMargin = 20;
    const col1Start = leftMargin;
    const col3Start = leftMargin + (tableWidth * 0.45);
    const col4Start = leftMargin + (tableWidth * 0.65);
    const col5End = leftMargin + tableWidth;

    doc.setTextColor(0, 0, 0);
    doc.text("Betriebskosten gesamt:", col1Start, startY, { align: 'left' });
    doc.text(formatCurrency(sumOfTotalCostForItem), col3Start + 15.65, startY, { align: 'right' });
    doc.text(formatCurrency(sumOfTenantSharesFromCostItems), col5End, startY, { align: 'right' });

    startY += 12;

    const tenantWaterShare = tenantData.waterCost?.tenantShare || 0;
    const tenantWaterConsumption = tenantData.waterCost?.consumption || 0;
    const buildingWaterCost = sumZaehlerValues(nebenkostenItem.zaehlerkosten);
    const buildingWaterConsumption = sumZaehlerValues(nebenkostenItem.zaehlerverbrauch);
    const pricePerCubicMeterCalc = buildingWaterConsumption > 0 ? buildingWaterCost / buildingWaterConsumption : 0;

    doc.text("Wasserkosten:", col1Start, startY, { align: 'left' });
    doc.text(`${tenantWaterConsumption} m³`, col3Start + 15.65, startY, { align: 'right' });
    doc.text(`${formatCurrency(pricePerCubicMeterCalc)} / m3`, col4Start + 15, startY, { align: 'right' });
    doc.text(formatCurrency(tenantWaterShare), col5End, startY, { align: 'right' });

    startY += 16;
    const totalTenantCosts = sumOfTenantSharesFromCostItems + tenantWaterShare;
    doc.text("Gesamt:", col1Start, startY, { align: 'left' });
    doc.text(formatCurrency(totalTenantCosts), col5End, startY, { align: 'right' });

    startY += 8;
    doc.text("Vorauszahlungen:", col1Start, startY, { align: 'left' });
    doc.text(formatCurrency(tenantData.vorauszahlungen || 0), col5End, startY, { align: 'right' });

    startY += 8;
    const isPositiveSettlement = (tenantData.finalSettlement || 0) >= 0;
    const settlementLabel = isPositiveSettlement ? "Nachzahlung:" : "Guthaben:";
    const settlementAmount = Math.abs(tenantData.finalSettlement || 0);
    doc.text(settlementLabel, col1Start, startY, { align: 'left' });
    doc.text(formatCurrency(settlementAmount), col5End, startY, { align: 'right' });

    startY += 8;
    const suggestedVorauszahlung = tenantData.recommendedPrepayment ? roundToNearest5(tenantData.recommendedPrepayment) : 0;
    const monthlyVorauszahlung = suggestedVorauszahlung / 12;

    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const formattedDate = nextMonth.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

    doc.setFont("helvetica", "bold");
    doc.text(`Vorauszahlung ab ${formattedDate}`, col1Start, startY, { align: 'left' });
    doc.text(formatCurrency(monthlyVorauszahlung), col5End, startY, { align: 'right' });

    doc.setFont("helvetica", "normal");
    startY += 25;

    doc.text(`${displayCity}, den ${today.toLocaleDateString('de-DE')}`, col1Start, startY);
}

// --- Zähler Config for Labels ---
const ZAEHLER_CONFIG = {
    wasser_kalt: { label: 'Kaltwasser', einheit: 'm³' },
    wasser_warm: { label: 'Warmwasser', einheit: 'm³' },
    strom: { label: 'Strom', einheit: 'kWh' },
    gas: { label: 'Gas', einheit: 'kWh' },
    heizung: { label: 'Heizung', einheit: 'kWh' },
};

// --- House Overview PDF Generation (Original Logic) ---
function generateHouseOverviewPDF(doc: jsPDF, payload: any) {
    const { nebenkosten, totalArea, totalCosts, costPerSqm } = payload;
    let startY = 20;

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Kostenaufstellung - Betriebskosten", 20, startY);
    startY += 10;

    // Period and house info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Zeitraum: ${isoToGermanDate(nebenkosten.startdatum)} bis ${isoToGermanDate(nebenkosten.enddatum)}`, 20, startY);
    startY += 6;
    if (nebenkosten.haus_name) {
        doc.text(`Haus: ${nebenkosten.haus_name}`, 20, startY);
        startY += 6;
    }
    startY += 10;

    // Summary information
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Übersicht", 20, startY);
    startY += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Gesamtfläche: ${totalArea} m²`, 20, startY);
    startY += 6;
    doc.text(`Anzahl Wohnungen: ${nebenkosten.anzahlWohnungen || 0}`, 20, startY);
    startY += 6;
    doc.text(`Anzahl Mieter: ${nebenkosten.anzahlMieter || 0}`, 20, startY);
    startY += 6;
    doc.text(`Gesamtkosten: ${formatCurrency(totalCosts)}`, 20, startY);
    startY += 6;
    doc.text(`Kosten pro m²: ${formatCurrency(costPerSqm)}`, 20, startY);
    startY += 15;

    // Cost breakdown table
    const tableData = nebenkosten.nebenkostenart?.map((art: string, index: number) => [
        (index + 1).toString(),
        art || '-',
        formatCurrency(nebenkosten.betrag?.[index] || null),
        nebenkosten.betrag?.[index] && totalArea > 0
            ? formatCurrency((nebenkosten.betrag[index] || 0) / totalArea)
            : '-'
    ]) || [];

    // Add total row
    tableData.push([
        '',
        'Gesamtkosten',
        formatCurrency(totalCosts),
        formatCurrency(costPerSqm)
    ]);

    autoTable(doc, {
        head: [['Pos.', 'Leistungsart', 'Gesamtkosten', 'Kosten pro m²']],
        body: tableData,
        startY: startY,
        theme: 'plain',
        headStyles: {
            fillColor: [255, 255, 255], // White background instead of gray
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            lineWidth: { bottom: 0.3 }, // Thicker bottom border for header
            lineColor: [0, 0, 0] // Black color for header bottom border
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineWidth: 0 // Remove all cell borders
        },
        bodyStyles: {
            lineWidth: { bottom: 0.1 }, // Only add thin bottom border for rows
            lineColor: [0, 0, 0] // Black color for row separators
        },
        columnStyles: {
            0: { halign: 'left' },   // Left align position numbers
            1: { halign: 'left' },   // Left align service descriptions
            2: { halign: 'right' },  // Right align total costs
            3: { halign: 'right' },  // Right align costs per sqm
        },
        // Ensure table aligns with left and right content margins
        tableWidth: doc.internal.pageSize.getWidth() - 40,
        margin: { left: 20, right: 20 },
        didParseCell: function (data: any) {
            // Make the total row bold
            if (data.row.index === tableData.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [248, 248, 248];
            }
            // Ensure header columns are properly aligned
            if (data.section === 'head') {
                if (data.column.index === 2 || data.column.index === 3) {
                    data.cell.styles.halign = 'right';
                } else {
                    data.cell.styles.halign = 'left';
                }
            }
        }
    });

    // Meter costs section if zaehlerkosten available
    if (nebenkosten.zaehlerkosten && Object.keys(nebenkosten.zaehlerkosten).length > 0) {
        let meterY = (doc as any).lastAutoTable?.finalY + 15;

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Zählerkosten", 20, meterY);
        meterY += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        Object.entries(nebenkosten.zaehlerkosten).forEach(([typ, kosten]) => {
            const config = (ZAEHLER_CONFIG as any)[typ] || { label: typ, einheit: 'm³' };
            const label = config.label;
            const einheit = config.einheit;
            const verbrauch = nebenkosten.zaehlerverbrauch?.[typ];

            doc.text(`${label}: ${formatCurrency(kosten as number)}`, 20, meterY);
            meterY += 5;
            if (typeof verbrauch === 'number') {
                doc.text(`  Verbrauch: ${verbrauch} ${einheit}`, 20, meterY);
                meterY += 5;
                if (verbrauch > 0) {
                    doc.text(`  Kosten pro ${einheit}: ${formatCurrency((kosten as number) / verbrauch)}`, 20, meterY);
                    meterY += 5;
                }
            }
            meterY += 2;
        });
    }
}

export default {
    async fetch(request: Request, env: any, ctx: any): Promise<Response> {
        const origin = request.headers.get('Origin') || '*';
        const corsHeaders: Record<string, string> = {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
        }

        try {
            const body = await request.json() as any;
            const { type, template, data, filename } = body;
            const startTime = Date.now();
            let totalPages = 0;

            if (type === 'csv') {
                const csv = Papa.unparse(data);
                const endTime = Date.now();
                return new Response(csv, {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'text/csv',
                        'Content-Disposition': `attachment; filename="${filename || 'export.csv'}"`,
                        'X-PDF-Page-Count': '0',
                        'X-PDF-Generation-Time': (endTime - startTime).toString(),
                        'Access-Control-Expose-Headers': 'X-PDF-Page-Count, X-PDF-Generation-Time'
                    },
                });
            }

            if (type === 'zip' && !template) {
                const zip = new JSZip();
                if (Array.isArray(data)) {
                    data.forEach((item: any) => {
                        const csv = Papa.unparse(item.data);
                        zip.file(`${item.name}.csv`, csv);
                    });
                } else {
                    Object.entries(data).forEach(([name, content]: [string, any]) => {
                        const csv = Papa.unparse(content);
                        zip.file(`${name}.csv`, csv);
                    });
                }
                const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
                const endTime = Date.now();
                return new Response(zipBuffer, {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/zip',
                        'Content-Disposition': `attachment; filename="${filename || 'export.zip'}"`,
                        'X-PDF-Page-Count': '0',
                        'X-PDF-Generation-Time': (endTime - startTime).toString(),
                        'Access-Control-Expose-Headers': 'X-PDF-Page-Count, X-PDF-Generation-Time'
                    }
                });
            }

            if (type === 'zip' && template === 'pdf') {
                const zip = new JSZip();
                for (const item of data) {
                    const doc = new jsPDF();
                    generateSingleTenantPDF(doc, item.data);
                    totalPages += doc.getNumberOfPages();
                    zip.file(`${item.name}.pdf`, doc.output('arraybuffer'));
                }
                const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
                const endTime = Date.now();
                return new Response(zipBuffer, {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/zip',
                        'Content-Disposition': `attachment; filename="${filename || 'export.zip'}"`,
                        'X-PDF-Page-Count': totalPages.toString(),
                        'X-PDF-Generation-Time': (endTime - startTime).toString(),
                        'Access-Control-Expose-Headers': 'X-PDF-Page-Count, X-PDF-Generation-Time'
                    }
                });
            }

            if (type === 'pdf') {
                const doc = new jsPDF();
                if (template === 'house-overview') {
                    generateHouseOverviewPDF(doc, body);
                } else {
                    generateSingleTenantPDF(doc, body);
                }
                totalPages = doc.getNumberOfPages();
                const pdfBuffer = doc.output('arraybuffer');
                const endTime = Date.now();
                return new Response(new Uint8Array(pdfBuffer), {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="${filename || 'document.pdf'}"`,
                        'X-PDF-Page-Count': totalPages.toString(),
                        'X-PDF-Generation-Time': (endTime - startTime).toString(),
                        'Access-Control-Expose-Headers': 'X-PDF-Page-Count, X-PDF-Generation-Time'
                    }
                });
            }

            return new Response('Invalid Request Type', { status: 400, headers: corsHeaders });
        } catch (error: any) {
            return new Response(`Error: ${error.message}`, { status: 500, headers: corsHeaders });
        }
    },
};
