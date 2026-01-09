import type { PropsWithChildren } from "react"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = pageMetadata.authRegister

export default function RegisterLayout({ children }: PropsWithChildren) {
    return children
}
