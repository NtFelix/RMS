import { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import SMBPage from './content'

export const metadata: Metadata = pageMetadata.loesungenKleineMittlere

export default function Page() {
  return <SMBPage />
}
