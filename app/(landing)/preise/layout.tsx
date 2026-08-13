import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { PricingPageJsonLd } from '@/components/seo/json-ld';
import { faqItems } from '@/app/modern/components/faq';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = pageMetadata.preise;

export default function PreiseLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <PricingPageJsonLd faqs={faqItems} />
            {children}
        </>
    );
}
