import type { Agent } from '@/types';
import { Badge } from '@/components/ui/badge';

interface AgentCardProps {
  agent: Agent;
  /** Translated category label for i18n display */
  translatedCategory?: string;
}

export const AgentCard = ({ agent, translatedCategory }: AgentCardProps) => (
  <div className="bg-terminal-bg border-terminal-border flex items-start gap-3 rounded-lg border p-3 transition-colors hover:border-white/20">
    <span className="text-xl" role="img" aria-hidden="true">
      {agent.icon}
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium text-white/90">{agent.name}</span>
        <Badge variant="secondary" className="text-[10px] leading-tight">
          {translatedCategory ?? agent.category}
        </Badge>
      </div>
      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">{agent.description}</p>
    </div>
  </div>
);
