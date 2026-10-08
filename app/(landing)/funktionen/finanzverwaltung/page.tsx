import { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import FinanceManagementPage from './content'

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = pageMetadata.funktionenFinanzverwaltung

export default function Page() {
  return <FinanceManagementPage />
}
