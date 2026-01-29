import { NextResponse } from 'next/server';
export const runtime = 'edge';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return response;
    } catch (err: unknown) {
        // Edge runtime primarily throws TypeError for fetch failures or AbortError for timeouts
        const error = err instanceof Error ? err : new Error(String(err));
        const errorName = error.name;
        const errorMessage = error.message;

        const shouldRetry = retries > 0 && (
            errorName === 'AbortError' ||
            errorName === 'TypeError' ||
            errorMessage?.toLowerCase().includes('failed')
        );

        if (shouldRetry) {
            console.warn(`[WorkerProxy] Fetch failed (${errorName}), retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, INITIAL_RETRY_DELAY * (MAX_RETRIES - retries + 1)));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}

export async function POST(request: Request) {
    const backendUrl = (process.env.MIETEVO_BACKEND_URL || 'https://backend.mietevo.de').trim();

    console.log('[WorkerProxy] Proxying request to:', backendUrl);

    try {
        const body = await request.json();

        const response = await fetchWithRetry(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[WorkerProxy] Backend error:', response.status, errorText);
            return new NextResponse(errorText, { status: response.status });
        }

        // Forward the binary response from the worker
        const responseHeaders = new Headers();
        const contentType = response.headers.get('Content-Type');
        const contentDisp = response.headers.get('Content-Disposition');
        const pageCount = response.headers.get('X-PDF-Page-Count');
        const generationTime = response.headers.get('X-PDF-Generation-Time');

        if (contentType) responseHeaders.set('Content-Type', contentType);
        if (contentDisp) responseHeaders.set('Content-Disposition', contentDisp);
        if (pageCount) responseHeaders.set('X-PDF-Page-Count', pageCount);
        if (generationTime) responseHeaders.set('X-PDF-Generation-Time', generationTime);

        // Expose headers for the frontend
        responseHeaders.set('Access-Control-Expose-Headers', 'X-PDF-Page-Count, X-PDF-Generation-Time');

        return new NextResponse(response.body, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[WorkerProxy] Proxy failed:', error);
        return new NextResponse(JSON.stringify({
            error: 'Proxy failed',
            details: error.message,
            name: error.name
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
