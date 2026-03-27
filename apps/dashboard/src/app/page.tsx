import {
  loadSessions,
  loadCostEntries,
  loadAgentActivity,
  loadSkillUsage,
  loadPREntries,
} from '@/lib/data-loader';
import type { DashboardData } from '@/lib/types';
import { DashboardContent } from '@/components/dashboard-content';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [sessions, costEntries, agentActivity, skillUsage, prEntries] = await Promise.all([
    loadSessions(),
    loadCostEntries(),
    loadAgentActivity(),
    loadSkillUsage(),
    loadPREntries(),
  ]);

  const isUsingMockData = sessions.length > 0 && sessions[0].sessionId.startsWith('session-');

  const data: DashboardData = {
    sessions,
    costEntries,
    agentActivity,
    skillUsage,
    prEntries,
    isUsingMockData,
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <DashboardContent data={data} />
    </main>
  );
}
