import type { PropsWithChildren } from "react"
import type { Metadata } from "next"
import { privateNoindexMetadata } from "@/lib/seo"

export const instant = false

export const metadata: Metadata = {
    ...privateNoindexMetadata,
    title: "Checkout | Mietevo",
}

export default function CheckoutLayout({ children }: PropsWithChildren) {
    return children
}
