import type { PropsWithChildren } from "react"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = pageMetadata.authUpdatePassword

export default function UpdatePasswordLayout({ children }: PropsWithChildren) {
    return children
}
