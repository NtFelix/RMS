import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata.preise;

export default function PreiseLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
