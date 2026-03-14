'use client';

import { useMemo, useState } from 'react';
import type { Agent, AgentCategory } from '@/types';
import { filterAgents } from '../lib/filterAgents';

export { filterAgents } from '../lib/filterAgents';

/** React hook - manages category filter state and returns filtered agents */
export function useAgentFilter(agents: Agent[]) {
  const [category, setCategory] = useState<AgentCategory | 'all'>('all');

  const filteredAgents = useMemo(() => filterAgents(agents, { category }), [agents, category]);

  return {
    filteredAgents,
    category,
    setCategory,
  };
}
