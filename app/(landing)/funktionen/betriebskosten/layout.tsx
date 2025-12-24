import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { FeatureSubPageJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = pageMetadata.funktionenBetriebskosten;

export default function BetriebskostenLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <FeatureSubPageJsonLd
                pageName="Nebenkostenabrechnung"
                pageUrl={pageMetadata.funktionenBetriebskosten.alternates?.canonical?.toString() ?? ''}
            />
            {children}
        </>
    );
}
