'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CostEntry } from '@/lib/types';

interface CostChartProps {
  entries: CostEntry[];
}

export function CostChart({ entries }: CostChartProps) {
  const cumulative = entries.reduce<(CostEntry & { cumCost: number })[]>((acc, entry) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].cumCost : 0;
    acc.push({ ...entry, cumCost: parseFloat((prev + entry.cost).toFixed(2)) });
    return acc;
  }, []);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-4 text-lg font-semibold">Cumulative Cost</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cumulative}>
            <defs>
              <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
            />
            <YAxis
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              tickFormatter={(v: number) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text)',
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative Cost']}
              labelFormatter={(label: string) => `Date: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="cumCost"
              stroke="var(--color-accent)"
              fill="url(#costGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
