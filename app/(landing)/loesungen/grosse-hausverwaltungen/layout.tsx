import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata.loesungenGrosse;

export default function GrosseHausverwaltungenLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
