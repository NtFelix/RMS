'use client'

import dynamic from 'next/dynamic'

export const FinanceManagementContent = dynamic(() => import('./content'), {
  ssr: false,
  loading: () => <div className="min-h-screen pt-48 pb-16 flex items-center justify-center">Lade...</div>
})
