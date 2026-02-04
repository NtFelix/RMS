import { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import UtilityCostPage from './content'

export const metadata: Metadata = pageMetadata.funktionenBetriebskosten

export default function Page() {
  return <UtilityCostPage />
}
