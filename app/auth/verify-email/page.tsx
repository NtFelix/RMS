import { Suspense } from "react"
import VerifyEmailContent from "@/components/auth/verify-email-content"
import { AuthPageLoader } from "@/components/auth/auth-page-loader"

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<AuthPageLoader />}>
            <VerifyEmailContent />
        </Suspense>
    )
}
