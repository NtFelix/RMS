import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set')
    return NextResponse.json({ error: 'Stripe secret key not configured.' }, { status: 500 })
  }

  const supabase = createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.stripe_customer_id) {
    return NextResponse.json({ error: 'Stripe customer not found' }, { status: 404 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-05-28.basil',
  })

  const { return_url } = await req.json()

  try {
    const { url } = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: return_url,
    })
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Error creating customer portal session:', error)
    return NextResponse.json({ error: 'Error creating customer portal session' }, { status: 500 })
  }
}