import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata.loesungenPrivatvermieter;

export default function PrivatvermieterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
