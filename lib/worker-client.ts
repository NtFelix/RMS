import type { RechentageDetails } from "@/types/optimized-betriebskosten";
import type { Rechenbasis } from "@/utils/rechentage";

export const MIETEVO_BACKEND_URL = (process.env.MIETEVO_BACKEND_URL || process.env.NEXT_PUBLIC_MIETEVO_BACKEND_URL || 'https://backend.mietevo.de').trim();

const isBrowser = typeof window !== 'undefined';

async function safeFetch(body: any): Promise<Response> {
    const url = isBrowser ? '/api/worker' : MIETEVO_BACKEND_URL;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Worker failed (${response.status}): ${errorText}`);
        }

        return response;
    } catch (err) {
        console.error('[WorkerClient] Error calling backend:', err);
        throw err;
    }
}

export async function generateCSV(data: unknown[], filename?: string): Promise<Response> {
    return safeFetch({ data, filename, type: 'csv' });
}

export async function generateZIP(data: Record<string, unknown[]> | unknown[], filename?: string): Promise<Response> {
    return safeFetch({ data, filename, type: 'zip' });
}

/**
 * A single tenant's cost breakdown, as read by the worker's generateSingleTenantPDF
 * (workers/mietevo-backend/src/index.ts's TenantData; that worker cannot import app types, so
 * this mirrors it by hand). Callers may pass a richer object (e.g. TenantCostDetails) — only
 * these fields are ever read by the worker.
 */
type PdfTenantData = {
    apartmentName?: string;
    apartmentSize?: number;
    tenantName?: string;
    costItems?: {
        costName: string;
        totalCostForItem: number;
        /**
         * The worker's own type declares this as `string` (it only renders it, falling back to
         * '-'), but the app's distribution basis (OperatingCostBreakdown.costItems.distributionBasis
         * in types/optimized-betriebskosten.ts) can also be a number — kept wider here to match.
         */
        verteiler?: string | number;
        pricePerSqm?: number;
        tenantShare: number;
    }[];
    waterCost?: {
        tenantShare: number;
        consumption?: number;
    };
    vorauszahlungNextYear?: number;
    vorauszahlungen?: number;
    finalSettlement?: number;
    recommendedPrepayment?: number;
    /** Tenant's raw move-in / move-out date, only needed to explain 360-basis rounding */
    einzug?: string | null;
    auszug?: string | null;
    /**
     * How the tenant's Rechentage came about on the 360-day basis ("30/360"), passed through to
     * the worker's PDF so it can explain its distribution key (BGH VIII ZR 84/07). Only present
     * when nebenkostenItem.rechenbasis is '360_tage'; see utils/rechentage.ts's isRechenbasis360.
     * RechentageDetails is a superset of the worker's own TenantDataRechentage.
     */
    rechentage?: RechentageDetails;
};

/** The billing period item, as read by the worker's generateSingleTenantPDF (its NebenkostenItem) */
type PdfNebenkostenItem = {
    startdatum: string;
    enddatum: string;
    Haeuser?: { name: string } | null;
    zaehlerkosten?: Record<string, number> | null;
    zaehlerverbrauch?: Record<string, number> | null;
    /** '360_tage' switches the settlement to the 30/360 basis; see isRechenbasis360 */
    rechenbasis?: Rechenbasis;
};

/** The customer billing address, as read by the worker (falls back to ownerAddress/houseCity when absent) */
type PdfBillingAddress = {
    line1?: string;
    line2?: string;
    city?: string;
    postal_code?: string;
};

export type SingleTenantPdfPayload = {
    tenantData: PdfTenantData;
    nebenkostenItem: PdfNebenkostenItem;
    ownerName: string;
    ownerAddress: string;
    houseCity?: string;
    billingAddress?: PdfBillingAddress | null;
    filename?: string;
};

export async function generatePDF(payload: SingleTenantPdfPayload): Promise<Response> {
    return safeFetch({ ...payload, type: 'pdf' });
}

export async function generatePdfZIP(data: any[], filename?: string): Promise<Response> {
    return safeFetch({ data, filename, type: 'zip', template: 'pdf' });
}

export type HouseOverviewPdfPayload = {
    nebenkosten: {
        startdatum: string;
        enddatum: string;
        haus_name?: string;
        anzahlWohnungen?: number;
        anzahlMieter?: number;
        nebenkostenart?: string[] | null;
        betrag?: (number | null)[] | null;
        zaehlerkosten?: Record<string, number> | null;
        zaehlerverbrauch?: Record<string, number> | null;
        /** '360_tage' switches the settlement to the 30/360 basis; see isRechenbasis360 */
        rechenbasis?: Rechenbasis;
    };
    totalArea: number;
    totalCosts: number;
    costPerSqm: number;
    filename?: string;
};

export async function generateHouseOverviewPDF(payload: HouseOverviewPdfPayload): Promise<Response> {
    return safeFetch({ ...payload, type: 'pdf', template: 'house-overview' });
}
