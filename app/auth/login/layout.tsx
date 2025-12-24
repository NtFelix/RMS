import type { PropsWithChildren } from "react"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = pageMetadata.authLogin

export default function LoginLayout({ children }: PropsWithChildren) {
    return children
}
