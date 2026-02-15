export interface CodeExampleData {
  /** 고유 ID */
  id: string;
  /** 접근성 라벨 (TabsList 구분용) */
  label: string;
  /** 프로그래밍 언어 (prism 토큰) */
  language: string;
  /** Before 코드 (단일 AI 도구 사용 시) */
  before: string;
  /** After 코드 (Codingbuddy 사용 시) */
  after: string;
}

export const codeExamples: readonly CodeExampleData[] = [
  {
    id: 'multi-ai-rules',
    label: 'Multi AI Rules',
    language: 'yaml',
    before: `# .cursorrules
rules:
  - "Use TypeScript strict mode"
  - "Follow TDD cycle"
  - "90% test coverage"

# .claude/rules/custom.md (copy-paste again...)
# .codex/instructions.md (copy-paste again...)
# .q/rules.md (copy-paste again...)
# 🔴 4 different files, same rules, always out of sync`,
    after: `# codingbuddy.config.json
{
  "rules": ".ai-rules/",
  "agents": ".ai-rules/agents/",
  "adapters": ["cursor", "claude", "codex", "q", "kiro"]
}

# ✅ One source of truth → All AI tools in sync
# ✅ 29 specialist agents included
# ✅ TDD, Security, a11y checklists built-in`,
  },
  {
    id: 'specialist-agents',
    label: 'Specialist Agents',
    language: 'typescript',
    before: `// Without Codingbuddy: manual prompting
const prompt = \`
  Review this code for:
  - Security vulnerabilities
  - Performance issues
  - Accessibility problems
  - Test coverage gaps
  Please check OWASP top 10...
  Please check WCAG 2.1...
\`;
// 🔴 Long prompts, inconsistent reviews
// 🔴 Easy to forget checks`,
    after: `// With Codingbuddy: specialist agents
// Just type: EVAL review auth module

// 🤖 security-specialist   → OWASP Top 10
// 🤖 performance-specialist → Core Web Vitals
// 🤖 a11y-specialist       → WCAG 2.1 AA
// 🤖 test-strategy         → Coverage gaps

// ✅ Parallel execution, consistent every time
// ✅ Checklists auto-applied per domain`,
  },
];
