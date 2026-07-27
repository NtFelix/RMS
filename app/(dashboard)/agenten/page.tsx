import { requireAuthenticatedUser } from '@/lib/server/route-access';
import { isAgentBuilderEnabled } from '@/lib/feature-flags';
import { notFound } from 'next/navigation';
import { AgentsPageClient } from './agents-page-client';

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const { user } = await requireAuthenticatedUser();
  const enabled = await isAgentBuilderEnabled(user.id);

  if (!enabled && process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <AgentsPageClient />;
}
