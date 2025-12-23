import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata.funktionenBetriebskosten;

export default function BetriebskostenLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
