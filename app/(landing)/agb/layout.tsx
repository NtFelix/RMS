import { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = pageMetadata.agb;

export default function AGBLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}