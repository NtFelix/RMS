import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { SolutionSubPageJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = pageMetadata.loesungenPrivatvermieter;

export default function PrivatvermieterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <SolutionSubPageJsonLd
                pageName="Privatvermieter"
                pageUrl={pageMetadata.loesungenPrivatvermieter.alternates?.canonical?.toString() ?? ''}
            />
            {children}
        </>
    );
}
