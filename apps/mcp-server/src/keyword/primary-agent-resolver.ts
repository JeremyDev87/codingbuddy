import { Logger } from '@nestjs/common';
import {
  EVAL_PRIMARY_AGENT,
  DEFAULT_ACT_AGENT,
  ALL_PRIMARY_AGENTS,
  PLAN_PRIMARY_AGENTS,
  ACT_PRIMARY_AGENTS,
  type Mode,
  type PrimaryAgentResolutionResult,
  type PrimaryAgentSource,
  type ResolutionContext,
} from './keyword.types';

/** Project config interface for Primary Agent configuration */
interface ProjectConfig {
  primaryAgent?: string;
}

/** Function type for loading project config */
type GetProjectConfigFn = () => Promise<ProjectConfig | null>;

/** Function type for listing available primary agents */
type ListPrimaryAgentsFn = () => Promise<string[]>;

/**
 * PrimaryAgentResolver - Resolves which Primary Agent to use based on:
 * 1. Explicit request in prompt (highest priority)
 * 2. Project configuration
 * 3. Intent analysis (prompt content analysis)
 * 4. Context (file path, project type)
 * 5. Default fallback (frontend-developer)
 */
export class PrimaryAgentResolver {
  private readonly logger = new Logger(PrimaryAgentResolver.name);

  /** Patterns for explicit agent request in prompts */
  private static readonly EXPLICIT_PATTERNS = [
    // Korean patterns: "~로 작업해", "~으로 해줘", "~로 해"
    /(\w+-\w+)(?:로|으로)\s*(?:작업|개발|해)/i,
    // English patterns: "use ~ agent", "using ~"
    /(?:use|using)\s+(\w+-\w+)(?:\s+agent)?/i,
    // English pattern: "as ~"
    /as\s+(\w+-\w+)/i,
    // Direct pattern: "~ agent로"
    /(\w+-\w+)\s+agent(?:로|으로)/i,
  ];

  /**
   * Intent patterns for data-engineer agent.
   *
   * These patterns detect prompts related to database, schema, and data tasks.
   * Priority: 4th (after explicit, recommended, tooling patterns; before mobile and context).
   *
   * Confidence Levels:
   * - 0.95: Highly specific patterns (schema.prisma)
   * - 0.90: Database design keywords, migrations, SQL files
   * - 0.85: Query optimization, indexing, normalization
   *
   * @example
   * "schema.prisma 수정해줘" → data-engineer (0.95)
   * "데이터베이스 스키마 설계" → data-engineer (0.90)
   * "쿼리 최적화 필요해" → data-engineer (0.85)
   */
  private static readonly DATA_INTENT_PATTERNS: Array<{
    pattern: RegExp;
    confidence: number;
    description: string;
  }> = [
    // Schema/migration patterns (0.95)
    {
      pattern: /schema\.prisma/i,
      confidence: 0.95,
      description: 'Prisma schema',
    },
    {
      pattern: /migration/i,
      confidence: 0.9,
      description: 'Database migration',
    },
    { pattern: /\.sql$/i, confidence: 0.9, description: 'SQL file' },
    // Database patterns (0.85-0.90)
    {
      pattern: /database|데이터베이스|DB\s*(설계|스키마|마이그레이션)/i,
      confidence: 0.9,
      description: 'Database design',
    },
    {
      pattern: /스키마|schema\s*design/i,
      confidence: 0.9,
      description: 'Schema design',
    },
    {
      pattern: /ERD|entity.?relationship/i,
      confidence: 0.9,
      description: 'ERD design',
    },
    {
      pattern: /쿼리\s*최적화|query\s*optim/i,
      confidence: 0.85,
      description: 'Query optimization',
    },
    {
      pattern: /인덱스|index(ing)?/i,
      confidence: 0.85,
      description: 'Indexing',
    },
    {
      pattern: /정규화|normaliz/i,
      confidence: 0.85,
      description: 'Normalization',
    },
  ];

  /**
   * Intent patterns for mobile-developer agent.
   *
   * These patterns detect prompts related to mobile app development.
   * Priority: 5th (after explicit, recommended, tooling, data patterns; before context).
   *
   * Confidence Levels:
   * - 0.95: Platform-specific frameworks (React Native, Flutter, SwiftUI, Jetpack Compose)
   * - 0.90: Generic mobile keywords, platform names (iOS, Android), Expo
   *
   * @example
   * "React Native 컴포넌트 만들어줘" → mobile-developer (0.95)
   * "Flutter 위젯 구현해" → mobile-developer (0.95)
   * "모바일 앱 화면 개발" → mobile-developer (0.90)
   */
  private static readonly MOBILE_INTENT_PATTERNS: Array<{
    pattern: RegExp;
    confidence: number;
    description: string;
  }> = [
    // Platform-specific patterns (0.95)
    {
      pattern: /react.?native/i,
      confidence: 0.95,
      description: 'React Native',
    },
    { pattern: /flutter/i, confidence: 0.95, description: 'Flutter' },
    { pattern: /expo/i, confidence: 0.9, description: 'Expo' },
    { pattern: /swiftui/i, confidence: 0.95, description: 'SwiftUI' },
    {
      pattern: /jetpack\s*compose/i,
      confidence: 0.95,
      description: 'Jetpack Compose',
    },
    // Generic mobile patterns (0.85-0.90)
    {
      pattern: /모바일\s*(앱|개발|화면)/i,
      confidence: 0.9,
      description: 'Korean: mobile app',
    },
    {
      pattern: /mobile\s*(app|develop|screen)/i,
      confidence: 0.9,
      description: 'Mobile app',
    },
    { pattern: /iOS\s*(앱|개발)/i, confidence: 0.9, description: 'iOS app' },
    {
      pattern: /android\s*(앱|개발)/i,
      confidence: 0.9,
      description: 'Android app',
    },
  ];

  /**
   * Intent patterns for tooling-engineer agent.
   *
   * These patterns detect prompts related to configuration, build tools, and package management.
   * They are checked BEFORE context patterns (file path inference) but AFTER explicit agent requests.
   *
   * Resolution Priority Order:
   * 1. Explicit request in prompt ("backend-developer로 작업해") - highest
   * 2. recommended_agent from PLAN mode (PLAN→ACT context passing)
   * 3. **TOOLING_INTENT_PATTERNS** ← checked here
   * 4. DATA_INTENT_PATTERNS
   * 5. MOBILE_INTENT_PATTERNS
   * 6. CONTEXT_PATTERNS (file path/extension inference)
   * 7. Project config (primaryAgent setting)
   * 8. Default fallback (frontend-developer) - lowest
   *
   * Confidence Levels:
   * - 0.95-0.98: Highly specific config file names (tsconfig, vite.config, etc.)
   * - 0.85-0.90: Generic patterns, lock files, Korean keywords
   *
   * @example
   * // English patterns
   * "Fix tsconfig.json error" → tooling-engineer (0.95 confidence)
   * "Update vite.config.ts"   → tooling-engineer (0.95 confidence)
   *
   * // Korean patterns
   * "eslint 설정 변경해줘"    → tooling-engineer (0.85 confidence)
   * "빌드 설정 수정"          → tooling-engineer (0.85 confidence)
   */
  private static readonly TOOLING_INTENT_PATTERNS: Array<{
    pattern: RegExp;
    confidence: number;
    description: string;
  }> = [
    // Config files with high confidence (0.95-0.98)
    {
      pattern: /codingbuddy\.config/i,
      confidence: 0.98,
      description: 'CodingBuddy config',
    },
    {
      pattern: /tsconfig.*\.json/i,
      confidence: 0.95,
      description: 'TypeScript config',
    },
    { pattern: /eslint/i, confidence: 0.95, description: 'ESLint config' },
    { pattern: /prettier/i, confidence: 0.95, description: 'Prettier config' },
    {
      pattern: /stylelint/i,
      confidence: 0.95,
      description: 'Stylelint config',
    },
    // Build tools (0.90-0.95)
    { pattern: /vite\.config/i, confidence: 0.95, description: 'Vite config' },
    {
      pattern: /next\.config/i,
      confidence: 0.95,
      description: 'Next.js config',
    },
    { pattern: /webpack/i, confidence: 0.9, description: 'Webpack config' },
    {
      pattern: /rollup\.config/i,
      confidence: 0.9,
      description: 'Rollup config',
    },
    // Package management (0.85-0.90)
    { pattern: /package\.json/i, confidence: 0.9, description: 'Package.json' },
    {
      pattern: /yarn\.lock|pnpm-lock|package-lock/i,
      confidence: 0.85,
      description: 'Lock files',
    },
    // Generic config patterns (0.85)
    {
      pattern: /\.config\.(js|ts|mjs|cjs|json)$/i,
      confidence: 0.85,
      description: 'Config file extension',
    },
    // Korean patterns (0.85) - for Korean-speaking users
    {
      pattern: /설정\s*(파일|변경|수정)/i,
      confidence: 0.85,
      description: 'Korean: config file',
    },
    {
      pattern: /빌드\s*(설정|도구|환경)/i,
      confidence: 0.85,
      description: 'Korean: build config',
    },
    {
      pattern: /패키지\s*(관리|설치|업데이트|의존성)/i,
      confidence: 0.85,
      description: 'Korean: package management',
    },
    {
      pattern: /린터|린트\s*설정/i,
      confidence: 0.85,
      description: 'Korean: linter config',
    },
  ];

  /** Context patterns for suggesting agents based on file paths */
  private static readonly CONTEXT_PATTERNS: Array<{
    pattern: RegExp;
    agent: string;
    confidence: number;
  }> = [
    // Mobile patterns (highest priority for mobile projects)
    {
      pattern: /react-native\.config\.js$/i,
      agent: 'mobile-developer',
      confidence: 0.95,
    },
    {
      pattern: /metro\.config\.js$/i,
      agent: 'mobile-developer',
      confidence: 0.95,
    },
    { pattern: /app\.json$/i, agent: 'mobile-developer', confidence: 0.85 },
    { pattern: /pubspec\.yaml$/i, agent: 'mobile-developer', confidence: 0.95 },
    { pattern: /\.dart$/i, agent: 'mobile-developer', confidence: 0.9 },
    { pattern: /Podfile$/i, agent: 'mobile-developer', confidence: 0.9 },
    { pattern: /\.swift$/i, agent: 'mobile-developer', confidence: 0.9 },
    {
      pattern: /build\.gradle(\.kts)?$/i,
      agent: 'mobile-developer',
      confidence: 0.85,
    },
    {
      pattern: /AndroidManifest\.xml$/i,
      agent: 'mobile-developer',
      confidence: 0.9,
    },
    { pattern: /\.kt$/i, agent: 'mobile-developer', confidence: 0.85 },
    // Data patterns
    { pattern: /\.sql$/i, agent: 'data-engineer', confidence: 0.9 },
    { pattern: /schema\.prisma$/i, agent: 'data-engineer', confidence: 0.95 },
    { pattern: /migrations?\//i, agent: 'data-engineer', confidence: 0.9 },
    { pattern: /\.entity\.ts$/i, agent: 'data-engineer', confidence: 0.85 },
    // DevOps patterns
    {
      pattern: /Dockerfile|docker-compose/i,
      agent: 'devops-engineer',
      confidence: 0.9,
    },
    // Backend patterns
    { pattern: /\.go$/i, agent: 'backend-developer', confidence: 0.85 },
    { pattern: /\.py$/i, agent: 'backend-developer', confidence: 0.85 },
    { pattern: /\.java$/i, agent: 'backend-developer', confidence: 0.85 },
    { pattern: /\.rs$/i, agent: 'backend-developer', confidence: 0.85 },
    // Frontend patterns (lower priority)
    { pattern: /\.tsx?$/i, agent: 'frontend-developer', confidence: 0.7 },
    { pattern: /\.jsx?$/i, agent: 'frontend-developer', confidence: 0.7 },
    // Agent patterns
    { pattern: /agents?.*\.json$/i, agent: 'agent-architect', confidence: 0.8 },
  ];

  constructor(
    private readonly getProjectConfig: GetProjectConfigFn,
    private readonly listPrimaryAgents: ListPrimaryAgentsFn,
  ) {}

  /**
   * Resolve which Primary Agent to use.
   *
   * Mode-specific behavior:
   * - PLAN: Always uses solution-architect or technical-planner
   * - ACT: Uses recommended agent if provided, otherwise AI analysis
   * - EVAL: Always uses code-reviewer
   *
   * @param recommendedActAgent - ACT agent recommended by PLAN mode (only for ACT mode)
   */
  async resolve(
    mode: Mode,
    prompt: string,
    context?: ResolutionContext,
    recommendedActAgent?: string,
  ): Promise<PrimaryAgentResolutionResult> {
    // EVAL mode is special - always use code-reviewer
    if (mode === 'EVAL') {
      return this.createResult(
        EVAL_PRIMARY_AGENT,
        'default',
        1.0,
        'EVAL mode always uses code-reviewer',
      );
    }

    const availableAgents = await this.safeListPrimaryAgents();

    // PLAN mode - always use solution-architect or technical-planner
    if (mode === 'PLAN') {
      return this.resolvePlanAgent(prompt, availableAgents);
    }

    // ACT mode - use recommended agent or fallback to AI analysis
    return this.resolveActAgent(
      prompt,
      availableAgents,
      context,
      recommendedActAgent,
    );
  }

  /**
   * Resolve PLAN mode agent (always solution-architect or technical-planner).
   * Chooses based on prompt analysis.
   */
  private resolvePlanAgent(
    prompt: string,
    availableAgents: string[],
  ): PrimaryAgentResolutionResult {
    // Check for explicit PLAN agent request
    const explicit = this.parseExplicitRequest(
      prompt,
      availableAgents,
      Array.from(PLAN_PRIMARY_AGENTS),
    );
    if (explicit) {
      return explicit;
    }

    // Analyze prompt to choose between solution-architect and technical-planner
    const planAgent = this.choosePlanAgent(prompt, availableAgents);
    return planAgent;
  }

  /**
   * Choose between solution-architect and technical-planner based on prompt.
   *
   * Priority order:
   * 1. Architecture-only keywords → solution-architect (high-level design)
   * 2. Planning-only keywords → technical-planner (implementation planning)
   * 3. Both patterns match → solution-architect (architecture takes precedence)
   * 4. Neither matches → solution-architect (default for PLAN mode)
   */
  private choosePlanAgent(
    prompt: string,
    availableAgents: string[],
  ): PrimaryAgentResolutionResult {
    // Architecture-focused keywords suggest solution-architect
    const architecturePatterns =
      /아키텍처|architecture|시스템\s*설계|system\s*design|구조|structure|API\s*설계|마이크로서비스|microservice|기술\s*선택|technology/i;

    // Planning/task-focused keywords suggest technical-planner
    const planningPatterns =
      /계획|plan|단계|step|태스크|task|TDD|구현\s*순서|implementation\s*order|리팩토링|refactor/i;

    const hasArchitectureIntent = architecturePatterns.test(prompt);
    const hasPlanningIntent = planningPatterns.test(prompt);

    // Priority 1: Architecture-only → solution-architect
    if (hasArchitectureIntent && !hasPlanningIntent) {
      if (availableAgents.includes('solution-architect')) {
        return this.createResult(
          'solution-architect',
          'intent',
          0.9,
          'Architecture-focused task detected in PLAN mode',
        );
      }
    }

    // Priority 2: Planning-only → technical-planner
    if (hasPlanningIntent && !hasArchitectureIntent) {
      if (availableAgents.includes('technical-planner')) {
        return this.createResult(
          'technical-planner',
          'intent',
          0.9,
          'Planning/implementation-focused task detected in PLAN mode',
        );
      }
    }

    // Priority 3: Both patterns match → solution-architect (architecture precedence)
    if (hasArchitectureIntent && hasPlanningIntent) {
      if (availableAgents.includes('solution-architect')) {
        return this.createResult(
          'solution-architect',
          'intent',
          0.85,
          'Both architecture and planning detected; architecture takes precedence',
        );
      }
    }

    // Priority 4: Neither matches → default to solution-architect
    const defaultPlanAgent = availableAgents.includes('solution-architect')
      ? 'solution-architect'
      : availableAgents.includes('technical-planner')
        ? 'technical-planner'
        : DEFAULT_ACT_AGENT;

    return this.createResult(
      defaultPlanAgent,
      'default',
      1.0,
      'PLAN mode default: solution-architect for high-level design',
    );
  }

  /**
   * Resolve ACT mode agent.
   * Priority: explicit > recommended > tooling-intent > data-intent > mobile-intent > config > context > default
   */
  private async resolveActAgent(
    prompt: string,
    availableAgents: string[],
    context?: ResolutionContext,
    recommendedActAgent?: string,
  ): Promise<PrimaryAgentResolutionResult> {
    // 1. Check explicit request in prompt
    const explicit = this.parseExplicitRequest(
      prompt,
      availableAgents,
      Array.from(ACT_PRIMARY_AGENTS),
    );
    if (explicit) {
      return explicit;
    }

    // 2. Use recommended agent from PLAN mode if provided
    if (recommendedActAgent && availableAgents.includes(recommendedActAgent)) {
      return this.createResult(
        recommendedActAgent,
        'config', // Source is 'config' as it comes from PLAN recommendation
        1.0,
        `Using recommended agent from PLAN mode: ${recommendedActAgent}`,
      );
    }

    // 3. Check tooling intent patterns (high priority for config/build tasks)
    const fromTooling = this.inferFromToolingPatterns(prompt, availableAgents);
    if (fromTooling) {
      return fromTooling;
    }

    // 4. Check data intent patterns (database/schema tasks)
    const fromData = this.inferFromDataPatterns(prompt, availableAgents);
    if (fromData) {
      return fromData;
    }

    // 5. Check mobile intent patterns (mobile app tasks)
    const fromMobile = this.inferFromMobilePatterns(prompt, availableAgents);
    if (fromMobile) {
      return fromMobile;
    }

    // 6. Check project configuration
    const fromConfig = await this.getFromProjectConfig(availableAgents);
    if (fromConfig) {
      return fromConfig;
    }

    // 7. Check context-based suggestion
    if (context) {
      const fromContext = this.inferFromContext(context, availableAgents);
      if (fromContext && fromContext.confidence >= 0.8) {
        return fromContext;
      }
    }

    // 8. Default fallback for ACT mode
    return this.createResult(
      DEFAULT_ACT_AGENT,
      'default',
      1.0,
      'ACT mode default: frontend-developer',
    );
  }

  /**
   * Infer tooling-engineer from prompt content patterns.
   * High priority for config files, build tools, and package management tasks.
   */
  private inferFromToolingPatterns(
    prompt: string,
    availableAgents: string[],
  ): PrimaryAgentResolutionResult | null {
    if (!availableAgents.includes('tooling-engineer')) {
      return null;
    }

    for (const {
      pattern,
      confidence,
      description,
    } of PrimaryAgentResolver.TOOLING_INTENT_PATTERNS) {
      if (pattern.test(prompt)) {
        return this.createResult(
          'tooling-engineer',
          'intent',
          confidence,
          `Tooling pattern detected: ${description}`,
        );
      }
    }

    return null;
  }

  /**
   * Infer data-engineer from prompt content patterns.
   * High priority for database, schema, and data tasks.
   */
  private inferFromDataPatterns(
    prompt: string,
    availableAgents: string[],
  ): PrimaryAgentResolutionResult | null {
    if (!availableAgents.includes('data-engineer')) {
      return null;
    }

    for (const {
      pattern,
      confidence,
      description,
    } of PrimaryAgentResolver.DATA_INTENT_PATTERNS) {
      if (pattern.test(prompt)) {
        return this.createResult(
          'data-engineer',
          'intent',
          confidence,
          `Data pattern detected: ${description}`,
        );
      }
    }

    return null;
  }

  /**
   * Infer mobile-developer from prompt content patterns.
   * High priority for mobile app development tasks.
   */
  private inferFromMobilePatterns(
    prompt: string,
    availableAgents: string[],
  ): PrimaryAgentResolutionResult | null {
    if (!availableAgents.includes('mobile-developer')) {
      return null;
    }

    for (const {
      pattern,
      confidence,
      description,
    } of PrimaryAgentResolver.MOBILE_INTENT_PATTERNS) {
      if (pattern.test(prompt)) {
        return this.createResult(
          'mobile-developer',
          'intent',
          confidence,
          `Mobile pattern detected: ${description}`,
        );
      }
    }

    return null;
  }

  /**
   * Parse explicit agent request from prompt.
   * Returns null if no explicit request found or agent not in registry.
   *
   * @param prompt - User prompt to analyze
   * @param availableAgents - All available agents from registry
   * @param allowedAgents - Optional filter to only match specific agents (e.g., PLAN_AGENTS or ACT_AGENTS)
   */
  private parseExplicitRequest(
    prompt: string,
    availableAgents: string[],
    allowedAgents?: string[],
  ): PrimaryAgentResolutionResult | null {
    for (const pattern of PrimaryAgentResolver.EXPLICIT_PATTERNS) {
      const match = prompt.match(pattern);
      if (match?.[1]) {
        const agentName = match[1].toLowerCase();
        // Must be in available agents AND (if specified) in allowed agents
        const isAvailable = availableAgents.includes(agentName);
        const isAllowed = !allowedAgents || allowedAgents.includes(agentName);
        if (isAvailable && isAllowed) {
          return this.createResult(
            agentName,
            'explicit',
            1.0,
            `Explicit request for ${agentName} in prompt`,
          );
        }
      }
    }
    return null;
  }

  /**
   * Get Primary Agent from project configuration.
   * Returns null if no config or configured agent not in registry.
   */
  private async getFromProjectConfig(
    availableAgents: string[],
  ): Promise<PrimaryAgentResolutionResult | null> {
    try {
      const config = await this.getProjectConfig();
      if (config?.primaryAgent) {
        const agentName = config.primaryAgent.toLowerCase();
        if (availableAgents.includes(agentName)) {
          return this.createResult(
            agentName,
            'config',
            1.0,
            `Configured in project: ${agentName}`,
          );
        }
        // Agent configured but not available
        this.logger.warn(
          `Configured agent '${config.primaryAgent}' not found in registry. ` +
            `Available: ${availableAgents.join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load project config for agent resolution: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
    return null;
  }

  /**
   * Infer Primary Agent from context (file path, project type).
   * Returns result with confidence score.
   */
  private inferFromContext(
    context: ResolutionContext,
    availableAgents: string[],
  ): PrimaryAgentResolutionResult | null {
    if (context.filePath) {
      for (const {
        pattern,
        agent,
        confidence,
      } of PrimaryAgentResolver.CONTEXT_PATTERNS) {
        if (pattern.test(context.filePath)) {
          if (availableAgents.includes(agent)) {
            return this.createResult(
              agent,
              'context',
              confidence,
              `Inferred from file path: ${context.filePath}`,
            );
          }
        }
      }
    }

    // Additional inference from projectType if provided
    if (context.projectType === 'infrastructure') {
      if (availableAgents.includes('devops-engineer')) {
        return this.createResult(
          'devops-engineer',
          'context',
          0.85,
          `Inferred from project type: ${context.projectType}`,
        );
      }
    }

    return null;
  }

  /**
   * Safely list primary agents, returning default list on error.
   */
  private async safeListPrimaryAgents(): Promise<string[]> {
    try {
      const agents = await this.listPrimaryAgents();
      if (agents.length === 0) {
        this.logger.debug(
          'No primary agents found in registry, using default fallback list',
        );
        return [...ALL_PRIMARY_AGENTS];
      }
      return agents;
    } catch (error) {
      this.logger.warn(
        `Failed to list primary agents: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
          `Using fallback list.`,
      );
      return [...ALL_PRIMARY_AGENTS];
    }
  }

  /**
   * Create a resolution result object.
   */
  private createResult(
    agentName: string,
    source: PrimaryAgentSource,
    confidence: number,
    reason: string,
  ): PrimaryAgentResolutionResult {
    return { agentName, source, confidence, reason };
  }
}
