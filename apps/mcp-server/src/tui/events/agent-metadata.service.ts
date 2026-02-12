import { Injectable, Logger } from '@nestjs/common';
import { RulesService } from '../../rules/rules.service';
import {
  type AgentMetadata,
  AGENT_CATEGORY_MAP,
  AGENT_ICONS,
} from './agent-metadata.types';

@Injectable()
export class AgentMetadataService {
  private readonly logger = new Logger(AgentMetadataService.name);
  private readonly cache = new Map<string, AgentMetadata>();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly rulesService: RulesService) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.loadAllAgents();
    await this.initPromise;
    this.initialized = true;
  }

  getMetadata(agentId: string): AgentMetadata | null {
    return this.cache.get(agentId) ?? null;
  }

  async getMetadataAsync(agentId: string): Promise<AgentMetadata | null> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.getMetadata(agentId);
  }

  getAllMetadata(): AgentMetadata[] {
    return Array.from(this.cache.values());
  }

  private async loadAllAgents(): Promise<void> {
    try {
      const agentIds = await this.rulesService.listAgents();

      await Promise.allSettled(agentIds.map(id => this.loadAgent(id)));

      this.logger.log(`Loaded metadata for ${this.cache.size} agents`);
    } catch (error) {
      this.logger.error('Failed to load agent list', error);
    }
  }

  private async loadAgent(agentId: string): Promise<void> {
    try {
      const profile = await this.rulesService.getAgent(agentId);
      const category = AGENT_CATEGORY_MAP[agentId] ?? 'Architecture';
      const icon = AGENT_ICONS[category];

      this.cache.set(agentId, {
        id: agentId,
        name: profile.name,
        description: profile.description,
        category,
        icon,
        expertise: profile.role.expertise ?? [],
      });
    } catch (error) {
      this.logger.warn(`Failed to load agent: ${agentId}`, error);
    }
  }
}
