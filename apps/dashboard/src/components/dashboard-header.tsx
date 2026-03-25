'use client';

import { Activity, DollarSign, GitPullRequest, Zap } from 'lucide-react';
import type { DashboardData } from '@/lib/types';

interface DashboardHeaderProps {
  data: DashboardData;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}

function StatCard({ label, value, icon, subtitle }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
        <span className="text-[var(--color-accent)]">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{subtitle}</p>
      )}
    </div>
  );
}

export function DashboardHeader({ data }: DashboardHeaderProps) {
  const totalSessions = data.sessions.length;
  const totalCost = data.costEntries.reduce((sum, e) => sum + e.cost, 0);
  const totalToolCalls = data.sessions.reduce(
    (sum, s) => sum + s.toolCallCount,
    0
  );
  const totalPRs = data.prEntries.reduce((sum, e) => sum + e.merged, 0);

  return (
    <div className="mb-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Codingbuddy Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {data.isUsingMockData
              ? 'Showing mock data — history.db not found'
              : 'Live data from ~/.codingbuddy/history.db'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Sessions"
          value={totalSessions}
          icon={<Activity size={18} />}
          subtitle="Last 30 days"
        />
        <StatCard
          label="Total Cost"
          value={`$${totalCost.toFixed(2)}`}
          icon={<DollarSign size={18} />}
          subtitle="Estimated"
        />
        <StatCard
          label="Tool Calls"
          value={totalToolCalls.toLocaleString()}
          icon={<Zap size={18} />}
          subtitle="Across all sessions"
        />
        <StatCard
          label="PRs Merged"
          value={totalPRs}
          icon={<GitPullRequest size={18} />}
          subtitle="Last 30 days"
        />
      </div>
    </div>
  );
}
