import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { FeatureSubPageJsonLd } from '@/components/seo/json-ld';

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
                pageUrl={pageMetadata.funktionenWohnungsverwaltung.alternates?.canonical as string}
            />
            {children}
        </>
    );
}
