import { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import FinanceManagementPage from './content'

export const metadata: Metadata = pageMetadata.funktionenFinanzverwaltung

export default function Page() {
  return <FinanceManagementPage />
}
