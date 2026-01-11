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
  /** List of agent names to exclude from automatic resolution */
  excludeAgents?: string[];
}

/** Function type for loading project config */
type GetProjectConfigFn = () => Promise<ProjectConfig | null>;

/** Function type for listing available primary agents */
type ListPrimaryAgentsFn = () => Promise<string[]>;

/**
 * IntentPattern - Reusable type for pattern-based agent matching.
 *
 * Used by all intent pattern arrays (DATA_INTENT_PATTERNS, MOBILE_INTENT_PATTERNS, etc.)
 * and the generic inferFromIntentPatterns method.
 *
 * @property pattern - Regex pattern to match against user prompts
 * @property confidence - Match confidence score (0.0 - 1.0)
 * @property description - Human-readable description for logging/debugging
 */
export type IntentPattern = {
  readonly pattern: RegExp;
  readonly confidence: number;
  readonly description: string;
};

/**
 * IntentPatternCheck - Configuration for checking a specific agent's intent patterns.
 * Used by the static INTENT_PATTERN_CHECKS array.
 */
type IntentPatternCheck = {
  readonly agent: string;
  readonly patterns: ReadonlyArray<IntentPattern>;
  readonly category: string;
};

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
  private static readonly DATA_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
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
  private static readonly MOBILE_INTENT_PATTERNS: ReadonlyArray<IntentPattern> =
    [
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
   * 4. PLATFORM_INTENT_PATTERNS
   * 5. DATA_INTENT_PATTERNS
   * 6. MOBILE_INTENT_PATTERNS
   * 7. CONTEXT_PATTERNS (file path/extension inference)
   * 8. Project config (primaryAgent setting)
   * 9. Default fallback (frontend-developer) - lowest
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
  private static readonly TOOLING_INTENT_PATTERNS: ReadonlyArray<IntentPattern> =
    [
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
      {
        pattern: /prettier/i,
        confidence: 0.95,
        description: 'Prettier config',
      },
      {
        pattern: /stylelint/i,
        confidence: 0.95,
        description: 'Stylelint config',
      },
      // Build tools (0.90-0.95)
      {
        pattern: /vite\.config/i,
        confidence: 0.95,
        description: 'Vite config',
      },
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
      {
        pattern: /package\.json/i,
        confidence: 0.9,
        description: 'Package.json',
      },
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

  /**
   * Intent patterns for platform-engineer agent.
   *
   * These patterns detect prompts related to Infrastructure as Code, Kubernetes,
   * multi-cloud, GitOps, and platform engineering tasks.
   * Priority: 4th (after explicit, recommended, tooling patterns; before data, mobile, context).
   *
   * Confidence Levels:
   * - 0.95: Highly specific IaC tools (Terraform, Pulumi, Helm, Argo CD)
   * - 0.90: Kubernetes, cloud provider infrastructure, GitOps keywords
   * - 0.85: Generic infrastructure patterns, Korean keywords
   *
   * ## Pattern Overlap with Tooling Engineer
   *
   * Both agents deal with configuration files, but they serve different purposes:
   *
   * | Pattern Type | tooling-engineer | platform-engineer |
   * |--------------|------------------|-------------------|
   * | Config files | tsconfig, vite.config, eslint | terraform.tf, Chart.yaml |
   * | Focus area   | Build tools, bundlers, linters | IaC, K8s, cloud infra |
   * | Resolution   | Checked 3rd (higher priority) | Checked 4th (after tooling) |
   *
   * Conflict Resolution:
   * - tooling-engineer patterns are checked BEFORE platform-engineer
   * - If both could match, tooling-engineer wins by priority order
   * - Platform-specific keywords (terraform, helm, k8s) are unambiguous
   *
   * @example
   * "terraform 모듈 작성해줘" → platform-engineer (0.95)
   * "k8s 매니페스트 수정" → platform-engineer (0.90)
   * "인프라 코드 설정" → platform-engineer (0.85)
   */
  private static readonly PLATFORM_INTENT_PATTERNS: ReadonlyArray<IntentPattern> =
    [
      // IaC tools (0.95)
      { pattern: /terraform/i, confidence: 0.95, description: 'Terraform' },
      { pattern: /pulumi/i, confidence: 0.95, description: 'Pulumi' },
      { pattern: /aws.?cdk/i, confidence: 0.95, description: 'AWS CDK' },
      { pattern: /helm/i, confidence: 0.95, description: 'Helm chart' },
      {
        pattern: /argocd|argo.?cd/i,
        confidence: 0.95,
        description: 'Argo CD',
      },
      { pattern: /flux.?cd|fluxcd/i, confidence: 0.95, description: 'Flux CD' },
      // Kubernetes patterns (0.90-0.95)
      {
        pattern: /kubernetes|k8s/i,
        confidence: 0.9,
        description: 'Kubernetes',
      },
      {
        pattern: /kustomize|kustomization/i,
        confidence: 0.95,
        description: 'Kustomize',
      },
      {
        pattern: /kubectl|kubeconfig/i,
        confidence: 0.9,
        description: 'Kubectl',
      },
      {
        pattern: /k8s.*manifest|manifest.*k8s|kubernetes.*manifest/i,
        confidence: 0.9,
        description: 'K8s manifest',
      },
      // Cloud provider infrastructure (0.85-0.90)
      {
        pattern: /EKS|GKE|AKS/i,
        confidence: 0.9,
        description: 'Managed Kubernetes',
      },
      {
        pattern: /IRSA|workload.?identity/i,
        confidence: 0.9,
        description: 'Workload identity',
      },
      {
        pattern: /인프라\s*(코드|설정|관리|자동화)/i,
        confidence: 0.85,
        description: 'Korean: infrastructure',
      },
      {
        pattern: /infrastructure.?as.?code|IaC/i,
        confidence: 0.9,
        description: 'Infrastructure as Code',
      },
      // GitOps patterns (0.90)
      { pattern: /gitops/i, confidence: 0.9, description: 'GitOps' },
      // Multi-cloud patterns (0.85)
      {
        pattern: /multi.?cloud|hybrid.?cloud/i,
        confidence: 0.85,
        description: 'Multi-cloud',
      },
      // Cost optimization patterns (0.85)
      {
        pattern: /finops|cloud.?cost|비용\s*최적화/i,
        confidence: 0.85,
        description: 'Cloud cost optimization',
      },
      // Disaster recovery (0.85)
      {
        pattern: /disaster.?recovery|RTO|RPO/i,
        confidence: 0.85,
        description: 'Disaster recovery',
      },
    ];

  /**
   * Intent patterns for ai-ml-engineer agent.
   *
   * These patterns detect prompts related to machine learning, AI models,
   * and LLM development tasks.
   * Priority: 5th (after explicit, recommended, tooling, platform patterns).
   *
   * Confidence Levels:
   * - 0.95: ML/AI frameworks (PyTorch, TensorFlow, HuggingFace, LangChain)
   * - 0.90: ML concepts (training, fine-tuning, embeddings, RAG)
   * - 0.85: Generic AI/ML keywords
   *
   * @example
   * "PyTorch 모델 학습시켜줘" → ai-ml-engineer (0.95)
   * "LangChain으로 RAG 구현" → ai-ml-engineer (0.95)
   * "임베딩 생성해줘" → ai-ml-engineer (0.90)
   */
  private static readonly AI_ML_INTENT_PATTERNS: ReadonlyArray<IntentPattern> =
    [
      // ML Frameworks (0.95)
      {
        pattern: /pytorch|tensorflow|keras|jax/i,
        confidence: 0.95,
        description: 'ML Framework',
      },
      {
        pattern: /hugging\s*face|transformers|diffusers/i,
        confidence: 0.95,
        description: 'HuggingFace',
      },
      {
        pattern: /langchain|llama.?index|llamaindex/i,
        confidence: 0.95,
        description: 'LLM Framework',
      },
      {
        pattern: /openai\s*(api|sdk)|anthropic\s*(api|sdk)/i,
        confidence: 0.95,
        description: 'LLM API',
      },
      // ML Concepts (0.90)
      {
        pattern: /machine\s*learning|ML\s*(모델|model|파이프라인|pipeline)/i,
        confidence: 0.9,
        description: 'Machine Learning',
      },
      {
        pattern: /딥\s*러닝|deep\s*learning|신경망|neural\s*network/i,
        confidence: 0.9,
        description: 'Deep Learning',
      },
      {
        pattern: /모델\s*학습|train.*model|fine.?tun|파인\s*튜닝/i,
        confidence: 0.9,
        description: 'Model Training',
      },
      {
        pattern: /RAG|retrieval.*augment|검색\s*증강/i,
        confidence: 0.9,
        description: 'RAG',
      },
      {
        pattern: /프롬프트\s*엔지니어링|prompt\s*engineer/i,
        confidence: 0.9,
        description: 'Prompt Engineering',
      },
      {
        pattern: /LLM\s*(개발|develop|구현|implement|통합|integrat)/i,
        confidence: 0.9,
        description: 'LLM Development',
      },
      // Generic AI/ML patterns (0.85)
      {
        pattern: /임베딩|embedding|벡터\s*(DB|database|저장)/i,
        confidence: 0.85,
        description: 'Embeddings',
      },
      {
        pattern: /추론|inference|predict|예측\s*모델/i,
        confidence: 0.85,
        description: 'Inference',
      },
      {
        pattern: /AI\s*(모델|model|에이전트|agent|챗봇|chatbot)/i,
        confidence: 0.85,
        description: 'AI Model/Agent',
      },
      // Korean patterns (0.85)
      {
        pattern: /자연어\s*처리|NLP|텍스트\s*분석/i,
        confidence: 0.85,
        description: 'NLP',
      },
      {
        pattern: /컴퓨터\s*비전|computer\s*vision|이미지\s*인식/i,
        confidence: 0.85,
        description: 'Computer Vision',
      },
    ];

  /**
   * Intent patterns for backend-developer agent.
   *
   * These patterns detect prompts related to server-side development,
   * API design, and backend services.
   * Priority: 6th (after AI/ML patterns).
   *
   * Confidence Levels:
   * - 0.95: Backend frameworks (NestJS, Express, Django, Spring)
   * - 0.90: API patterns (REST, GraphQL, gRPC), server concepts
   * - 0.85: Generic backend keywords
   *
   * @example
   * "NestJS API 만들어줘" → backend-developer (0.95)
   * "REST API 설계해줘" → backend-developer (0.90)
   * "서버 로직 구현" → backend-developer (0.85)
   */
  private static readonly BACKEND_INTENT_PATTERNS: ReadonlyArray<IntentPattern> =
    [
      // Node.js Backend Frameworks (0.95)
      {
        pattern: /nestjs|nest\.js/i,
        confidence: 0.95,
        description: 'NestJS',
      },
      {
        pattern: /express\.js|express\s+서버|express\s+server/i,
        confidence: 0.95,
        description: 'Express',
      },
      {
        pattern: /fastify|koa\.js|hapi/i,
        confidence: 0.95,
        description: 'Node.js Framework',
      },
      // Python Backend Frameworks (0.95)
      {
        pattern: /django|flask|fastapi/i,
        confidence: 0.95,
        description: 'Python Framework',
      },
      // Other Backend Frameworks (0.95)
      {
        pattern: /spring\s*boot|spring\s*framework/i,
        confidence: 0.95,
        description: 'Spring Boot',
      },
      {
        pattern: /gin|echo|fiber/i,
        confidence: 0.9,
        description: 'Go Framework',
      },
      {
        pattern: /rails|ruby\s+on\s+rails/i,
        confidence: 0.95,
        description: 'Ruby on Rails',
      },
      // API Patterns (0.90)
      {
        pattern: /REST\s*API|RESTful/i,
        confidence: 0.9,
        description: 'REST API',
      },
      {
        pattern: /GraphQL\s*(API|서버|server|스키마|schema)/i,
        confidence: 0.9,
        description: 'GraphQL',
      },
      {
        pattern: /gRPC|protobuf/i,
        confidence: 0.9,
        description: 'gRPC',
      },
      // Server concepts (0.85-0.90)
      {
        pattern: /API\s*(설계|개발|구현|design|develop|implement)/i,
        confidence: 0.9,
        description: 'API Development',
      },
      {
        pattern: /서버\s*(개발|구현|로직)|server.?side\s*(logic|develop)/i,
        confidence: 0.85,
        description: 'Server Development',
      },
      {
        pattern:
          /백엔드\s*(개발|구현|로직)|backend\s*(develop|logic|implement)/i,
        confidence: 0.85,
        description: 'Backend Development',
      },
      {
        pattern: /미들웨어|middleware/i,
        confidence: 0.85,
        description: 'Middleware',
      },
      {
        pattern: /인증\s*서버|auth.*server|OAuth\s*서버/i,
        confidence: 0.85,
        description: 'Auth Server',
      },
      {
        pattern: /웹소켓|websocket|socket\.io/i,
        confidence: 0.85,
        description: 'WebSocket',
      },
      {
        pattern: /마이크로서비스|microservice/i,
        confidence: 0.85,
        description: 'Microservice',
      },
    ];

  /**
   * Intent patterns for agent-architect agent.
   *
   * These patterns detect prompts related to AI agent development,
   * workflow automation, and MCP server development.
   * Priority: 1st (moved up to prevent false positives from agent name mentions).
   *
   * Confidence Levels:
   * - 0.95: MCP-specific patterns, agent framework patterns
   * - 0.90: Workflow automation, LLM orchestration, agent creation (만들다)
   * - 0.85: Generic agent/automation keywords
   *
   * @example
   * "MCP 서버 만들어줘" → agent-architect (0.95)
   * "AI 에이전트 설계해줘" → agent-architect (0.90)
   * "워크플로우 자동화 구현" → agent-architect (0.90)
   * "Agent를 만드는 작업" → agent-architect (0.90)
   */
  private static readonly AGENT_INTENT_PATTERNS: ReadonlyArray<IntentPattern> =
    [
      // MCP-specific patterns (0.95)
      {
        pattern: /MCP\s*(서버|server|tool|도구)/i,
        confidence: 0.95,
        description: 'MCP Server',
      },
      {
        pattern: /model\s*context\s*protocol/i,
        confidence: 0.95,
        description: 'Model Context Protocol',
      },
      // Agent framework patterns (0.95)
      {
        pattern: /에이전트\s*(설계|개발|구현|아키텍처)/i,
        confidence: 0.95,
        description: 'Korean: Agent Development',
      },
      {
        pattern: /agent\s*(design|develop|architect|framework)/i,
        confidence: 0.95,
        description: 'Agent Development',
      },
      {
        pattern: /claude\s*(code|에이전트|agent|sdk)/i,
        confidence: 0.95,
        description: 'Claude Agent',
      },
      // Agent creation patterns using 만들다 verb (0.90)
      {
        pattern: /agent.?를?\s*만[들드]/i,
        confidence: 0.9,
        description: 'Korean: Creating Agent (with English)',
      },
      {
        pattern: /에이전트\s*만[들드]/i,
        confidence: 0.9,
        description: 'Korean: Creating Agent (native)',
      },
      // Agent JSON/schema patterns (0.90)
      {
        pattern: /\.json\s*(에이전트|agent)|agent.*\.json/i,
        confidence: 0.9,
        description: 'Agent JSON Definition',
      },
      {
        pattern: /specialist.*agent|agent.*specialist/i,
        confidence: 0.9,
        description: 'Specialist Agent',
      },
      {
        pattern: /primary.*agent|agent.*resolver|agent.*select/i,
        confidence: 0.9,
        description: 'Agent Resolution',
      },
      // Workflow automation (0.90)
      {
        pattern: /워크플로우\s*(자동화|설계|구현)/i,
        confidence: 0.9,
        description: 'Korean: Workflow Automation',
      },
      {
        pattern: /workflow\s*(automat|design|orchestrat)/i,
        confidence: 0.9,
        description: 'Workflow Automation',
      },
      {
        pattern: /LLM\s*(체인|chain|오케스트레이션|orchestrat)/i,
        confidence: 0.9,
        description: 'LLM Orchestration',
      },
      {
        pattern: /AI\s*에이전트\s*(설계|개발)|AI\s*agent\s*(design|develop)/i,
        confidence: 0.9,
        description: 'AI Agent Design',
      },
      // Generic patterns (0.85)
      {
        pattern: /자동화\s*(파이프라인|pipeline|시스템)/i,
        confidence: 0.85,
        description: 'Automation Pipeline',
      },
      {
        pattern: /tool\s*(use|calling|호출)|function\s*calling/i,
        confidence: 0.85,
        description: 'Tool Calling',
      },
      {
        pattern: /멀티\s*에이전트|multi.?agent/i,
        confidence: 0.85,
        description: 'Multi-Agent',
      },
    ];

  /**
   * Static array of intent pattern checks for ACT mode agent resolution.
   *
   * Cached as static property to avoid per-call allocation.
   * Priority is determined by array order (first match wins).
   *
   * Pattern check order (reordered to prevent false positives):
   * 1. agent-architect - MCP, AI agents, workflows (MOVED UP - prevents false positives from agent name mentions)
   * 2. tooling-engineer - Build tools, linters, bundlers
   * 3. platform-engineer - IaC, Kubernetes, cloud infrastructure
   * 4. data-engineer - Database, schema, migrations
   * 5. ai-ml-engineer - ML frameworks, LLM, embeddings
   * 6. backend-developer - APIs, servers, authentication
   * 7. mobile-developer - React Native, Flutter, iOS/Android (MOVED DOWN - "mobile develop" patterns are greedy)
   */
  private static readonly INTENT_PATTERN_CHECKS: ReadonlyArray<IntentPatternCheck> =
    [
      // Agent-related patterns first (prevents "Mobile Developer" text triggering mobile patterns)
      {
        agent: 'agent-architect',
        patterns: PrimaryAgentResolver.AGENT_INTENT_PATTERNS,
        category: 'Agent',
      },
      {
        agent: 'tooling-engineer',
        patterns: PrimaryAgentResolver.TOOLING_INTENT_PATTERNS,
        category: 'Tooling',
      },
      {
        agent: 'platform-engineer',
        patterns: PrimaryAgentResolver.PLATFORM_INTENT_PATTERNS,
        category: 'Platform',
      },
      {
        agent: 'data-engineer',
        patterns: PrimaryAgentResolver.DATA_INTENT_PATTERNS,
        category: 'Data',
      },
      {
        agent: 'ai-ml-engineer',
        patterns: PrimaryAgentResolver.AI_ML_INTENT_PATTERNS,
        category: 'AI/ML',
      },
      {
        agent: 'backend-developer',
        patterns: PrimaryAgentResolver.BACKEND_INTENT_PATTERNS,
        category: 'Backend',
      },
      // Mobile patterns last (they are greedy and can match agent name mentions)
      {
        agent: 'mobile-developer',
        patterns: PrimaryAgentResolver.MOBILE_INTENT_PATTERNS,
        category: 'Mobile',
      },
    ];

  /**
   * Meta-discussion patterns to detect when user is DISCUSSING agents rather than
   * REQUESTING work for a specific agent type.
   *
   * These patterns prevent false positives like:
   * - "Mobile Developer가 매칭되었어" → should NOT trigger mobile-developer
   * - "Frontend Developer Agent가 사용되고 있어" → should NOT trigger frontend-developer
   * - "Primary Agent 선택 로직 점검" → discussing agent system itself
   *
   * When meta-discussion is detected, intent patterns are skipped to avoid
   * incorrect agent matching based on agent names mentioned in discussion.
   */
  private static readonly META_AGENT_DISCUSSION_PATTERNS: ReadonlyArray<RegExp> =
    [
      // Discussing specific agent names (Korean particles indicate object/subject)
      /(?:mobile|frontend|backend|data|platform|devops|ai-?ml).?(?:developer|engineer)\s*(?:가|이|를|은|는|로|에|의|와|과)/i,
      // Discussing agent matching/selection/resolution
      /(?:agent|에이전트)\s*(?:매칭|호출|선택|resolution|matching|selection|추천|recommendation)/i,
      // Discussing Primary Agent system (NOT implementation - requires discussion keywords)
      // "primary agent 선택 로직" → meta-discussion
      // "primary agent resolver 코드 수정" → implementation work (NOT matched)
      /primary\s*agent\s*(?:선택|매칭|시스템|system)/i,
      // Discussing agent activation/invocation issues
      /(?:agent|에이전트)\s*(?:활성화|activation|호출|invocation|파이프라인|pipeline)/i,
      // Debugging agent behavior
      /(?:agent|에이전트).{0,20}(?:버그|bug|문제|issue|오류|error|잘못|wrong)/i,
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
    // Platform Engineering / IaC patterns (highest priority for infra files)
    { pattern: /\.tf$/i, agent: 'platform-engineer', confidence: 0.95 },
    { pattern: /\.tfvars$/i, agent: 'platform-engineer', confidence: 0.95 },
    {
      pattern: /terragrunt\.hcl$/i,
      agent: 'platform-engineer',
      confidence: 0.95,
    },
    { pattern: /Chart\.yaml$/i, agent: 'platform-engineer', confidence: 0.95 },
    { pattern: /values\.yaml$/i, agent: 'platform-engineer', confidence: 0.75 },
    {
      pattern: /helm.*templates\/|charts\/.*templates\//i,
      agent: 'platform-engineer',
      confidence: 0.9,
    },
    {
      pattern: /kustomization\.ya?ml$/i,
      agent: 'platform-engineer',
      confidence: 0.95,
    },
    {
      pattern: /Pulumi\.ya?ml$/i,
      agent: 'platform-engineer',
      confidence: 0.95,
    },
    {
      pattern: /argocd\/|argo-cd\//i,
      agent: 'platform-engineer',
      confidence: 0.9,
    },
    {
      pattern: /flux-system\//i,
      agent: 'platform-engineer',
      confidence: 0.9,
    },
    // DevOps patterns (CI/CD, containers)
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

    // Get available agents and filter out excluded ones
    const allAgents = await this.safeListPrimaryAgents();
    const availableAgents = await this.filterExcludedAgents(allAgents);

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
   * Filter out agents that are excluded in project configuration.
   * This allows projects to prevent certain agents from being recommended.
   *
   * @example
   * // codingbuddy.config.js
   * ai: {
   *   excludeAgents: ['mobile-developer', 'frontend-developer'],
   * }
   */
  private async filterExcludedAgents(agents: string[]): Promise<string[]> {
    try {
      const config = await this.getProjectConfig();
      if (config?.excludeAgents && config.excludeAgents.length > 0) {
        const excluded = new Set(
          config.excludeAgents.map(a => a.toLowerCase()),
        );
        const filtered = agents.filter(agent => !excluded.has(agent));

        if (filtered.length < agents.length) {
          this.logger.debug(
            `Excluded agents from resolution: ${config.excludeAgents.join(', ')}`,
          );
        }

        return filtered;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to get excludeAgents from config: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
    return agents;
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
   * Priority: explicit > recommended > config > (skip intent if meta-discussion) > intent patterns > context > default
   *
   * Resolution order (fixed priority inversion bug):
   * 1. Explicit request in prompt ("backend-developer로 작업해")
   * 2. Recommended agent from PLAN mode
   * 3. Project configuration (primaryAgent setting) ← MOVED UP from step 10
   * 4. Meta-discussion detection (skip intent patterns if discussing agent names)
   * 5-11. Intent patterns (agent, tooling, platform, data, ai-ml, backend, mobile)
   * 12. Context-based suggestion (file path inference)
   * 13. Default fallback
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

    // 3. Check project configuration (MOVED UP - fixes priority inversion bug)
    // Project config should take precedence over intent pattern matching
    const fromConfig = await this.getFromProjectConfig(availableAgents);
    if (fromConfig) {
      return fromConfig;
    }

    // 4. Meta-discussion detection: Skip intent patterns if discussing agent names
    // Prevents false positives like "Mobile Developer가 매칭되었어" triggering mobile patterns
    if (this.isMetaAgentDiscussion(prompt)) {
      this.logger.debug(
        'Meta-agent discussion detected, skipping intent patterns',
      );
      // Fall through to context and default
    } else {
      // 5-11. Check intent patterns in priority order using static INTENT_PATTERN_CHECKS
      // Pattern priority is determined by array order (first match wins within each category)
      for (const {
        agent,
        patterns,
        category,
      } of PrimaryAgentResolver.INTENT_PATTERN_CHECKS) {
        const result = this.inferFromIntentPatterns(
          prompt,
          availableAgents,
          agent,
          patterns,
          category,
        );
        if (result) {
          return result;
        }
      }
    }

    // 12. Check context-based suggestion
    if (context) {
      const fromContext = this.inferFromContext(context, availableAgents);
      if (fromContext && fromContext.confidence >= 0.8) {
        return fromContext;
      }
    }

    // 13. Default fallback for ACT mode
    // Check if default agent is available (might be excluded)
    if (availableAgents.includes(DEFAULT_ACT_AGENT)) {
      return this.createResult(
        DEFAULT_ACT_AGENT,
        'default',
        1.0,
        'ACT mode default: frontend-developer (no specific intent detected)',
      );
    }

    // If default is excluded, use the first available agent
    if (availableAgents.length > 0) {
      return this.createResult(
        availableAgents[0],
        'default',
        0.8,
        `ACT mode fallback: ${availableAgents[0]} (default agent excluded)`,
      );
    }

    // Ultimate fallback - should rarely happen
    return this.createResult(
      DEFAULT_ACT_AGENT,
      'default',
      0.5,
      'ACT mode fallback: frontend-developer (no agents available)',
    );
  }

  /**
   * Generic method to infer agent from intent patterns.
   *
   * Consolidates pattern-based agent inference into a single reusable function.
   * Follows DRY principle by eliminating 7 near-identical methods.
   * Follows Open/Closed principle - add new agents by adding patterns, not modifying code.
   *
   * @param prompt - User prompt to analyze
   * @param availableAgents - List of available agents
   * @param targetAgent - The agent name to match (e.g., 'tooling-engineer')
   * @param patterns - Array of patterns with confidence and description
   * @param patternCategory - Category name for result message (e.g., 'Tooling', 'Platform')
   * @returns Resolution result if matched, null otherwise
   */
  private inferFromIntentPatterns(
    prompt: string,
    availableAgents: string[],
    targetAgent: string,
    patterns: ReadonlyArray<IntentPattern>,
    patternCategory: string,
  ): PrimaryAgentResolutionResult | null {
    if (!availableAgents.includes(targetAgent)) {
      return null;
    }

    for (const { pattern, confidence, description } of patterns) {
      if (pattern.test(prompt)) {
        return this.createResult(
          targetAgent,
          'intent',
          confidence,
          `${patternCategory} pattern detected: ${description}`,
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
   * Detect if the prompt is a meta-discussion ABOUT agents rather than
   * a request FOR a specific type of work.
   *
   * This prevents false positives where mentioning agent names (e.g., "Mobile Developer")
   * in discussion triggers incorrect agent matching.
   *
   * @example
   * // Returns true (meta-discussion)
   * "Mobile Developer가 매칭되었어" → discussing agent behavior
   * "Primary Agent 선택 로직 점검해줘" → discussing agent system
   *
   * // Returns false (actual work request)
   * "모바일 앱 개발해줘" → requesting mobile development work
   * "React Native 컴포넌트 만들어" → requesting mobile development work
   */
  private isMetaAgentDiscussion(prompt: string): boolean {
    return PrimaryAgentResolver.META_AGENT_DISCUSSION_PATTERNS.some(pattern =>
      pattern.test(prompt),
    );
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
