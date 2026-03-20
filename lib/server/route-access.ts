import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { ROUTES } from "@/lib/constants"
import { createClient } from "@/utils/supabase/server"

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

  return { supabase, user: user as User }
}

export async function requireActiveSubscription() {
  const { supabase, user } = await requireAuthenticatedUser()

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("stripe_subscription_status")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error("Error fetching profile for subscription check:", profileError)
    redirect("/?error=profile_fetch_failed")
  }

  if (
    !profile ||
    (profile.stripe_subscription_status !== "active" &&
      profile.stripe_subscription_status !== "trialing")
  ) {
    const redirectUrl = new URL("/subscription-locked", "https://mietevo.de")

    if (process.env.NODE_ENV !== "production") {
      if (!profile) {
        redirectUrl.searchParams.set("debug_profile_status", "missing")
      } else {
        redirectUrl.searchParams.set("debug_profile_status", "exists")
        redirectUrl.searchParams.set(
          "debug_stripe_status",
          profile.stripe_subscription_status || "null",
        )
      }
    }

    redirect(`${redirectUrl.pathname}${redirectUrl.search}`)
  }

  return { supabase, user, profile }
}

export async function redirectAuthenticatedAuthRoute() {
  const requestHeaders = await headers()
  const pathname = requestHeaders.get("x-current-pathname")

  if (pathname === ROUTES.LOGIN) {
    return
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(ROUTES.HOME)
  }
}
