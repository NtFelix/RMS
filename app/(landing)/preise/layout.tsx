import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { PricingPageJsonLd } from '@/components/seo/json-ld';
import { faqItems } from '@/app/modern/components/faq';

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
