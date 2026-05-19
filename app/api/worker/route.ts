import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { NO_CACHE_HEADERS } from '@/lib/constants/http';
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
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('[WorkerProxy] Authentication failed:', authError?.message || 'No user');
            return NextResponse.json({ error: 'Unauthorized' }, { 
                status: 401,
                headers: NO_CACHE_HEADERS
            });
        }

        const url = new URL(request.url);
        const subPath = url.pathname.replace('/api/worker', '');
        const backendBaseUrl = (process.env.MIETEVO_BACKEND_URL || 'https://backend.mietevo.de').trim().replace(/\/$/, '');
        const backendUrl = backendBaseUrl + subPath + url.search;
        const workerAuthKey = process.env.WORKER_AUTH_KEY;

        console.log('[WorkerProxy] Proxying request to:', backendUrl, 'for user:', user.id);

        let body;
        try {
            body = await request.json();
            // Ensure the request is attributed to the authenticated user
            if (body && typeof body === 'object') {
                body.user_id = user.id;
            }
        } catch (e) {
            console.warn('[WorkerProxy] Invalid JSON body:', (e as Error).message);
            return NextResponse.json({ error: 'Invalid JSON body' }, { 
                status: 400, 
                headers: NO_CACHE_HEADERS 
            });
        }

        const response = await fetchWithRetry(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(workerAuthKey ? { 'x-worker-auth': workerAuthKey } : {})
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[WorkerProxy] Backend error:', response.status, errorText);
            return new NextResponse(errorText, { 
                status: response.status,
                headers: NO_CACHE_HEADERS
            });
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

        // Apply NO_CACHE_HEADERS
        Object.entries(NO_CACHE_HEADERS).forEach(([key, value]) => {
            responseHeaders.set(key, value);
        });

        return new NextResponse(response.body, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('[WorkerProxy] Proxy failed:', error);
        return NextResponse.json({
            error: 'Proxy failed',
            details: error.message,
            name: error.name
        }, {
            status: 500,
            headers: NO_CACHE_HEADERS,
        });
    }
}
