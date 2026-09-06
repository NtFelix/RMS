import type { PropsWithChildren } from "react"
import type { Metadata } from "next"
import { pageMetadata } from "@/lib/seo/metadata"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = pageMetadata.authResetPassword

export default function ResetPasswordLayout({ children }: PropsWithChildren) {
    return children
}
