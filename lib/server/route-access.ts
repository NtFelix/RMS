import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { ROUTES } from "@/lib/constants"
import { createClient } from "@/utils/supabase/server"
import { isTestEnv } from "@/lib/test-utils"

function buildLoginRedirect(pathname: string | null, search: string | null) {
  if (!pathname) {
    return ROUTES.LOGIN
  }

  const redirectTarget = `${pathname}${search ?? ""}`
  return `${ROUTES.LOGIN}?redirect=${encodeURIComponent(redirectTarget)}`
}

export async function requireAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    const requestHeaders = await headers()
    const pathname = requestHeaders.get("x-current-pathname")
    const search = requestHeaders.get("x-current-search")
    redirect(buildLoginRedirect(pathname, search))
  }

  // TypeScript cannot infer that redirect() never returns, so cast is needed
  return { supabase, user: user as User }
}

export async function requireActiveSubscription() {
  const { supabase, user } = await requireAuthenticatedUser()

  // Skip subscription check in E2E tests (test users don't have Stripe subscriptions)
  if (isTestEnv()) {
    return { supabase, user, profile: null }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_subscription_status")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error("Error fetching profile for subscription check:", profileError)
    // Throw error so Next.js error boundary catches it, rather than redirecting
    // to a confusing subscription-locked page.
    throw new Error("Failed to fetch user profile for subscription check. Please try again.")
  }

  if (
    !profile ||
    (profile.stripe_subscription_status !== "active" &&
      profile.stripe_subscription_status !== "trialing")
  ) {
    const params = new URLSearchParams()

    if (process.env.NODE_ENV !== "production") {
      if (!profile) {
        params.set("debug_profile_status", "missing")
      } else {
        params.set("debug_profile_status", "exists")
        params.set(
          "debug_stripe_status",
          profile.stripe_subscription_status || "null",
        )
      }
    }

    const queryString = params.size ? `?${params.toString()}` : ""
    redirect(`/subscription-locked${queryString}`)
  }

  return { supabase, user, profile }
}

export async function redirectAuthenticatedAuthRoute() {
  const requestHeaders = await headers()
  const pathname = requestHeaders.get("x-current-pathname")
  const search = requestHeaders.get("x-current-search")

  if (!pathname || pathname.startsWith(ROUTES.LOGIN)) {
    return
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    let redirectTarget: string = ROUTES.HOME
    if (search) {
      const searchParams = new URLSearchParams(search)
      const redirectParam = searchParams.get("redirect")
      if (redirectParam) {
        try {
          // Parse with a dummy local origin to ensure it is strictly a relative path
          const url = new URL(redirectParam, "http://localhost")
          if (url.origin === "http://localhost") {
            redirectTarget = redirectParam
          }
        } catch {
          // ignore invalid URLs
        }
      }
    }
    redirect(redirectTarget)
  }
}
