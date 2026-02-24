import { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo/metadata'
import PricingPage from './pricing-content'

export const metadata: Metadata = pageMetadata.preise

export default function Page() {
    return <PricingPage />
}
