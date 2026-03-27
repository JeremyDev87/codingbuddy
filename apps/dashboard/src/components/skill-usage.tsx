'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { SkillUsage as SkillUsageType } from '@/lib/types';

interface SkillUsageProps {
  skills: SkillUsageType[];
}

export function SkillUsage({ skills }: SkillUsageProps) {
  const top10 = skills.slice(0, 10);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-4 text-lg font-semibold">Skill Usage</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top10} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="skill"
              width={130}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text)',
              }}
              formatter={(value: number) => [`${value} invocations`, 'Usage']}
            />
            <Bar dataKey="count" fill="var(--color-accent-light)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
