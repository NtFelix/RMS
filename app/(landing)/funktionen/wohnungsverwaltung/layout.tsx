import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata.funktionenWohnungsverwaltung;

export default function WohnungsverwaltungLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
