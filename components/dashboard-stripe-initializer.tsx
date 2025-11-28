'use client'

import { useEffect, useRef } from 'react'
import { ensureStripeCustomerCurrentUser } from '@/app/stripe-customer-actions'

export function DashboardStripeInitializer() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const init = async () => {
      try {
        await ensureStripeCustomerCurrentUser()
      } catch (error) {
        // Silent failure is acceptable here as it's a background optimization.
        // It will retry on next page load/session start.
        console.error('Failed to initialize Stripe customer:', error)
      }
    }

    init()
  }, [])

  return null
}
