import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { STRIPE_CONFIG } from "@/lib/constants/stripe"

export const runtime = 'edge'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (!code) {
    console.error('No auth code found in callback URL')
    return NextResponse.redirect(`${origin}/auth/login?error=invalid_code`)
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error.message)
      return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
    }

    // Successful authentication
    if (data?.user) {
      // Create Stripe customer if not exists
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, STRIPE_CONFIG)
        const supabaseAdmin = createSupabaseAdmin(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Check if profile exists and has stripe_customer_id
        let { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('stripe_customer_id')
          .eq('id', data.user.id)
          .single()

        // If profile doesn't exist, create it
        if (profileError || !profile) {
          console.log('Profile not found, creating new profile for user:', data.user.id)
          const { error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert({ id: data.user.id, email: data.user.email })

          if (insertError) {
            console.error('Error creating profile:', insertError)
            // If insert fails (maybe race condition?), try to fetch again
            const { data: retryProfile, error: retryError } = await supabaseAdmin
              .from('profiles')
              .select('stripe_customer_id')
              .eq('id', data.user.id)
              .single()

            if (!retryError && retryProfile) {
              profile = retryProfile
            }
          } else {
            // Profile created successfully
            profile = { stripe_customer_id: null }
          }
        }

        if (profile && !profile.stripe_customer_id) {
          console.log('Creating Stripe customer for user:', data.user.id)

          const customer = await stripe.customers.create({
            email: data.user.email,
            metadata: {
              userId: data.user.id,
            },
          })

          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ stripe_customer_id: customer.id })
            .eq('id', data.user.id)

          if (updateError) {
            console.error('Error updating profile with stripe_customer_id:', updateError)
          } else {
            console.log('Successfully created Stripe customer and updated profile')
          }
        }
      } catch (stripeError) {
        console.error('Error creating Stripe customer:', stripeError)
        // Don't block login if Stripe fails, but log it
      }

      // Pass user info as URL params for client-side PostHog tracking
      const redirectUrl = new URL(origin)
      redirectUrl.searchParams.set('login_success', 'true')
      redirectUrl.searchParams.set('provider', data.user.app_metadata?.provider || 'email')
      return NextResponse.redirect(redirectUrl.toString())
    }

    return NextResponse.redirect(origin)
  } catch (error) {
    console.error('Unexpected error during authentication:', error)
    return NextResponse.redirect(`${origin}/auth/login?error=unexpected_error`)
  }
}
