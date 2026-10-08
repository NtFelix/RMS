import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { SolutionSubPageJsonLd } from '@/components/seo/json-ld';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = pageMetadata.loesungenKleineMittlere;

export default function KleineMittlereLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <SolutionSubPageJsonLd
                pageName="Kleine & Mittlere Hausverwaltungen"
                pageUrl={pageMetadata.loesungenKleineMittlere.alternates?.canonical?.toString() ?? ''}
            />
            {children}
        </>
    );
}
