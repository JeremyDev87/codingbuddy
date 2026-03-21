/**
 * Shared mock translation data for tests.
 * Single source of truth used by both next-intl-mock.ts and next-intl-server-mock.ts.
 */
export const mockTranslations: Record<string, Record<string, string>> = {
  hero: {
    title: 'Multi-AI Rules for Consistent Coding',
    subtitle: 'One ruleset for Cursor, Claude Code, Codex, Antigravity, Q, and Kiro.',
    cta: 'Get Started',
    github: 'Star on GitHub',
    terminalTitle: '~/your-project',
    terminalCmd: 'npx codingbuddy init',
    terminalInstalling: 'Installing codingbuddy-rules...',
    terminalRulesSynced: 'Rules synced to 6 AI tools',
    terminalAgents: '35 specialist agents activated',
    terminalWorkflow: 'PLAN → ACT → EVAL workflow ready',
    terminalCursorrules: '.cursorrules',
    terminalClaudeMd: 'CLAUDE.md',
    terminalCodex: '.codex/',
    terminalAntigravity: '.antigravity/',
    terminalQ: '.q/',
    terminalKiro: '.kiro/',
    terminalReady: 'Ready! One source, all tools.',
  },
  agents: {
    title: '35 Specialist Agents',
    subtitle: 'Focused expertise for every aspect of development',
    filter: 'Filter by category',
    allCategories: 'All',
    noResults: 'No agents found matching your criteria',
    viewAll: 'View All Agents',
    showLess: 'Show Less',
    'categories.Planning': 'Planning',
    'categories.Development': 'Development',
    'categories.Review': 'Review',
    'categories.Security': 'Security',
    'categories.UX': 'UX',
    count: '{count} agents',
  },
  quickStart: {
    title: 'Quick Start',
    subtitle: 'Get started in 3 simple steps',
    step1: 'Install',
    step1Desc: 'Add codingbuddy-rules to your project',
    step2: 'Configure',
    step2Desc: 'Add the MCP server to your AI tool',
    step3: 'Code',
    step3Desc: 'Use PLAN, ACT, EVAL modes with specialist agents',
    copy: 'Copy',
    copied: 'Copied!',
  },
  header: {
    'nav.features': 'Features',
    'nav.agents': 'Agents',
    'nav.quickStart': 'Quick Start',
    'nav.faq': 'FAQ',
    'theme.label': 'Toggle theme',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',
    'language.label': 'Select language',
    'language.en': 'English',
    'language.ko': '한국어',
    'language.ja': '日本語',
    'language.zh-CN': '中文',
    'language.es': 'Español',
    'mobileMenu.open': 'Open menu',
    'mobileMenu.close': 'Close menu',
    'mobileMenu.title': 'Navigation',
    'mobileMenu.description': 'Site navigation and settings',
    'brand.homeLink': 'Codingbuddy - Back to home',
  },
  cookieConsent: {
    label: 'Cookie consent',
    message: 'We use cookies to enhance your experience and analyze site traffic.',
    accept: 'Accept',
    decline: 'Decline',
  },
  metadata: {
    title: 'Codingbuddy - Multi-AI Rules for Consistent Coding',
    description: 'One ruleset for Cursor, Claude Code, Codex, Antigravity, Q, and Kiro.',
  },
  beforeAfter: {
    title: 'The Problem & Solution',
    beforeLabel: 'Before',
    afterLabel: 'After',
    beforeFiles: '6 config files. Always out of sync.',
    afterFiles: 'Single source. Auto-synced to all tools.',
    cursorrules: '.cursorrules',
    claudeMd: 'CLAUDE.md',
    codexRules: '.codex/instructions.md',
    antigravityRules: '.antigravity/rules.md',
    qRules: '.q/rules.md',
    kiroRules: '.kiro/rules.md',
    singleSource: 'codingbuddy-rules/.ai-rules/',
    autoSynced: 'Auto-synced',
    alwaysCurrent: 'Always current',
  },
  supportedTools: {
    title: 'Works with your favorite AI tools',
    plus: '+ any MCP-compatible tool',
    cursor: 'Cursor',
    claudeCode: 'Claude Code',
    codex: 'Codex',
    antigravity: 'Antigravity',
    amazonQ: 'Amazon Q',
    kiro: 'Kiro',
  },
  tuiDashboard: {
    title: 'Real-Time Agent Dashboard',
    subtitle: 'Watch your AI agents work in real-time with a built-in terminal UI.',
    screenshotAlt:
      'Codingbuddy TUI Dashboard showing agent pipeline, activity charts, and task progress',
    feature1Title: 'FlowMap',
    feature1Desc: 'Visual pipeline showing active agents, stages, and real-time progress',
    feature2Title: 'Focused Agent',
    feature2Desc: 'Live view of the active agent with sparkline activity and progress bar',
    feature3Title: 'Checklist',
    feature3Desc: 'Task completion tracking synced from PLAN/ACT/EVAL context',
    feature4Title: 'Activity Chart',
    feature4Desc: 'Real-time tool invocation bar chart updated as agents work',
    command: 'npx codingbuddy tui',
    commandLabel: 'Launch in a separate terminal',
    multiSession: 'Multiple Claude Code sessions share a single TUI window via IPC',
  },
  features: {
    title: 'What You Get',
    universalRulesTitle: 'Universal Rules',
    universalRulesDesc: 'One source of truth automatically applied to all 6 AI coding tools.',
    agentsTitle: '35 AI Agents',
    agentsDesc:
      'Specialist agents for architecture, security, testing, performance, and accessibility.',
    workflowTitle: 'Structured Workflow',
    workflowDesc: 'PLAN → ACT → EVAL cycle ensures consistent quality across all development.',
    qualityTitle: 'Quality Built-in',
    qualityDesc: 'TDD, SOLID principles, and 90%+ test coverage enforced as standard practice.',
    mcpTitle: 'MCP Protocol',
    mcpDesc: 'Standard Model Context Protocol for seamless AI tool integration.',
    zeroConfigTitle: 'Zero Config',
    zeroConfigDesc: 'One command to install. Works out of the box with all supported tools.',
  },
  ctaFooter: {
    title: 'Ready to unify your AI coding?',
    command: 'npx codingbuddy init',
    github: 'GitHub',
    docs: 'Documentation',
    copyright: `© {year} Codingbuddy. All rights reserved.`,
    madeWith: 'Made for developers who ship with AI',
  },
};

/**
 * Creates a mock translation function that supports parameter interpolation.
 */
export const createMockT = (namespace?: string) => {
  const translations = namespace ? (mockTranslations[namespace] ?? {}) : {};
  const t = (key: string, params?: Record<string, unknown>) => {
    let value = translations[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, String(v));
      }
    }
    return value;
  };
  return t;
};
