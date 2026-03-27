'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { AgentActivity as AgentActivityType } from '@/lib/types';

interface AgentActivityProps {
  agents: AgentActivityType[];
}

const COLORS = [
  '#6366f1',
  '#818cf8',
  '#a78bfa',
  '#c084fc',
  '#e879f9',
  '#f472b6',
  '#fb7185',
  '#f87171',
];

export function AgentActivity({ agents }: AgentActivityProps) {
  const top8 = agents.slice(0, 8);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-4 text-lg font-semibold">Agent Activity</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top8} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="agent"
              width={140}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text)',
              }}
              formatter={(value: number) => [`${value} calls`, 'Usage']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {top8.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
