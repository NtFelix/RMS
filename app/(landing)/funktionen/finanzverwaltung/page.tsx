import { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import dynamic from 'next/dynamic'

const FinanceManagementPage = dynamic(() => import('./content'), {
  loading: () => <div className="min-h-screen pt-48 pb-16 flex items-center justify-center">Lade...</div>
})

export const metadata: Metadata = pageMetadata.funktionenFinanzverwaltung

export default function Page() {
  return <FinanceManagementPage />
}
