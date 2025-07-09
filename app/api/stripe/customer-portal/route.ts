
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !profileData?.stripe_customer_id) {
    return new NextResponse('Stripe customer ID not found', { status: 400 })
  }

  const stripeCustomerId = profileData.stripe_customer_id

  import stripe from '@/lib/stripe'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !profileData?.stripe_customer_id) {
    return new NextResponse('Stripe customer ID not found', { status: 400 })
  }

  const stripeCustomerId = profileData.stripe_customer_id

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${req.headers.get('origin')}/dashboard/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe customer portal error:', error)
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
  }
}
