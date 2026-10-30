import type { PropsWithChildren } from "react"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata: Metadata = pageMetadata.authResetPassword

export default function ResetPasswordLayout({ children }: PropsWithChildren) {
    return children
}
