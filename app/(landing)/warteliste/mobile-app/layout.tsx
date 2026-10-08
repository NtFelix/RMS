import type { PropsWithChildren } from "react"
import type { Metadata } from "next"
import { pageMetadata, privateNoindexMetadata } from "@/lib/seo/metadata"
import { getFeatureFlagsForSEO } from "@/lib/posthog-feature-flags"

export const instant = false

// Keep the page out of the index while the show-produkte-dropdown flag is off
export async function generateMetadata(): Promise<Metadata> {
    const { showProdukte } = await getFeatureFlagsForSEO()
    return showProdukte ? pageMetadata.wartelisteMobileApp : { ...pageMetadata.wartelisteMobileApp, ...privateNoindexMetadata }
}

export default function MobileAppWaitlistLayout({ children }: PropsWithChildren) {
    return children
}
