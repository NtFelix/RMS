import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { SolutionSubPageJsonLd } from '@/components/seo/json-ld';

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
                pageUrl="https://mietevo.de/loesungen/kleine-mittlere-hausverwaltungen"
            />
            {children}
        </>
    );
}
