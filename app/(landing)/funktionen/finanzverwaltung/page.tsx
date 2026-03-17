import { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import { FinanceManagementContent } from './content-wrapper'

export const metadata: Metadata = pageMetadata.funktionenFinanzverwaltung

export default function Page() {
  return <FinanceManagementContent />
}
