import { Suspense } from "react"
import VerifyEmailContent from "@/components/auth/verify-email-content"
import { AuthPageLoader } from "@/components/auth/auth-page-loader"

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<AuthPageLoader />}>
            <VerifyEmailContent />
        </Suspense>
    )
}
