'use client';

import { useMemo, useState } from 'react';
import type { Agent, AgentCategory } from '@/types';
import { filterAgents } from '../lib/filterAgents';

export { filterAgents } from '../lib/filterAgents';

/** React hook - manages filter state and returns filtered agents */
export function useAgentFilter(agents: Agent[]) {
  const [category, setCategory] = useState<AgentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAgents = useMemo(
    () => filterAgents(agents, { category, searchQuery }),
    [agents, category, searchQuery],
  );

  return {
    filteredAgents,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
  };
}
