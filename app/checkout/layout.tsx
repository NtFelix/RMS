import type { PropsWithChildren } from "react"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo/metadata"

export const instant = false

export const metadata: Metadata = pageMetadata.checkout

export default function CheckoutLayout({ children }: PropsWithChildren) {
    return children
}
