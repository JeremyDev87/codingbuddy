import type { Agent } from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AgentCardProps {
  agent: Agent;
  /** Translated category label for i18n display */
  translatedCategory?: string;
}

export const AgentCard = ({ agent, translatedCategory }: AgentCardProps) => (
  <Card className="transition-shadow hover:shadow-md">
    <CardHeader>
      <div className="flex items-center gap-3">
        <span className="text-2xl" role="img" aria-hidden="true">
          {agent.icon}
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">{agent.name}</CardTitle>
          <Badge variant="secondary" className="mt-1 text-xs">
            {translatedCategory ?? agent.category}
          </Badge>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <CardDescription className="mb-3">{agent.description}</CardDescription>
      <div className="flex flex-wrap gap-1">
        {agent.tags.map(tag => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>
    </CardContent>
  </Card>
);
