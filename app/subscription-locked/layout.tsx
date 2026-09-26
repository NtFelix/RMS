import type { PropsWithChildren } from "react"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo/metadata"

export const instant = false

export const metadata: Metadata = pageMetadata.subscriptionLocked

export default function SubscriptionLockedLayout({ children }: PropsWithChildren) {
    return children
}
