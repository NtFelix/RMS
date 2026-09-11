import type { PropsWithChildren } from "react"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo/metadata"

export const instant = false

export const metadata: Metadata = pageMetadata.wartelisteBrowserErweiterung

export default function BrowserExtensionWaitlistLayout({ children }: PropsWithChildren) {
    return children
}
