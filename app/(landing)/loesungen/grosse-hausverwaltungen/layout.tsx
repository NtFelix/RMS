import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { SolutionSubPageJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = pageMetadata.loesungenGrosse;

export default function GrosseHausverwaltungenLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <SolutionSubPageJsonLd
                pageName="Große Hausverwaltungen"
                pageUrl={pageMetadata.loesungenGrosse.alternates?.canonical as string}
            />
            {children}
        </>
    );
}
