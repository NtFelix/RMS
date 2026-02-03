import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// --- Type Definitions ---

interface Env {
    GEMINI_API_KEY: string;
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
}

interface AIRequest {
    message: string;
    sessionId?: string;
    context?: any; // Allow passing context directly if needed, though we prefer fetching it here
}

// --- Rate Limiting (Simple In-Memory for now, use KV/DO for production) ---
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const requestLog: Map<string, number[]> = new Map();

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const timestamps = requestLog.get(ip) || [];

    // Filter out old timestamps
    const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);

    if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }

    validTimestamps.push(now);
    requestLog.set(ip, validTimestamps);
    return true;
}

// --- Helper Functions (Duplicated for Worker Independence) ---

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

// --- PDF Generation Functions (Preserved) ---

function generateSingleTenantPDF(doc: jsPDF, payload: any) {
    const { tenantData, nebenkostenItem, ownerName, ownerAddress, billingAddress, houseCity } = payload;
    let startY = 20;

    let displayAddress = ownerAddress || '';
    let displayCity = houseCity || '';

    if (!displayCity && ownerAddress) {
        const parts = ownerAddress.split(',').map((p: string) => p.trim());
        const potentialCity = parts.find((p: string) => !/^\d{5}$/.test(p) && p.length > 2);
        if (potentialCity) {
            displayCity = potentialCity;
        } else if (parts.length > 0) {
            displayCity = parts[parts.length - 1];
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

    doc.setFontSize(10);
    doc.text(ownerName || '', 20, startY);
    startY += 6;
    doc.text(displayAddress, 20, startY);
    startY += 10;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Jahresabrechnung", doc.internal.pageSize.getWidth() / 2, startY, { align: "center" });
    startY += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Zeitraum: ${isoToGermanDate(nebenkostenItem.startdatum)} - ${isoToGermanDate(nebenkostenItem.enddatum)}`, 20, startY);
    startY += 6;

    const propertyDetails = `Objekt: ${nebenkostenItem.Haeuser?.name || 'N/A'}, ${tenantData.apartmentName}, ${tenantData.apartmentSize} qm`;
    doc.text(propertyDetails, 20, startY);
    startY += 6;

    const tenantDetails = `Mieter: ${tenantData.tenantName}`;
    doc.text(tenantDetails, 20, startY);
    startY += 10;

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

const ZAEHLER_CONFIG = {
    wasser_kalt: { label: 'Kaltwasser', einheit: 'm³' },
    wasser_warm: { label: 'Warmwasser', einheit: 'm³' },
    strom: { label: 'Strom', einheit: 'kWh' },
    gas: { label: 'Gas', einheit: 'kWh' },
    heizung: { label: 'Heizung', einheit: 'kWh' },
};

function generateHouseOverviewPDF(doc: jsPDF, payload: any) {
    const { nebenkosten, totalArea, totalCosts, costPerSqm } = payload;
    let startY = 20;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Kostenaufstellung - Betriebskosten", 20, startY);
    startY += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Zeitraum: ${isoToGermanDate(nebenkosten.startdatum)} bis ${isoToGermanDate(nebenkosten.enddatum)}`, 20, startY);
    startY += 6;
    if (nebenkosten.haus_name) {
        doc.text(`Haus: ${nebenkosten.haus_name}`, 20, startY);
        startY += 6;
    }
    startY += 10;

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

    const tableData = nebenkosten.nebenkostenart?.map((art: string, index: number) => [
        (index + 1).toString(),
        art || '-',
        formatCurrency(nebenkosten.betrag?.[index] || null),
        nebenkosten.betrag?.[index] && totalArea > 0
            ? formatCurrency((nebenkosten.betrag[index] || 0) / totalArea)
            : '-'
    ]) || [];

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
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            lineWidth: { bottom: 0.3 },
            lineColor: [0, 0, 0]
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            lineWidth: 0
        },
        bodyStyles: {
            lineWidth: { bottom: 0.1 },
            lineColor: [0, 0, 0]
        },
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'left' },
            2: { halign: 'right' },
            3: { halign: 'right' },
        },
        tableWidth: doc.internal.pageSize.getWidth() - 40,
        margin: { left: 20, right: 20 },
        didParseCell: function (data: any) {
            if (data.row.index === tableData.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [248, 248, 248];
            }
            if (data.section === 'head') {
                if (data.column.index === 2 || data.column.index === 3) {
                    data.cell.styles.halign = 'right';
                } else {
                    data.cell.styles.halign = 'left';
                }
            }
        }
    });

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

// --- AI Logic Implementation ---

const SYSTEM_INSTRUCTION = `Stelle dir vor du bist ein hilfreicher Assistent der für Mietevo arbeitet. 
Deine Aufgabe ist den Nutzer zu helfen seine Frage zu dem Programm zu beantworten. 
Das Programm zu dem du fragen beantworten sollst ist Mietevo, ein 
Immobilienverwaltungsprogramm das Benutzern ermöglicht einfach ihre Immobilien 
zu verwalten, indem Nebenkosten/Betriebskostenabrechnungen vereinfach werden 
und viele weitere Funktionen.

Wenn du Dokumentationskontext erhältst, nutze diesen um präzise und hilfreiche Antworten zu geben.
Antworte immer auf Deutsch und sei freundlich und professionell.`;

async function fetchDocumentationContext(supabase: any, query: string): Promise<string> {
    if (!query) return "";

    try {
        // Use Supabase text search on 'Dokumentation' table
        // Note: This relies on the 'search_documentation' RPC function existing or using simple textSearch
        // We will try simple text search first as it's safer if RPC isn't deployed

        // Option 1: RPC call (Preferred if exists)
        const { data: rpcData, error: rpcError } = await supabase.rpc('search_documentation', {
            search_query: query
        });

        let records = [];
        if (!rpcError && rpcData) {
            records = rpcData;
        } else {
            // Option 2: Fallback to simple text search
            const { data, error } = await supabase
                .from('Dokumentation')
                .select('titel, kategorie, seiteninhalt')
                .textSearch('titel,seiteninhalt', query, {
                    type: 'websearch',
                    config: 'german'
                })
                .limit(5);

            if (!error && data) {
                records = data;
            }
        }

        if (records.length === 0) return "";

        let contextText = '\n\nDokumentationskontext:\n';
        records.slice(0, 5).forEach((record: any) => {
            if (record.seiteninhalt) {
                contextText += `\n**${record.titel}** (Kategorie: ${record.kategorie || 'Allgemein'}):\n${record.seiteninhalt.substring(0, 1000)}\n`;
            }
        });

        return contextText;

    } catch (e) {
        console.error("Error fetching context:", e);
        return "";
    }
}

async function handleAIRequest(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as AIRequest;
        const { message, sessionId } = body;

        // Check for API key
        if (!env.GEMINI_API_KEY) {
            return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500 });
        }

        // Rate Limiting
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (!checkRateLimit(ip)) {
            return new Response(JSON.stringify({
                error: {
                    message: "Too many requests. Please try again later.",
                    code: 429,
                    type: 'RATE_LIMIT_EXCEEDED'
                }
            }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } });
        }

        // Initialize Supabase if credentials exist
        let contextText = "";
        if (env.SUPABASE_URL && env.SUPABASE_KEY) {
            const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
            contextText = await fetchDocumentationContext(supabase, message);
        }

        // Initialize Gemini
        const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        const fullPrompt = `${SYSTEM_INSTRUCTION}\n\nUser Message: ${message}\n${contextText}`;

        // Retry logic with exponential backoff
        const maxRetries = 3;
        let attempt = 0;
        let stream: any;
        let lastError: any;

        while (attempt < maxRetries) {
            try {
                stream = await client.models.generateContentStream({
                    model: 'models/gemini-2.5-flash-lite',
                    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
                });
                break; // Success
            } catch (err: any) {
                lastError = err;
                attempt++;
                if (attempt >= maxRetries) break; // Failed after max retries

                // Wait before retrying (exponential backoff: 1s, 2s, 4s...)
                const delay = Math.pow(2, attempt - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        if (!stream) {
            throw new Error(lastError?.message || "Failed to connect to AI service after multiple attempts.");
        }

        // Create stream for response
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const chunkText = chunk.text;
                        if (chunkText) {
                            const data = JSON.stringify({
                                type: 'chunk',
                                content: chunkText,
                                sessionId
                            });
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                        }
                    }

                    const doneData = JSON.stringify({
                        type: 'complete',
                        content: '', // Or accumulator if we tracked it
                        sessionId
                    });
                    controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
                    controller.close();
                } catch (e: any) {
                    const errorData = JSON.stringify({
                        type: 'error',
                        error: e.message,
                        sessionId
                    });
                    controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
                    controller.close();
                }
            }
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });

    } catch (e: any) {
        console.error("AI Request Error:", e);
        const errorMessage = e.message || "An unexpected error occurred.";
        const statusCode = e.status || 500;

        return new Response(JSON.stringify({
            error: {
                message: errorMessage,
                code: statusCode,
                type: 'AI_PROCESSING_ERROR'
            }
        }), {
            status: statusCode,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            }
        });
    }
}

// --- Main Handler ---

export default {
    async fetch(request: Request, env: Env | any, ctx: any): Promise<Response> {
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
            // Clone request to read body multiple times if needed, 
            // or just peek at the body to determine type.
            // Since we consume the body, we need to be careful.
            // We can read the body as text first.
            const rawBody = await request.text();
            let body: any;
            try {
                body = JSON.parse(rawBody);
            } catch {
                return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
            }

            // Route based on URL path first (more robust)
            const url = new URL(request.url);

            // Handle AI requests via path (preferred) or payload detection (fallback)
            if (url.pathname === '/ai' || (body.message && (body.sessionId || !body.type))) {
                // Reconstruct request with parsed body if needed, but here we just pass the original request
                // effectively, assuming handleAIRequest will parse it from the clone or we just pass the body.
                // However, our handleAIRequest expects a Request object and calls .json() on it.
                // Since we already read the body as rawBody, we cannot read it again from the original request.
                // We must create a new Request with the body.
                const newRequest = new Request(request.url, {
                    method: request.method,
                    headers: request.headers,
                    body: rawBody
                });
                return handleAIRequest(newRequest, env);
            }

            // Existing logic for PDF/ZIP
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
