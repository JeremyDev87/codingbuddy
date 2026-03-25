'use client';

import type { DashboardData } from '@/lib/types';
import { DashboardHeader } from './dashboard-header';
import { SessionTimeline } from './session-timeline';
import { CostChart } from './cost-chart';
import { AgentActivity } from './agent-activity';
import { SkillUsage } from './skill-usage';
import { PRThroughput } from './pr-throughput';

interface DashboardContentProps {
  data: DashboardData;
}

export function DashboardContent({ data }: DashboardContentProps) {
  return (
    <>
      <DashboardHeader data={data} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CostChart entries={data.costEntries} />
        <PRThroughput entries={data.prEntries} />
        <AgentActivity agents={data.agentActivity} />
        <SkillUsage skills={data.skillUsage} />
      </div>

      <div className="mt-6">
        <SessionTimeline sessions={data.sessions} />
      </div>
    </>
  );
}
