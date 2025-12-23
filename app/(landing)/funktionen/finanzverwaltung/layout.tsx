import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata.funktionenFinanzverwaltung;

export default function FinanzverwaltungLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
