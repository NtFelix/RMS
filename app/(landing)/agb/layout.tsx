import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata.agb;

export default function AGBLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}