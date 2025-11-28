'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createCustomer } from '@/lib/stripe-server'

export async function ensureStripeCustomerForUser(email: string, userId: string, name?: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
    return { success: false, error: 'Server configuration error' }
  }

  // Use Service Role Key for Admin access
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Check if profile has customer ID
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  // If profile error is not "not found", log it
  if (profileError && profileError.code !== 'PGRST116') {
     console.error('Error fetching profile:', profileError)
     // Continue to try to upsert anyway
  }

  if (profile?.stripe_customer_id) {
    return { success: true, customerId: profile.stripe_customer_id }
  }

  // Create customer in Stripe
  try {
    const customer = await createCustomer(email, name)

    // Update profile. Using upsert to handle cases where profile might be missing or race conditions.
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, stripe_customer_id: customer.id })
      .select()

    if (updateError) {
        console.error('Error updating/upserting profile:', updateError)
        return { success: false, error: updateError.message }
    }

    return { success: true, customerId: customer.id }
  } catch (err) {
    console.error('Error in ensureStripeCustomerForUser:', err)
    return { success: false, error: 'Failed to create customer' }
  }
}

export async function ensureStripeCustomerCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return { success: false, error: 'Not authenticated' }
  }

  return await ensureStripeCustomerForUser(user.email, user.id, user.user_metadata?.name)
}
