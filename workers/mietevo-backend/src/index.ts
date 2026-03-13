import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { GoogleGenAI } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WorkerLogger, ExecutionContext } from './logger';
import pako from 'pako';
import { PostHog } from 'posthog-node';

// --- Type Definitions ---

export interface Env {
    GEMINI_API_KEY: string;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    POSTHOG_API_KEY?: string;
    POSTHOG_HOST?: string;
    RATE_LIMITER: unknown; // Using 'unknown' instead of 'any'
    WORKER_AUTH_KEY?: string;
    [key: string]: unknown;
}

interface AIRequest {
    message: string;
    sessionId?: string;
    context?: unknown; // Use 'unknown' instead of 'any'
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


import { formatCurrency, isoToGermanDate, roundToNearest5 } from './utils';

// --- Constants ---
const QUEUE_VISIBILITY_TIMEOUT = 60;

// --- PDF Generation Functions (Preserved) ---

interface TenantData {
    apartmentName?: string;
    apartmentSize?: number;
    tenantName?: string;
    costItems?: {
        costName: string;
        totalCostForItem: number;
        verteiler?: string;
        pricePerSqm?: number;
        tenantShare: number;
    }[];
    waterCost?: {
        tenantShare: number;
        consumption: number;
    };
    vorauszahlungNextYear?: number;
    vorauszahlungen?: number;
    finalSettlement?: number;
    recommendedPrepayment?: number;
}

interface NebenkostenItem {
    startdatum: string;
    enddatum: string;
    Haeuser?: { name: string };
    zaehlerkosten?: Record<string, number>;
    zaehlerverbrauch?: Record<string, number>;
}

export interface SingleTenantPayload {
    tenantData: TenantData;
    nebenkostenItem: NebenkostenItem;
    ownerName?: string;
    ownerAddress?: string;
    billingAddress?: {
        line1?: string;
        line2?: string;
        city?: string;
        postal_code?: string;
    };
    houseCity?: string;
}

function generateSingleTenantPDF(doc: jsPDF, payload: SingleTenantPayload) {
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
    const tableRows: unknown[][] = [];

    if (tenantData.costItems) {
        tenantData.costItems.forEach((item: {
            costName: string;
            totalCostForItem: number;
            verteiler?: string;
            pricePerSqm?: number;
            tenantShare: number;
        }) => {
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
        willDrawCell: function (data: unknown) {
            const d = data as { section: string; column: { index: number }; cell: { styles: { halign: string } } };
            if (d.section === 'head' && d.column.index >= 1) {
                d.cell.styles.halign = 'right';
            }
        },
        tableWidth: doc.internal.pageSize.getWidth() - 40,
        margin: { left: 20, right: 20 }
    });

    const tableFinalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY;
    startY = typeof tableFinalY === 'number' ? tableFinalY + 6 : startY + 10;

    const sumOfTotalCostForItem = tenantData.costItems ? tenantData.costItems.reduce((sum: number, item: { totalCostForItem: number }) => sum + item.totalCostForItem, 0) : 0;
    const sumOfTenantSharesFromCostItems = tenantData.costItems ? tenantData.costItems.reduce((sum: number, item: { tenantShare: number }) => sum + item.tenantShare, 0) : 0;

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

    // Price per unit shown on PDF is the weighted average across all meter types (for display only)
    // The actual tenant cost (tenantWaterShare) is already calculated per-type upstream
    const pricePerCubicMeterCalc = tenantWaterConsumption > 0 ? tenantWaterShare / tenantWaterConsumption : 0;

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

export interface HouseOverviewPayload {
    nebenkosten: {
        startdatum: string;
        enddatum: string;
        haus_name?: string;
        anzahlWohnungen?: number;
        anzahlMieter?: number;
        nebenkostenart?: string[];
        betrag?: (number | null)[];
        zaehlerkosten?: Record<string, number>;
        zaehlerverbrauch?: Record<string, number>;
    };
    totalArea: number;
    totalCosts: number;
    costPerSqm: number;
}

function generateHouseOverviewPDF(doc: jsPDF, payload: HouseOverviewPayload) {
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
        didParseCell: function (data: unknown) {
            const d = data as {
                row: { index: number };
                section: string;
                column: { index: number };
                cell: { styles: { fontStyle: string; fillColor: number[]; halign: string } };
            };
            if (d.row.index === tableData.length - 1) {
                d.cell.styles.fontStyle = 'bold';
                d.cell.styles.fillColor = [248, 248, 248];
            }
            if (d.section === 'head') {
                if (d.column.index === 2 || d.column.index === 3) {
                    d.cell.styles.halign = 'right';
                } else {
                    d.cell.styles.halign = 'left';
                }
            }
        }
    });

    if (nebenkosten.zaehlerkosten && Object.keys(nebenkosten.zaehlerkosten).length > 0) {
        let meterY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 15;

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Zählerkosten", 20, meterY);
        meterY += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        Object.entries(nebenkosten.zaehlerkosten).forEach(([typ, kosten]) => {
            const config = (ZAEHLER_CONFIG as Record<string, { label: string; einheit: string }>)[typ] || { label: typ, einheit: 'm³' };
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

async function fetchDocumentationContext(supabase: SupabaseClient, query: string): Promise<string> {
    if (!query) return "";

    try {
        // Use Supabase text search on 'Dokumentation' table
        // Note: This relies on the 'search_documentation' RPC function existing or using simple textSearch
        // We will try simple text search first as it's safer if RPC isn't deployed

        // Option 1: RPC call (Preferred if exists)
        const { data: rpcData, error: rpcError } = await supabase.rpc('search_documentation', {
            search_query: query
        });

        let records: { seiteninhalt?: string; titel?: string; kategorie?: string }[] = [];
        if (!rpcError && rpcData && Array.isArray(rpcData)) {
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

            if (!error && data && Array.isArray(data)) {
                records = data;
            }
        }

        if (records.length === 0) return "";

        let contextText = '\n\nDokumentationskontext:\n';
        records.slice(0, 5).forEach((record: { seiteninhalt?: string; titel?: string; kategorie?: string }) => {
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

export async function handleAIRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const logger = new WorkerLogger(env, ctx);
    const requestStartTime = Date.now();

    try {
        const body = await request.json() as AIRequest;
        const { message, sessionId, context } = body;

        logger.info('AI request received', {
            sessionId,
            messageLength: message?.length || 0,
            hasContext: !!context
        });

        // Check for API key
        if (!env.GEMINI_API_KEY) {
            logger.error('AI request failed: Gemini API key not configured');
            logger.flush();
            return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500 });
        }

        // Rate Limiting
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        logger.info('Checking rate limit', { ip });
        if (env.RATE_LIMITER) {
            const { success } = await (env.RATE_LIMITER as { limit: (options: { key: string }) => Promise<{ success: boolean }> }).limit({ key: ip });
            if (!success) {
                logger.warn('Rate limit exceeded, rejecting request', { ip });
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
        logger.info('Rate limit check passed', { ip });

        // Initialize Supabase if credentials exist
        let contextText = "";
        if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
            logger.info('Fetching documentation context from database');
            const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
            contextText = await fetchDocumentationContext(supabase, message);
            logger.info('Documentation context fetched', { contextLength: contextText.length });
        } else {
            logger.warn('Supabase credentials not configured, skipping context fetch');
        }

        // Initialize Gemini
        const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        const fullPrompt = `${SYSTEM_INSTRUCTION}\n\nUser Message: ${message}\n${contextText}`;
        logger.info('Initializing Gemini API', { model: 'gemini-3.1-flash-lite-preview', promptLength: fullPrompt.length });

        // Retry logic with exponential backoff
        const maxRetries = 3;
        let attempt = 0;
        let stream: unknown = null; // Use unknown instead of any
        let lastError: { message?: string } | null = null;
        const aiStartTime = Date.now();

        while (attempt < maxRetries) {
            try {
                logger.info('Attempting AI connection', { attempt: attempt + 1, maxRetries });
                stream = await client.models.generateContentStream({
                    model: 'models/gemini-3.1-flash-lite-preview',
                    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
                });
                logger.info('AI connection successful', { attempt: attempt + 1 });
                break; // Success
            } catch (err: unknown) {
                lastError = err as { message?: string };
                logger.warn('AI connection attempt failed', {
                    attempt: attempt + 1,
                    error: lastError?.message
                });
                attempt++;
                if (attempt >= maxRetries) break; // Failed after max retries

                // Wait before retrying (exponential backoff: 1s, 2s, 4s...)
                const delay = Math.pow(2, attempt - 1) * 1000;
                logger.info('Waiting before retry', { delayMs: delay });
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        if (!stream) {
            logger.error('AI request failed: all retry attempts exhausted', {
                lastError: lastError?.message,
                totalAttempts: maxRetries
            });
            throw new Error(lastError?.message || "Failed to connect to AI service after multiple attempts.");
        }
        logger.info('AI stream initialized, starting response', { setupDurationMs: Date.now() - aiStartTime });

        // Create stream for response
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream as AsyncIterable<{ text: string | (() => string) }>) {
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
                } catch (e: unknown) {
                    const errorData = JSON.stringify({
                        type: 'error',
                        error: (e as Error).message,
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
        const totalSetupTime = Date.now() - requestStartTime;
        logger.info('AI request stream started', {
            sessionId,
            setupDurationMs: totalSetupTime
        });
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

    } catch (e: unknown) {
        const err = e as { message?: string; status?: number };
        logger.error('AI request failed with error', {
            error: err.message,
            durationMs: Date.now() - requestStartTime
        });
        logger.flush();
        const errorMessage = err.message || "An unexpected error occurred.";
        const statusCode = err.status || 500;

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

async function downloadAndDecompressEmail(supabase: SupabaseClient, dateipfad: string): Promise<string> {
    const { data: bodyBlob, error: downloadError } = await supabase.storage
        .from('mails')
        .download(dateipfad);

    if (downloadError || !bodyBlob) {
        throw new Error('Failed to download email body: ' + ((downloadError as { message?: string })?.message || 'Unknown error'));
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
    } catch (e: unknown) {
        // If it fails, maybe it wasn't gzipped or was just text?
        // But RMS implementation always gzips using pako.
        throw new Error('Failed to decompress email body: ' + String(e));
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
        } catch (error: unknown) {
            const err = error as { message?: string; status?: number };
            lastError = error as Error;

            // Check if it's a rate limit error (429) or a transient server error (500)
            const isRateLimit = err?.message?.includes('429') ||
                err?.message?.includes('RESOURCE_EXHAUSTED') ||
                err?.status === 429;
            
            const isTransientError = err?.status === 500 || 
                err?.message?.includes('Internal error') ||
                err?.message?.includes('Agent inference failed') ||
                err?.message?.includes('overloaded');

            if ((isRateLimit || isTransientError) && attempt < maxRetries) {
                const delay = baseDelayMs * Math.pow(2, attempt); // Exponential backoff
                console.log(`Transient or rate limit error (${err?.message}). Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
                await sleep(delay);
            } else {
                throw error;
            }
        }
    }

    throw lastError as Error;
}

async function analyzeApplicantWithAI(env: Env, emailContent: string): Promise<{
    result: unknown;
    prompt: string;
    usage: { model: string; inputTokens?: number; outputTokens?: number; totalTokens?: number; latencyMs: number; };
}> {
    const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const model = 'gemini-3.1-flash-lite-preview'; // Latest high-speed, cost-efficient model for batch tasks
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

    Email Content (delimited by ---):
    ---
    ${emailContent.substring(0, 30000)}
    ---

    Output Schema:
    ${schema}
    `;

    const apiResult = await (client.models.generateContent as unknown as (params: unknown) => Promise<unknown>)({
        model: model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
    });

    const latencyMs = Date.now() - startTime;
    const typedResult = apiResult as unknown as {
        usageMetadata?: { promptTokenCount?: number; input_tokens?: number; candidatesTokenCount?: number; output_tokens?: number; totalTokenCount?: number; total_tokens?: number };
        usage?: { promptTokenCount?: number; input_tokens?: number; candidatesTokenCount?: number; output_tokens?: number; totalTokenCount?: number; total_tokens?: number };
        text?: string | (() => string);
        response?: { text?: string | (() => string) };
        candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const usageMetadata = typedResult.usageMetadata || typedResult.usage || {};

    // Check if result has text directly or via response
    // Based on lint error: 'Property response does not exist on type GenerateContentResponse'
    // For @google/genai SDK v1.x+, result has .text as a getter property (not a method)
    // Access as property, not function call

    let responseText: string;

    if (typeof typedResult.text === 'string') {

        // Direct .text property (v1.x SDK)

        responseText = typedResult.text;

    } else if (typeof typedResult.text === 'function') {

        // .text() method (older SDK versions)

        responseText = typedResult.text();

    } else if (typedResult.response?.text) {

        // Nested response structure

        responseText = typeof typedResult.response.text === 'function'

            ? typedResult.response.text()

            : typedResult.response.text;

    } else if (typedResult.candidates?.[0]?.content?.parts?.[0]?.text) {

        // Raw candidate structure

        responseText = typedResult.candidates[0].content.parts[0].text;

    } else {
        responseText = JSON.stringify(apiResult);
    }

    // Parse the JSON result
    let parsedResult;
    try {
        parsedResult = JSON.parse(responseText);
    } catch (e) {
        // Fallback to regex if direct parse fails (maybe markdown code blocks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                parsedResult = JSON.parse(jsonMatch[0]);
            } catch (e2: unknown) {
                throw new Error(`Failed to parse JSON: ${(e2 as Error).message}`);
            }
        } else {
            throw new Error(`Failed to extract JSON from AI response: ${responseText}`);
        }
    }

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


export async function processQueue(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const logger = new WorkerLogger(env, ctx);

    // Auth Check
    const authHeader = request.headers.get('x-worker-auth');
    if (env.WORKER_AUTH_KEY && authHeader !== env.WORKER_AUTH_KEY) {
        logger.error('Unauthorized access attempt', { workerAuthKeyConfigured: !!env.WORKER_AUTH_KEY });
        logger.flush();
        return new Response('Unauthorized', { status: 401 });
    }

    logger.info('Queue processing started', { workerAuthKeyConfigured: !!env.WORKER_AUTH_KEY });
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Get user_id from body if available for ownership tracking
    let userIdForTracking = 'system';
    try {
        const clonedReq = request.clone();
        const body = await clonedReq.json() as { user_id?: string };
        if (body.user_id) userIdForTracking = body.user_id;
    } catch (e) {
        // Ignore parsing errors for requests without a body
    }

    // PostHog instance holder
    let posthog: PostHog | null = null;

    try {
        // 1. Read from Queue
        // vt: visibility timeout from constant
        const { data: messages, error: readError } = await supabase.rpc('pgmq_read', {
            queue_name: 'applicant_ai_processing',
            vt: QUEUE_VISIBILITY_TIMEOUT,
            qty: 1
        });

        if (readError) {
            logger.error('PGMQ Read Error', { error: readError.message, code: readError.code });
            logger.flush();
            return new Response('Queue Read Error', { status: 500 });
        }

        logger.info('Queue read attempted', { messageCount: messages?.length || 0 });

        if (!messages || messages.length === 0) {
            // Queue is empty, stop the chain
            logger.info('Queue Empty', {});
            logger.flush();
            return new Response(JSON.stringify({ status: 'done', message: 'Queue empty', hasMore: false }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Initialize PostHog only if we have work
        if (env.POSTHOG_API_KEY) {
            posthog = new PostHog(env.POSTHOG_API_KEY, {
                host: env.POSTHOG_HOST || 'https://eu.i.posthog.com',
                flushAt: 1,
                flushInterval: 0,
            });
        }

        const task = messages[0] as QueueTask;
        const msgId = task.msg_id;
        const { mail_id, user_id } = task.message;
        let { dateipfad } = task.message;
        const processingStartTime = Date.now();

        // Use user_id from task if available
        if (user_id) userIdForTracking = user_id;

        logger.info('Queue item received', {
            msgId,
            mailId: mail_id,
            userId: userIdForTracking,
            visibilityTimeout: QUEUE_VISIBILITY_TIMEOUT
        });

        // 2. Fetch dateipfad from Mail_Metadaten if not provided
        if (!dateipfad && mail_id) {
            const { data: mailData, error: mailError } = await supabase
                .from('Mail_Metadaten')
                .select('dateipfad')
                .eq('id', mail_id)
                .single();

            if (mailError) {
                logger.error('Failed to fetch mail metadata', { mailId: mail_id, error: mailError.message, code: mailError.code });
            } else if (mailData?.dateipfad) {
                dateipfad = mailData.dateipfad;
                logger.info('Mail metadata fetched successfully', { mailId: mail_id, dateipfad });
            } else {
                logger.warn('No dateipfad found in mail metadata', { mailId: mail_id });
            }
        }

        // 3. Process Item
        let aiResult = null;
        let aiScore = null;
        const aiStartTime = Date.now();

        if (dateipfad) {
            try {
                // Download & AI with retry for rate limits
                logger.info('Starting email download', { msgId, mailId: mail_id, dateipfad });
                const emailContent = await downloadAndDecompressEmail(supabase, dateipfad);
                logger.info('Email downloaded, starting AI analysis', { msgId, mailId: mail_id, contentLength: emailContent.length });

                const aiResponse = await withRetry(() => analyzeApplicantWithAI(env, emailContent));
                aiResult = aiResponse.result;
                aiScore = (aiResult as { application?: { completenessScore?: number } }).application?.completenessScore || null;
                const aiDuration = Date.now() - aiStartTime;

                logger.info('AI analysis completed', {
                    msgId,
                    mailId: mail_id,
                    aiDurationMs: aiDuration,
                    model: aiResponse.usage?.model,
                    completenessScore: aiScore
                });

                // Log LLM generation to PostHog for LLM Analytics dashboard
                if (posthog) {
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
                    // Shutdown is handled at the end of function
                }

                logger.info('LLM Analysis Complete', {
                    model: aiResponse.usage.model,
                    latencyMs: aiResponse.usage.latencyMs,
                    mailId: mail_id,
                    score: aiScore || 0,
                    totalProcessingMs: Date.now() - processingStartTime
                });

                // Update DB with Top-Level fields for easier access/sorting
                logger.info('Updating tenant record in database', { mailId: mail_id, msgId });
                const updates: Record<string, unknown> = {
                    bewerbung_metadaten: aiResult,
                    bewerbung_score: aiScore
                };

                const personalInfo = (aiResult as { personalInfo?: Record<string, string> })?.personalInfo;
                if (personalInfo) {
                    if (personalInfo.firstName || personalInfo.lastName) {
                        updates.name = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim();
                    }
                    if (personalInfo.email) {
                        updates.email = personalInfo.email;
                    }
                    if (personalInfo.phone) {
                        updates.telefonnummer = personalInfo.phone;
                    }
                }

                const { error: updateError } = await supabase
                    .from('Mieter')
                    .update(updates)
                    .eq('bewerbung_mail_id', mail_id);

                if (updateError) {
                    logger.error('Database update failed', { msgId, mailId: mail_id, error: updateError.message, code: updateError.code });
                    throw updateError;
                }
                logger.info('Tenant record updated successfully', { mailId: mail_id, msgId });

            } catch (processError: unknown) {
                logger.error('Queue item processing failed', {
                    msgId,
                    mailId: mail_id,
                    error: (processError as Error).message,
                    hasDateipfad: !!dateipfad,
                    processingDurationMs: Date.now() - processingStartTime
                });
                // By re-throwing the error, we prevent the message from being deleted,
                // allowing it to be retried later after the visibility timeout.
                // For a more advanced system, consider a dead-letter queue after N retries.
                throw processError;
            }
        } else {
            logger.warn('No dateipfad available for task, skipping AI processing', { msgId, mailId: mail_id });
        }

        // 3. Delete from Queue
        logger.info('Deleting processed item from queue', { msgId, mailId: mail_id });
        await supabase.rpc('pgmq_delete', {
            queue_name: 'applicant_ai_processing',
            msg_id: msgId
        });

        const totalDuration = Date.now() - processingStartTime;
        logger.info('Queue item processed successfully', {
            msgId,
            mailId: mail_id,
            totalDurationMs: totalDuration,
            hadDateipfad: !!dateipfad
        });

        // Return hasMore: true so client can trigger next processing.
        // The next call will return hasMore: false if the queue is actually empty.
        return new Response(JSON.stringify({
            status: 'processed',
            msgId,
            hasMore: true
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: unknown) {
        logger.error('Queue processing failed with unhandled error', {
            error: (e as Error).message,
            errorType: (e as Error).name
        });

        return new Response(JSON.stringify({ error: (e as Error).message, hasMore: false }), { status: 500 });
    } finally {
        await Promise.all([
            logger.flush(),
            posthog ? posthog.shutdown() : Promise.resolve()
        ]);
    }
}

// --- File Generation Logic ---

export async function handleFileGeneration(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const logger = new WorkerLogger(env, ctx);
    let body: {
        type?: string;
        template?: string;
        data?: unknown;
        filename?: string;
    } = {};

    try {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            const clonedReq = request.clone();
            body = await clonedReq.json();
        }
    } catch (e) {
        logger.warn('Failed to parse request body', { error: (e as Error).message });
    }

    logger.info('File generation request received', {
        type: body?.type || 'unknown',
        template: body?.template || 'none',
        filename: body?.filename || 'none',
        path: new URL(request.url).pathname,
        method: request.method
    });

    const { type, template, data, filename } = body;
    const startTime = Date.now();
    let totalPages = 0;

    if (type === 'csv') {
        try {
            logger.info('Generating CSV export', { filename, dataItems: Array.isArray(data) ? data.length : 0 });
            const csv = Papa.unparse(data as unknown[] | Record<string, unknown>[]);
            const endTime = Date.now();

            logger.info('CSV export completed', {
                filename,
                durationMs: endTime - startTime,
                csvSize: csv.length
            });
            logger.flush();

            return new Response(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="${filename || 'export.csv'}`,
                    'X-PDF-Page-Count': '0',
                    'X-PDF-Generation-Time': (endTime - startTime).toString(),
                    'Access-Control-Expose-Headers': 'X-PDF-Page-Count, X-PDF-Generation-Time'
                },
            });
        } catch (err) {
            logger.error('CSV generation failed', { error: (err as Error).message, filename });
            logger.flush();
            return new Response(JSON.stringify({ error: 'CSV generation failed', details: (err as Error).message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    if (type === 'zip' && !template) {
        try {
            logger.info('Generating CSV ZIP export', { filename, itemCount: Array.isArray(data) ? data.length : 0 });
            const zip = new JSZip();
            if (Array.isArray(data)) {
                data.forEach((item: { data: unknown; name: string }) => {
                    const csv = Papa.unparse(item.data as unknown[]);
                    zip.file(`${item.name}.csv`, csv);
                });
            } else {
                Object.entries(data as Record<string, unknown>).forEach(([name, content]: [string, unknown]) => {
                    const csv = Papa.unparse(content as unknown[]);
                    zip.file(`${name}.csv`, csv);
                });
            }
            const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
            const endTime = Date.now();

            logger.info('CSV ZIP export completed', {
                filename,
                type: 'csv-zip',
                durationMs: endTime - startTime,
                zipSize: zipBuffer.length
            });
            logger.flush();

            return new Response(zipBuffer as unknown as BodyInit, {
                headers: {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': `attachment; filename="${filename || 'export.zip'}`,
                    'X-PDF-Page-Count': '0',
                    'X-PDF-Generation-Time': (endTime - startTime).toString(),
                    'Access-Control-Expose-Headers': 'X-PDF-Page-Count, X-PDF-Generation-Time'
                }
            });
        } catch (err) {
            logger.error('ZIP generation failed', { error: (err as Error).message, filename });
            logger.flush();
            return new Response(JSON.stringify({ error: 'ZIP generation failed', details: (err as Error).message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    if (type === 'zip' && template === 'pdf') {
        try {
            logger.info('Generating PDF ZIP export', { filename, itemCount: (data as { data: SingleTenantPayload; name: string }[]).length });
            const zip = new JSZip();
            for (const item of (data as { data: SingleTenantPayload; name: string }[])) {
                const doc = new jsPDF();
                generateSingleTenantPDF(doc, item.data);
                totalPages += doc.getNumberOfPages();
                zip.file(`${item.name}.pdf`, doc.output('arraybuffer'));
            }
            const zipBuffer = await zip.generateAsync({ type: 'uint8array' });
            const endTime = Date.now();

            logger.info('PDF ZIP export completed', {
                filename,
                type: 'pdf-zip',
                pageCount: totalPages,
                durationMs: endTime - startTime,
                zipSize: zipBuffer.length
            });
            logger.flush();

            return new Response(zipBuffer as unknown as BodyInit, {
                headers: {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': `attachment; filename="${filename || 'export.zip'}`,
                    'X-PDF-Page-Count': totalPages.toString(),
                    'X-PDF-Generation-Time': (endTime - startTime).toString(),
                    'Access-Control-Expose-Headers': 'X-PDF-Page-Count, X-PDF-Generation-Time'
                }
            });
        } catch (err) {
            logger.error('PDF ZIP generation failed', { error: (err as Error).message, filename });
            logger.flush();
            return new Response(JSON.stringify({ error: 'PDF ZIP generation failed', details: (err as Error).message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    if (type === 'pdf') {
        try {
            logger.info('Generating PDF', { template: template || 'standard', filename });
            const doc = new jsPDF();
            if (template === 'house-overview') {
                generateHouseOverviewPDF(doc, body as unknown as HouseOverviewPayload);
            } else {
                generateSingleTenantPDF(doc, body as unknown as SingleTenantPayload);
            }
            totalPages = doc.getNumberOfPages();
            const pdfBuffer = doc.output('arraybuffer');
            const endTime = Date.now();

            logger.info('PDF generation completed', {
                type: 'pdf',
                template: template || 'standard',
                pageCount: totalPages,
                durationMs: endTime - startTime,
                pdfSize: pdfBuffer.byteLength
            });
            logger.flush();

            return new Response(new Uint8Array(pdfBuffer) as unknown as BodyInit, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${filename || 'document.pdf'}`,
                    'X-PDF-Page-Count': totalPages.toString(),
                    'X-PDF-Generation-Time': (endTime - startTime).toString(),
                    'Access-Control-Expose-Headers': 'X-PDF-Page-Count, X-PDF-Generation-Time'
                }
            });
        } catch (err) {
            logger.error('PDF generation failed', { error: (err as Error).message, template: template || 'standard' });
            logger.flush();
            return new Response(JSON.stringify({ error: 'PDF generation failed', details: (err as Error).message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // Unknown type
    logger.error('Unknown file generation type', { type: type || 'none', template: template || 'none' });
    logger.flush();
    return new Response('Unknown file type', { status: 400 });
}

// --- Main Handler ---

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const logger = new WorkerLogger(env, ctx);
        const requestStartTime = Date.now();

        const origin = request.headers.get('Origin') || '*';
        const corsHeaders: Record<string, string> = {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400',
            'Access-Control-Expose-Headers': 'X-PDF-Page-Count, X-PDF-Generation-Time',
        };

        const url = new URL(request.url);
        logger.info('Worker request received', {
            method: request.method,
            pathname: url.pathname,
            userAgent: request.headers.get('User-Agent') || 'none'
        });

        // Handle CORS preflight requests
        if (request.method === "OPTIONS") {
            logger.info('CORS preflight handled', { pathname: url.pathname });
            return new Response(null, {
                headers: corsHeaders
            });
        }

        try {
            // Route based on URL path first (more robust)
            let response: Response;
            if (url.pathname === '/ai') {
                response = await handleAIRequest(request, env, ctx);
            } else if (url.pathname === '/process-queue') {
                response = await processQueue(request, env, ctx);
            } else {
                // Fallback to file generation logic (PDF/ZIP/CSV)
                response = await handleFileGeneration(request, env, ctx);
            }

            // Append CORS headers to every response
            const newHeaders = new Headers(response.headers);
            Object.entries(corsHeaders).forEach(([key, value]) => {
                newHeaders.set(key, value);
            });

            const duration = Date.now() - requestStartTime;
            logger.info('Worker request completed', {
                pathname: url.pathname,
                status: response.status,
                durationMs: duration
            });
            logger.flush();

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });

        } catch (error: unknown) {
            // Re-use existing logger instance
            logger.error('Worker request failed with unhandled error', {
                error: (error as Error).message,
                pathname: url.pathname,
                method: request.method,
                durationMs: Date.now() - requestStartTime
            });
            logger.flush();

            return new Response(`Error: ${(error as Error).message}`, { status: 500, headers: corsHeaders });
        }
    },
};
