import { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import EnterprisePage from './content'

export const metadata: Metadata = pageMetadata.loesungenGrosse

export default function Page() {
  return <EnterprisePage />
}
