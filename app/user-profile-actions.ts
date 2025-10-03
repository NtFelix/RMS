'use server'

import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getPlanDetails } from '@/lib/stripe-server' // Assuming this is where your Stripe logic resides

export async function getBillingAddress(customerId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
  })

  try {
    const customer = await stripe.customers.retrieve(customerId)
    if (customer.deleted) {
      return null
    }
    return customer.address
  } catch (error) {
    console.error('Error fetching billing address from Stripe:', error)
    return null
  }
}

export async function updateBillingAddress(
  customerId: string,
  address: Stripe.AddressParam
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
  })

  try {
    const updatedCustomer = await stripe.customers.update(customerId, {
      address,
    })
    return { success: true, address: updatedCustomer.address }
  } catch (error) {
    console.error('Error updating billing address in Stripe:', error)
    return { success: false, error: 'Failed to update billing address.' }
  }
}

export async function getUserProfileForSettings() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Benutzer nicht authentifiziert', details: authError?.message || 'Kein Benutzerobjekt vorhanden' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      `
      *,
      currentWohnungenCount: wohnungen(count)
    `
    )
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    // If no profile is found, return a default structure instead of an error.
    // This can happen for newly registered users before their profile is created.
    return {
      id: user.id,
      email: user.email,
      currentWohnungenCount: 0,
      activePlan: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_subscription_status: null,
      stripe_cancel_at_period_end: null,
      stripe_current_period_end: null,
    }
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('*')
    .in('status', ['trialing', 'active'])
    .single()

  let activePlan = null
  if (subscription?.price_id) {
    try {
      activePlan = await getPlanDetails(subscription.price_id)
    } catch (planError) {
      console.error(`Fehler beim Abrufen der Plandetails für Price ID ${subscription.price_id}:`, planError)
      // Optional: Fügen Sie eine Fehlerbehandlung hinzu, wenn Plandetails fehlschlagen
    }
  }

  return {
    ...profile,
    email: user.email, // E-Mail des Benutzers hinzufügen
    currentWohnungenCount: profile.currentWohnungenCount[0]?.count || 0,
    activePlan,
    stripe_customer_id: subscription?.customer_id,
    stripe_subscription_id: subscription?.id,
    stripe_subscription_status: subscription?.status,
    stripe_cancel_at_period_end: subscription?.cancel_at_period_end,
    stripe_current_period_end: subscription?.current_period_end,
  }
}