import type { PropsWithChildren } from "react"
import type { Metadata } from "next"
import { privateNoindexMetadata } from "@/lib/seo"

export const instant = false

export const metadata: Metadata = {
    ...privateNoindexMetadata,
    title: "Abo gesperrt | Mietevo",
}

export default function SubscriptionLockedLayout({ children }: PropsWithChildren) {
    return children
}
