import { Suspense } from "react"
import LoginContent from "@/components/auth/login-content"
import { AuthPageLoader } from "@/components/auth/auth-page-loader"

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthPageLoader />}>
      <LoginContent />
    </Suspense>
  )
}
