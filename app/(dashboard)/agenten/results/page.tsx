import { requireAuthenticatedUser } from '@/lib/server/route-access';
import { isAgentBuilderEnabled } from '@/lib/feature-flags';
import { notFound } from 'next/navigation';
import { AgentResultsView } from '@/components/agent-results/AgentResultsView';

export const dynamic = 'force-dynamic';

export default async function AgentResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string }>;
}) {
  const { user } = await requireAuthenticatedUser();
  const enabled = await isAgentBuilderEnabled(user.id);

  if (!enabled && process.env.NODE_ENV === 'production') {
    notFound();
  }

  const { agentId } = await searchParams;

  return (
    <div className="p-8">
      <AgentResultsView initialAgentId={agentId || null} />
    </div>
  );
}
