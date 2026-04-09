import { Injectable, Inject, Logger } from '@nestjs/common';
import type { ToolDefinition } from './base.handler';
import type { ToolResponse } from '../response.utils';
import { AbstractHandler } from './abstract-handler';
import { createJsonResponse, createErrorResponse } from '../response.utils';
import { AgentService } from '../../agent/agent.service';
import { TeamsCapabilityService } from '../../agent/teams-capability.service';
import type { KeywordService } from '../../keyword/keyword.service';
import { KEYWORD_SERVICE } from '../../keyword/keyword.module';
import { KEYWORDS, LOCALIZED_KEYWORD_MAP, type Mode } from '../../keyword/keyword.types';
import { RulesService } from '../../rules/rules.service';
import {
  extractRequiredString,
  extractOptionalString,
  isValidMode,
} from '../../shared/validation.constants';

/** Default primary agents per mode (from keyword-modes.json agent field) */
const MODE_DEFAULT_AGENTS: Record<Mode, string> = {
  PLAN: 'plan-mode-agent',
  ACT: 'act-mode-agent',
  EVAL: 'eval-mode-agent',
  AUTO: 'auto-mode-agent',
};

/**
 * Context-aware specialist detection patterns.
 * Mirrors KeywordService.CONTEXT_SPECIALIST_PATTERNS for prompt analysis.
 */
const CONTEXT_SPECIALIST_PATTERNS: ReadonlyArray<{ pattern: RegExp; specialist: string }> = [
  {
    pattern: /보안|security|auth|인증|JWT|OAuth|XSS|CSRF|취약점|vulnerability/i,
    specialist: 'security-specialist',
  },
  {
    pattern: /접근성|accessibility|a11y|WCAG|aria|스크린\s*리더|screen\s*reader/i,
    specialist: 'accessibility-specialist',
  },
  {
    pattern: /성능|performance|최적화|optimiz|빠르게|느린|slow|fast|bundle\s*size|로딩/i,
    specialist: 'performance-specialist',
  },
  {
    pattern: /다국어|i18n|internationalization|번역|locale|translation|localization/i,
    specialist: 'i18n-specialist',
  },
  {
    pattern: /SEO|검색\s*엔진|search\s*engine|메타|meta\s*tag|sitemap|구조화\s*데이터/i,
    specialist: 'seo-specialist',
  },
  {
    pattern: /문서화|document|README|API\s*문서|JSDoc|주석|comment/i,
    specialist: 'documentation-specialist',
  },
  {
    pattern: /UI|UX|디자인|design\s*system|사용자\s*경험|user\s*experience|인터랙션/i,
    specialist: 'ui-ux-designer',
  },
  {
    pattern:
      /외부\s*서비스|external\s*(api|service)|webhook|웹훅|third-?party|circuit\s*breaker|retry\s*pattern|API\s*integration|서드파티|연동|SDK\s*wrapper/i,
    specialist: 'integration-specialist',
  },
  {
    pattern:
      /observability|관측성|distributed\s*trac|분산\s*추적|SLI|SLO|error\s*budget|OpenTelemetry|otel|Prometheus|Grafana|Jaeger|Zipkin|log\s*aggregat|로그\s*수집|alerting\s*strateg|알림\s*전략|메트릭\s*수집|metric\s*collect|tracing\s*infra|monitoring|대시보드|dashboard|logs?\s*manag/i,
    specialist: 'observability-specialist',
  },
  {
    pattern:
      /event[- ]?driven|이벤트\s*기반|message\s*queue|메시지\s*큐|Kafka|RabbitMQ|SQS|Azure\s*Service\s*Bus|event\s*sourc|CQRS|saga\s*pattern|분산\s*트랜잭션|distributed\s*transaction|pub\/?sub|dead\s*letter|DLQ|websocket|SSE|server[- ]?sent|real[- ]?time|실시간|async\s*messag|비동기\s*통신/i,
    specialist: 'event-architecture-specialist',
  },
  {
    pattern:
      /migration|마이그레이션|migrate|이전|legacy\s*(system|code|moderniz)|레거시|upgrade\s*(framework|version|library)|업그레이드|strangler\s*fig|branch\s*by\s*abstraction|blue[- ]?green|canary\s*(deploy|release)|rollback|롤백|api\s*version|deprecat|dual[- ]?write|backward\s*compatib|호환성|zero[- ]?downtime|data\s*migration|데이터\s*마이그레이션|schema\s*migration|스키마\s*변경|cutover|전환/i,
    specialist: 'migration-specialist',
  },
];

/** Map specialist IDs to domain names */
const SPECIALIST_DOMAIN_MAP: Record<string, string> = {
  'security-specialist': 'security',
  'accessibility-specialist': 'accessibility',
  'performance-specialist': 'performance',
  'i18n-specialist': 'i18n',
  'seo-specialist': 'seo',
  'documentation-specialist': 'documentation',
  'ui-ux-designer': 'ui-ux',
  'integration-specialist': 'integration',
  'observability-specialist': 'observability',
  'event-architecture-specialist': 'event-architecture',
  'migration-specialist': 'migration',
  'architecture-specialist': 'architecture',
  'test-strategy-specialist': 'testing',
  'code-quality-specialist': 'code-quality',
};

/** Minimal shape of keyword-modes.json for specialist extraction */
interface ModeConfigSlice {
  defaultSpecialists?: string[];
}

/**
 * One-shot entry point for collective intelligence workflow.
 *
 * Combines rule loading, primary agent resolution, specialist recommendation,
 * and prompt generation in a single call — replacing the multi-step
 * parse_mode + dispatch_agents ceremony with ~70% token reduction.
 *
 * Designed to work with Claude native Teams for real-time specialist debate.
 */
@Injectable()
export class ActivateHandler extends AbstractHandler {
  private readonly logger = new Logger(ActivateHandler.name);

  constructor(
    @Inject(KEYWORD_SERVICE) private readonly keywordService: KeywordService,
    private readonly agentService: AgentService,
    private readonly rulesService: RulesService,
    private readonly teamsCapability: TeamsCapabilityService,
  ) {
    super();
  }

  protected getHandledTools(): string[] {
    return ['activate'];
  }

  protected async handleTool(
    toolName: string,
    args: Record<string, unknown> | undefined,
  ): Promise<ToolResponse> {
    switch (toolName) {
      case 'activate':
        return this.handleActivate(args);
      default:
        return createErrorResponse(`Unknown tool: ${toolName}`);
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'activate',
        description:
          'One-shot entry point for collective intelligence workflow. ' +
          'Combines rule loading, primary agent resolution, specialist recommendation, ' +
          'and prompt generation in a single call — replacing the multi-step ' +
          'parse_mode + dispatch_agents ceremony. Returns everything needed to ' +
          'run a specialist council via Claude native Teams.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description:
                'Task description. May start with a mode keyword (PLAN/ACT/EVAL/AUTO) ' +
                'which will be auto-detected, or use the explicit mode parameter.',
            },
            mode: {
              type: 'string',
              enum: ['PLAN', 'ACT', 'EVAL', 'AUTO'],
              description:
                'Explicit workflow mode. If omitted, auto-detected from prompt keywords.',
            },
            primaryAgent: {
              type: 'string',
              description: 'Explicit primary agent name. If omitted, uses mode default.',
            },
          },
          required: ['prompt'],
        },
      },
    ];
  }

  private async handleActivate(args: Record<string, unknown> | undefined): Promise<ToolResponse> {
    const prompt = extractRequiredString(args, 'prompt');
    if (prompt === null) {
      return createErrorResponse('Missing required parameter: prompt');
    }

    // 1. Resolve mode from explicit param or prompt keyword
    const explicitMode = extractOptionalString(args, 'mode');
    const { mode, taskPrompt } = this.resolveMode(prompt, explicitMode);

    // 2. Load rules for mode (reuses KeywordService caching)
    const rules = await this.keywordService.getRulesForMode(mode, 'standard');

    // 3. Resolve primary agent
    const primaryAgentName =
      extractOptionalString(args, 'primaryAgent') ?? MODE_DEFAULT_AGENTS[mode];
    let primaryAgent: {
      name: string;
      displayName: string;
      systemPrompt: string;
    } | null = null;
    try {
      const agentPrompt = await this.agentService.getAgentSystemPrompt(primaryAgentName, {
        mode,
        taskDescription: taskPrompt,
      });
      primaryAgent = {
        name: primaryAgentName,
        displayName: agentPrompt.displayName,
        systemPrompt: agentPrompt.systemPrompt,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to resolve primary agent '${primaryAgentName}': ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }

    // 4. Determine specialists (mode defaults + context-aware patterns)
    const specialists = await this.resolveSpecialists(mode, taskPrompt);

    // 5. Prepare specialist prompts in parallel (full verbosity for Teams usage)
    const specialistResults: Array<{
      name: string;
      displayName: string;
      prompt: string;
      domain: string;
    }> = [];
    if (specialists.length > 0) {
      try {
        const prepared = await this.agentService.prepareParallelAgents(
          mode,
          specialists,
          undefined,
          taskPrompt,
          'full',
        );
        for (const agent of prepared.agents) {
          specialistResults.push({
            name: agent.id,
            displayName: agent.displayName,
            prompt: agent.taskPrompt ?? agent.description ?? '',
            domain: SPECIALIST_DOMAIN_MAP[agent.id] ?? agent.id,
          });
        }
      } catch (error) {
        this.logger.warn(
          `Failed to prepare specialists: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }
    }

    // 6. Check Teams capability
    const teamsStatus = await this.teamsCapability.getStatus();

    // 7. Build lean response
    return createJsonResponse({
      mode,
      rules: rules.map(r => ({ name: r.name, content: r.content })),
      primaryAgent,
      specialists: specialistResults,
      discussion: {
        format: 'Each specialist: approve|concern|reject + reasoning + suggestedChanges',
        consensus: 'No rejections = consensus reached',
        crossReview: "Specialists review each other's opinions",
      },
      nativeIntegration: {
        teams: teamsStatus.available
          ? 'Use Claude native Teams to run specialists as teammates for real-time debate'
          : 'Enable Teams via CODINGBUDDY_TEAMS_ENABLED=true or experimental.teamsCoordination config',
        memory: 'Use Claude Code Memory for context persistence across sessions',
        orchestration: 'Host manages mode transitions, clarification, permissions natively',
      },
    });
  }

  /**
   * Resolve mode from explicit parameter or prompt keyword detection.
   * Supports English and localized keywords (Korean, Japanese, Chinese, Spanish).
   */
  private resolveMode(
    prompt: string,
    explicitMode: string | undefined,
  ): { mode: Mode; taskPrompt: string } {
    if (explicitMode && isValidMode(explicitMode)) {
      return { mode: explicitMode as Mode, taskPrompt: prompt };
    }

    const trimmed = prompt.trim();
    const keywordRegex = /^([^\s:：]+)\s*[:：]?\s*(.*)$/s;
    const match = trimmed.match(keywordRegex);

    if (match?.[1]) {
      const candidate = match[1];
      const upper = candidate.toUpperCase();
      const rest = (match[2] ?? '').trim();

      if (KEYWORDS.includes(upper as Mode)) {
        return { mode: upper as Mode, taskPrompt: rest || trimmed };
      }

      const localized = LOCALIZED_KEYWORD_MAP[candidate] ?? LOCALIZED_KEYWORD_MAP[upper];
      if (localized) {
        return { mode: localized, taskPrompt: rest || trimmed };
      }
    }

    return { mode: 'PLAN', taskPrompt: trimmed };
  }

  /**
   * Merge mode-default specialists (from keyword-modes.json) with
   * context-aware specialist detection (from prompt patterns).
   */
  private async resolveSpecialists(mode: Mode, prompt: string): Promise<string[]> {
    let defaultSpecialists: string[] = [];
    try {
      const configContent = await this.rulesService.getRuleContent('keyword-modes.json');
      const config = JSON.parse(configContent) as { modes: Record<string, ModeConfigSlice> };
      defaultSpecialists = config.modes[mode]?.defaultSpecialists ?? [];
    } catch {
      this.logger.debug('Failed to load keyword-modes.json for default specialists');
    }

    const contextSpecialists = this.getContextAwareSpecialists(prompt);
    return [...new Set([...defaultSpecialists, ...contextSpecialists])];
  }

  /**
   * Detect additional specialists based on prompt content patterns.
   */
  private getContextAwareSpecialists(prompt: string): string[] {
    const specialists: string[] = [];
    for (const { pattern, specialist } of CONTEXT_SPECIALIST_PATTERNS) {
      if (pattern.test(prompt)) {
        specialists.push(specialist);
      }
    }
    return specialists;
  }
}
