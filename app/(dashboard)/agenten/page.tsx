import { requireAuthenticatedUser } from '@/lib/server/route-access';
import { isAgentBuilderEnabled } from '@/lib/feature-flags';
import { notFound } from 'next/navigation';
import { AgentsPageClient } from './agents-page-client';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function AgentsPage() {
  const { user } = await requireAuthenticatedUser();
  const enabled = await isAgentBuilderEnabled(user.id);

  if (!enabled && process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <AgentsPageClient />;
}
