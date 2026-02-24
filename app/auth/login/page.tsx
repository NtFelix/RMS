import { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import LoginPage from './content'

export const metadata: Metadata = pageMetadata.authLogin

export default function Page() {
  return <LoginPage />
}
