import type { PropsWithChildren } from "react"
import type { Metadata } from "next"
import { privateNoindexMetadata } from "@/lib/seo"

export const instant = false

export const metadata: Metadata = {
    ...privateNoindexMetadata,
    title: "Einladung annehmen | Mietevo",
}

export default function EinladungAnnehmenLayout({ children }: PropsWithChildren) {
    return children
}
