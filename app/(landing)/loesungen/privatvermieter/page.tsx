import { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import PrivateLandlordsPage from './content'

export const metadata: Metadata = pageMetadata.loesungenPrivatvermieter

export default function Page() {
  return <PrivateLandlordsPage />
}
