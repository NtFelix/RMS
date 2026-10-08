import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { FeatureSubPageJsonLd } from '@/components/seo/json-ld';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = pageMetadata.funktionenWohnungsverwaltung;

export default function WohnungsverwaltungLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <FeatureSubPageJsonLd
                pageName="Wohnungsverwaltung"
                pageUrl={pageMetadata.funktionenWohnungsverwaltung.alternates?.canonical?.toString() ?? ''}
            />
            {children}
        </>
    );
}
