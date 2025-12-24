import type { PropsWithChildren } from "react"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = pageMetadata.authVerifyEmail

export default function VerifyEmailLayout({ children }: PropsWithChildren) {
    return children
}
