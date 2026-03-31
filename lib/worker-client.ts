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

export async function generatePDF(payload: {
    tenantData: any;
    nebenkostenItem: any;
    ownerName: string;
    ownerAddress: string;
    houseCity?: string;
    billingAddress?: any;
    filename?: string;
}): Promise<Response> {
    return safeFetch({ ...payload, type: 'pdf' });
}

export async function generatePdfZIP(data: any[], filename?: string): Promise<Response> {
    return safeFetch({ data, filename, type: 'zip', template: 'pdf' });
}

export async function generateHouseOverviewPDF(payload: {
    nebenkosten: any;
    totalArea: number;
    totalCosts: number;
    costPerSqm: number;
    filename?: string;
}): Promise<Response> {
    return safeFetch({ ...payload, type: 'pdf', template: 'house-overview' });
}
