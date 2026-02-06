import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { WorkerLogger } from './logger';
import pako from 'pako';
import { PostHog } from 'posthog-node';

// --- Type Definitions ---

interface Env {
    GEMINI_API_KEY: string;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    POSTHOG_API_KEY?: string;
    POSTHOG_HOST?: string;
    RATE_LIMITER: any; // Using 'any' for now to avoid compilation errors with unknown binding type
}

interface AIRequest {
    message: string;
    sessionId?: string;
    context?: any; // Allow passing context directly if needed, though we prefer fetching it here
}

interface QueueTask {
    msg_id: number;
    read_ct: number;
    enqueued_at: string;
    vt: string;
    message: {
        mail_id: string;
        user_id: string;
        created_at: string;
        dateipfad?: string | null;
    };
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

async function handleAIRequest(request: Request, env: Env, ctx: any): Promise<Response> {
    const logger = new WorkerLogger(env, ctx);
    try {
        const body = await request.json() as AIRequest;
        const { message, sessionId } = body;

        logger.info('AI Request received', { sessionId });

        // Check for API key
        if (!env.GEMINI_API_KEY) {
            logger.error('Gemini API key not configured');
            logger.flush();
            return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500 });
        }

        // Rate Limiting
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (env.RATE_LIMITER) {
            const { success } = await env.RATE_LIMITER.limit({ key: ip });
            if (!success) {
                logger.warn('Rate limit exceeded', { ip });
                logger.flush();
                return new Response(JSON.stringify({
                    error: {
                        message: "Too many requests. Please try again later.",
                        code: 429,
                        type: 'RATE_LIMIT_EXCEEDED'
                    }
                }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } });
            }
        }

        // Initialize Supabase if credentials exist
        let contextText = "";
        if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
            const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
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
                        let chunkText = '';
                        if (typeof chunk.text === 'function') {
                            chunkText = chunk.text();
                        } else if (typeof chunk.text === 'string') {
                            chunkText = chunk.text;
                        }

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



        // Note: logs will be flushed by waitUntil in logger if ctx is provided, 
        // but we can also explicitly flush here if we want to be sure, though synchronous flush might delay response.
        // Better to rely on ctx.waitUntil which WorkerLogger handles in flush().
        logger.info('AI Request stream started', { sessionId });
        logger.flush();

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
        logger.error('AI Request Error', { error: e.message });
        logger.flush();
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

// --- Queue Processing Implementation ---

async function downloadAndDecompressEmail(supabase: any, dateipfad: string): Promise<string> {
    const { data: bodyBlob, error: downloadError } = await supabase.storage
        .from('mails')
        .download(dateipfad);

    if (downloadError || !bodyBlob) {
        throw new Error('Failed to download email body: ' + (downloadError?.message || 'Unknown error'));
    }

    const arrayBuffer = await bodyBlob.arrayBuffer();
    // Assuming pako is used, but we see 'import pako from "pako"' at top.
    // However, if we need to support both gzip and plain text, we might need checking.
    // But usually body is gzipped if in storage.
    // Let's try/catch decompression.
    try {
        const uint8Array = new Uint8Array(arrayBuffer);
        const decompressed = pako.ungzip(uint8Array, { to: 'string' });
        const emailBody = JSON.parse(decompressed);
        // Return plain text content preferably, or html if plain is missing
        return emailBody.plain || emailBody.html || JSON.stringify(emailBody);
    } catch (e) {
        // If it fails, maybe it wasn't gzipped or was just text?
        // But RMS implementation always gzips using pako.
        throw new Error('Failed to decompress email body: ' + e);
    }
}

// Helper for exponential backoff delay
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry wrapper for rate-limited API calls
async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 2000
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Check if it's a rate limit error (429)
            const isRateLimit = error?.message?.includes('429') ||
                error?.message?.includes('RESOURCE_EXHAUSTED') ||
                error?.status === 429;

            if (isRateLimit && attempt < maxRetries) {
                const delay = baseDelayMs * Math.pow(2, attempt); // Exponential backoff: 2s, 4s, 8s
                console.log(`Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
                await sleep(delay);
            } else {
                throw error;
            }
        }
    }

    throw lastError;
}

async function analyzeApplicantWithAI(env: Env, emailContent: string): Promise<{
    result: any;
    prompt: string;
    usage: { model: string; inputTokens?: number; outputTokens?: number; totalTokens?: number; latencyMs: number; };
}> {
    const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const model = 'gemini-2.5-flash-lite'; // Latest high-speed, cost-efficient model for batch tasks
    const startTime = Date.now();
    // Using a more lightweight model strictly for JSON extraction if possible, 
    // but gemini-1.5-flash is good. 'models/gemini-2.5-flash-lite' was used in existing code.
    // Let's stick to that.

    const schema = `
    {
      "personalInfo": {
        "salutation": "string (Herr/Frau/Divers)",
        "firstName": "string",
        "lastName": "string",
        "email": "string",
        "phone": "string",
        "address": { "street": "string", "city": "string", "zip": "string" },
        "dateOfBirth": "string (ISO)",
        "nationality": "string"
      },
      "financials": {
        "status": "string (employed/self-employed/unemployed/student/pensioner/other/unknown)",
        "employer": "string",
        "profession": "string",
        "netIncome": "number",
        "hasSchufa": "boolean",
        "schufaScore": "string"
      },
      "household": {
        "personCount": "number",
        "childrenCount": "number",
        "pets": "boolean",
        "petsDescription": "string",
        "smoker": "boolean",
        "instruments": "boolean",
        "instrumentDetails": "string"
      },
      "application": {
        "desiredMoveInDate": "string (ISO)",
        "reasonForMoving": "string",
        "messageSummary": "string",
        "sentiment": "string (positive/neutral/negative/urgent)",
        "completenessScore": "number (0-100)"
      },
      "redFlags": ["string"],
      "missingInformation": ["string"]
    }
    `;

    const prompt = `
    Analyze the following email application for a rental property and extract the data into the requested JSON format.
    Return ONLY valid JSON.

    Email Content:
    ${emailContent.substring(0, 30000)} -- Truncate to prevent token limits

    Output Schema:
    ${schema}
    `;

    const apiResult = await client.models.generateContent({
        model: model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const latencyMs = Date.now() - startTime;
    const resultAny = apiResult as any;
    const usageMetadata = resultAny.usageMetadata || resultAny.usage || {};

    // Check if result has text directly or via response
    // Based on lint error: 'Property response does not exist on type GenerateContentResponse'
    // For @google/genai SDK v1.x+, result has .text as a getter property (not a method)
    // Access as property, not function call

    let responseText: string;

    if (typeof resultAny.text === 'string') {
        // Direct .text property (v1.x SDK)
        responseText = resultAny.text;
    } else if (typeof resultAny.text === 'function') {
        // .text() method (older SDK versions)
        responseText = resultAny.text();
    } else if (resultAny.response?.text) {
        // Nested response structure
        responseText = typeof resultAny.response.text === 'function'
            ? resultAny.response.text()
            : resultAny.response.text;
    } else if (resultAny.candidates?.[0]?.content?.parts?.[0]?.text) {
        // Raw candidate structure
        responseText = resultAny.candidates[0].content.parts[0].text;
    } else {
        responseText = JSON.stringify(apiResult);
    }

    // Parse the JSON result
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const parsedResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText);

    return {
        result: parsedResult,
        prompt,
        usage: {
            model,
            inputTokens: usageMetadata.promptTokenCount || usageMetadata.input_tokens,
            outputTokens: usageMetadata.candidatesTokenCount || usageMetadata.output_tokens,
            totalTokens: usageMetadata.totalTokenCount || usageMetadata.total_tokens,
            latencyMs
        }
    };
}


async function processQueue(request: Request, env: Env, ctx: any): Promise<Response> {
    const logger = new WorkerLogger(env, ctx);
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Get user_id from body if available for ownership tracking
    let userIdForTracking = 'system';
    try {
        const clonedReq = request.clone();
        const body = await clonedReq.json() as any;
        if (body.user_id) userIdForTracking = body.user_id;
    } catch (e) {
        // Ignore parsing errors for requests without a body
    }

    try {
        // 1. Read from Queue
        // vt: 60 seconds visibility timeout
        const { data: messages, error: readError } = await supabase.rpc('pgmq_read', {
            queue_name: 'applicant_ai_processing',
            vt: 60,
            qty: 1
        });

        if (readError) {
            logger.error('PGMQ Read Error', { error: readError.message });
            logger.flush();
            return new Response('Queue Read Error', { status: 500 });
        }

        if (!messages || messages.length === 0) {
            // Queue is empty, stop the chain
            logger.info('Queue Empty', {});
            logger.flush();
            return new Response(JSON.stringify({ status: 'done', message: 'Queue empty', hasMore: false }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const task = messages[0] as QueueTask;
        const msgId = task.msg_id;
        const { mail_id, user_id } = task.message;
        let { dateipfad } = task.message;

        logger.info('Processing Queue Item', { msgId, mailId: mail_id });

        // 2. Fetch dateipfad from Mail_Metadaten if not provided
        if (!dateipfad && mail_id) {
            const { data: mailData, error: mailError } = await supabase
                .from('Mail_Metadaten')
                .select('dateipfad')
                .eq('id', mail_id)
                .single();

            if (mailError) {
                logger.error('Failed to fetch mail metadata', { mailId: mail_id, error: mailError.message });
            } else if (mailData?.dateipfad) {
                dateipfad = mailData.dateipfad;
                logger.info('Fetched dateipfad from DB', { mailId: mail_id, dateipfad });
            }
        }

        // 3. Process Item
        let aiResult = null;
        let aiScore = null;

        if (dateipfad) {
            try {
                // Download & AI with retry for rate limits
                const emailContent = await downloadAndDecompressEmail(supabase, dateipfad);
                const aiResponse = await withRetry(() => analyzeApplicantWithAI(env, emailContent));
                aiResult = aiResponse.result;
                aiScore = aiResult.application?.completenessScore || null;

                // Log LLM generation to PostHog for LLM Analytics dashboard
                if (env.POSTHOG_API_KEY) {
                    const posthog = new PostHog(env.POSTHOG_API_KEY, {
                        host: env.POSTHOG_HOST || 'https://eu.i.posthog.com',
                        flushAt: 1,
                        flushInterval: 0,
                    });

                    const traceId = crypto.randomUUID();
                    await posthog.capture({
                        distinctId: userIdForTracking, // Use the actual user if provided
                        event: '$ai_generation',
                        properties: {
                            $ai_trace_id: traceId,
                            $ai_span_name: 'applicant_analysis',
                            $ai_model: aiResponse.usage.model,
                            $ai_provider: 'google',
                            $ai_input: [{ role: 'user', content: aiResponse.prompt }],
                            $ai_input_tokens: aiResponse.usage.inputTokens || 0,
                            $ai_output_choices: [{ role: 'assistant', content: JSON.stringify(aiResult).substring(0, 1000) }],
                            $ai_output_tokens: aiResponse.usage.outputTokens || 0,
                            $ai_latency: aiResponse.usage.latencyMs / 1000,
                            // User visibility
                            user_id: userIdForTracking,
                            mail_id: mail_id,
                            completeness_score: aiScore || 0,
                        }
                    });
                    await posthog.shutdown();
                }

                logger.info('LLM Analysis Complete', {
                    model: aiResponse.usage.model,
                    latencyMs: aiResponse.usage.latencyMs,
                    mailId: mail_id,
                    score: aiScore || 0
                });

                // Update DB with Top-Level fields for easier access/sorting
                const updates: any = {
                    bewerbung_metadaten: aiResult,
                    bewerbung_score: aiScore
                };

                if (aiResult?.personalInfo) {
                    if (aiResult.personalInfo.firstName || aiResult.personalInfo.lastName) {
                        updates.name = `${aiResult.personalInfo.firstName || ''} ${aiResult.personalInfo.lastName || ''}`.trim();
                    }
                    if (aiResult.personalInfo.email) {
                        updates.email = aiResult.personalInfo.email;
                    }
                    if (aiResult.personalInfo.phone) {
                        updates.telefonnummer = aiResult.personalInfo.phone;
                    }
                }

                const { error: updateError } = await supabase
                    .from('Mieter')
                    .update(updates)
                    .eq('bewerbung_mail_id', mail_id);

                if (updateError) throw updateError;

            } catch (processError: any) {
                logger.error('Processing Failed', { msgId, error: processError.message });
                // We might want to keep it in queue or move to DLQ? 
                // For now, we delete it to strictly avoid infinite loops, or you could increment failure count.
                // Let's delete it but log error.
            }
        } else {
            logger.warn('No dateipfad available for task', { msgId, mailId: mail_id });
        }

        // 3. Delete from Queue
        await supabase.rpc('pgmq_delete', {
            queue_name: 'applicant_ai_processing',
            msg_id: msgId
        });

        logger.info('Queue Item Processed', { msgId });
        logger.flush();

        // Return hasMore: true so client can trigger next processing.
        // The next call will return hasMore: false if the queue is actually empty.
        return new Response(JSON.stringify({
            status: 'processed',
            msgId,
            hasMore: true
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        logger.error('Queue Handler Error', { error: e.message });
        logger.flush();
        return new Response(JSON.stringify({ error: e.message, hasMore: false }), { status: 500 });
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

        const url = new URL(request.url);

        // Handle CORS preflight requests
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: corsHeaders
            });
        }

        // Instantiating logger at the top level of fetch would be ideal, but we need to handle the try-catch block scope.
        // Given the structure, we'll initialize it at the beginning of the try block.
        // However, since we are inside `export default { async fetch(...) }`, we can initialize it right at the start of `fetch`.

        const logger = new WorkerLogger(env, ctx);

        try {
            // Route based on URL path first (more robust)
            let response: Response;
            if (url.pathname === '/ai') {
                response = await handleAIRequest(request, env, ctx);
            } else if (url.pathname === '/process-queue') {
                response = await processQueue(request, env, ctx);
            } else {
                // Default response or logging logic
                const status = 404;
                response = new Response(JSON.stringify({ error: 'Not Found' }), { status, headers: { 'Content-Type': 'application/json' } });
            }

            // Append CORS headers to every response
            const newHeaders = new Headers(response.headers);
            Object.entries(corsHeaders).forEach(([key, value]) => {
                newHeaders.set(key, value);
            });

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });

            // Try to parse body for logging other requests, but be safe
            let body: any = {};
            try {
                // Clone request to not consume body stream for downstream logic if needed 
                // (though for now we return above for known paths)
                if (request.method !== 'GET' && request.method !== 'HEAD') {
                    const clonedReq = request.clone();
                    body = await clonedReq.json();
                }
            } catch (e) {
                // Ignore JSON parse errors (e.g. empty body)
            }

            // Log worker request using the single instance
            logger.info('Worker request received', {
                type: body?.type,
                template: body?.template,
                filename: body?.filename,
                path: url.pathname
            });

            // Existing logic for PDF/ZIP
            const { type, template, data, filename } = body;
            const startTime = Date.now();
            let totalPages = 0;

            if (type === 'csv') {
                const csv = Papa.unparse(data);
                const endTime = Date.now();

                logger.info('CSV export generated', {
                    filename,
                    durationMs: endTime - startTime
                });
                logger.flush();

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

                logger.info('ZIP export generated', {
                    filename,
                    type: 'csv-zip',
                    durationMs: endTime - startTime
                });
                logger.flush();

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

                logger.info('PDF ZIP export generated', {
                    filename,
                    type: 'pdf-zip',
                    pageCount: totalPages,
                    durationMs: endTime - startTime
                });
                logger.flush();

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
                logger.info('PDF generated successfully', {
                    type: 'pdf',
                    template: template || 'standard',
                    pageCount: totalPages,
                    durationMs: endTime - startTime
                });
                logger.flush();

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

            logger.warn('Invalid Request Type', { type, template });
            logger.warn('Invalid Request Type', { type, template });
            logger.flush();
            return new Response('Invalid Request Type', { status: 400, headers: corsHeaders });
        } catch (error: any) {
            // Re-use existing logger instance
            logger.error('Worker Error', { error: error.message });
            logger.flush();

            return new Response(`Error: ${error.message}`, { status: 500, headers: corsHeaders });
        }
    },
};
