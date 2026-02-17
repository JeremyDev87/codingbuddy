import { type AgentActivation, type ActivationMessage } from './keyword.types';

/**
 * ActivationMessageBuilder - Creates formatted activation messages
 * for transparency when agents or skills are invoked.
 */
export class ActivationMessageBuilder {
  private activations: AgentActivation[] = [];

  /**
   * Add an agent activation record.
   */
  addAgentActivation(name: string, tier: 'primary' | 'specialist', activatedBy?: string): this {
    this.activations.push({
      type: 'agent',
      name,
      tier,
      activatedBy,
      timestamp: new Date().toISOString(),
    });
    return this;
  }

  /**
   * Add a skill activation record.
   */
  addSkillActivation(name: string, activatedBy?: string): this {
    this.activations.push({
      type: 'skill',
      name,
      tier: 'specialist', // Skills are always specialist tier
      activatedBy,
      timestamp: new Date().toISOString(),
    });
    return this;
  }

  /**
   * Build the activation message.
   */
  build(): ActivationMessage | undefined {
    if (this.activations.length === 0) {
      return undefined;
    }

    const formatted = this.formatActivations();
    return {
      activations: [...this.activations],
      formatted,
    };
  }

  /**
   * Format activations into a human-readable message.
   */
  private formatActivations(): string {
    const lines: string[] = [];

    for (const activation of this.activations) {
      const icon = this.getIcon(activation);
      const tierLabel = this.getTierLabel(activation.tier);
      const activatedByText = activation.activatedBy ? ` (by ${activation.activatedBy})` : '';

      lines.push(`${icon} ${activation.name} [${tierLabel}]${activatedByText}`);
    }

    return lines.join('\n');
  }

  /**
   * Get icon for activation type.
   */
  private getIcon(activation: AgentActivation): string {
    if (activation.type === 'skill') {
      return '⚡';
    }
    return activation.tier === 'primary' ? '🤖' : '👤';
  }

  /**
   * Get human-readable tier label.
   */
  private getTierLabel(tier: 'primary' | 'specialist'): string {
    return tier === 'primary' ? 'Primary Agent' : 'Specialist';
  }

  /**
   * Reset the builder for reuse.
   */
  reset(): this {
    this.activations = [];
    return this;
  }

  /**
   * Static helper to create activation message for a single primary agent.
   */
  static forPrimaryAgent(agentName: string, activatedBy?: string): ActivationMessage {
    return new ActivationMessageBuilder()
      .addAgentActivation(agentName, 'primary', activatedBy)
      .build()!;
  }

  /**
   * Static helper to create activation message for a specialist agent.
   */
  static forSpecialistAgent(agentName: string, activatedBy?: string): ActivationMessage {
    return new ActivationMessageBuilder()
      .addAgentActivation(agentName, 'specialist', activatedBy)
      .build()!;
  }

  /**
   * Static helper to create activation message for a skill.
   */
  static forSkill(skillName: string, activatedBy?: string): ActivationMessage {
    return new ActivationMessageBuilder().addSkillActivation(skillName, activatedBy).build()!;
  }
}
