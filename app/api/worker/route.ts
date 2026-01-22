import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
    const backendUrl = (process.env.MIETEVO_BACKEND_URL || process.env.NEXT_PUBLIC_MIETEVO_BACKEND_URL || 'https://backend.mietevo.de').trim();

    try {
        const body = await request.json();

        const response = await fetch(backendUrl, {
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
    } catch (err: any) {
        console.error('[WorkerProxy] Proxy failed:', err);
        return new NextResponse(JSON.stringify({ error: 'Proxy failed', details: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
