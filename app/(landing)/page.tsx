import { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import LandingPage from './landing-content'

export const metadata: Metadata = pageMetadata.home

export default function Page() {
  return <LandingPage />
}
