import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata.loesungenKleineMittlere;

export default function KleineMittlereLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
