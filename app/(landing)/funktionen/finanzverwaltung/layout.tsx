import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { FeatureSubPageJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = pageMetadata.funktionenFinanzverwaltung;

export default function FinanzverwaltungLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <FeatureSubPageJsonLd
                pageName="Finanzverwaltung"
                pageUrl="https://mietevo.de/funktionen/finanzverwaltung"
            />
            {children}
        </>
    );
}
