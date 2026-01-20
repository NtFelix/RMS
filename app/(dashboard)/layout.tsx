import type React from "react"
import { headers } from "next/headers"
import { CSPNonceSync } from "@/components/providers/csp-nonce-sync"
import DashboardInnerLayout from "./layout-inner"

// Cloudflare Pages requires dynamic routes to be marked as edge
export const runtime = 'edge'

export default async function DashboardRootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const nonce = (await headers()).get('x-nonce')

    return (
        <>
            <CSPNonceSync nonce={nonce} />
            <DashboardInnerLayout>{children}</DashboardInnerLayout>
        </>
    )
}
