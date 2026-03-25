'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PREntry } from '@/lib/types';

interface PRThroughputProps {
  entries: PREntry[];
}

export function PRThroughput({ entries }: PRThroughputProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-4 text-lg font-semibold">PR Throughput</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={entries}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text)',
              }}
              labelFormatter={(label: string) => `Date: ${label}`}
            />
            <Legend
              wrapperStyle={{ color: 'var(--color-text-muted)', fontSize: 12 }}
            />
            <Bar
              dataKey="created"
              name="Created"
              fill="var(--color-accent)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="merged"
              name="Merged"
              fill="var(--color-success)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
