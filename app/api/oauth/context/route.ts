import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state');

    if (!state) {
        return NextResponse.json({ error: "Missing state" }, { status: 400 });
    }

    try {
        // Fetch from the Worker server-side to avoid CORS issues
        const workerUrl = `https://mcp.mietevo.de/auth/context?state=${state}`;
        console.log("Proxying context fetch to:", workerUrl);

        // Explicitly do NOT use 'mode: cors' here as this is server-to-server
        const res = await fetch(workerUrl);

        if (!res.ok) {
            const text = await res.text();
            console.error("Worker fetch failed:", res.status, text);
            return NextResponse.json({ error: "Worker fetch failed", details: text }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Proxy error:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
