import { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import PropertyManagementPage from './content'

export const metadata: Metadata = pageMetadata.funktionenWohnungsverwaltung

export default function Page() {
  return <PropertyManagementPage />
}
