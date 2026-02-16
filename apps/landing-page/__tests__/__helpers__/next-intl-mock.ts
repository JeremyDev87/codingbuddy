import { vi } from 'vitest';

/**
 * Shared mock for next-intl useTranslations hook.
 * Import this file in test files that render components using next-intl.
 *
 * Usage: import '@/__tests__/__helpers__/next-intl-mock';
 */
vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: (namespace?: string) => {
    const allTranslations: Record<string, Record<string, string>> = {
      hero: {
        badge: 'Open Source',
        title: 'Multi-AI Rules for Consistent Coding',
        description:
          'One ruleset for Cursor, Claude Code, Codex, Antigravity, Q, and Kiro. Consistent AI-assisted coding across all your tools.',
        cta: 'Get Started',
        github: 'GitHub',
      },
      problem: {
        title: 'The Problem with AI Coding Today',
        subtitle:
          'Every AI tool has its own rules format. Your team wastes time maintaining duplicate configurations.',
        pain1Title: 'Inconsistent Rules',
        pain1Desc:
          'Each tool needs its own config — .cursorrules, CLAUDE.md, .codex — with no shared standard.',
        pain2Title: 'Duplicated Effort',
        pain2Desc:
          'Copy-paste the same coding rules across multiple tools every time you update them.',
        pain3Title: 'No Quality Standards',
        pain3Desc:
          'AI generates code without structured TDD, SOLID principles, or coverage requirements.',
        pain4Title: 'Lost Context',
        pain4Desc:
          'Different workflows per tool means no shared specialist knowledge or consistent methodology.',
      },
      solution: {
        title: 'One Ruleset. All Tools.',
        subtitle:
          'Codingbuddy gives your AI assistants consistent rules, specialist agents, and structured workflows.',
        benefit1Title: 'Single Source of Truth',
        benefit1Desc:
          'One ruleset automatically applied to Cursor, Claude Code, Codex, Antigravity, Q, and Kiro.',
        benefit2Title: '29 Specialist Agents',
        benefit2Desc:
          'Focused expertise for architecture, security, testing, performance, accessibility, and more.',
        benefit3Title: 'Structured Workflow',
        benefit3Desc:
          'PLAN → ACT → EVAL cycle ensures consistent quality across all your AI-assisted development.',
        benefit4Title: 'Quality Built-in',
        benefit4Desc:
          'TDD, SOLID principles, and 90%+ test coverage enforced as standard practice.',
      },
      agents: {
        title: 'AI Specialist Agents',
        subtitle: '29 specialized AI agents',
        filter: 'Filter by category',
        search: 'Search agents...',
        allCategories: 'All Categories',
        noResults: 'No agents found matching your criteria',
        'categories.Planning': 'Planning',
        'categories.Development': 'Development',
        'categories.Review': 'Review',
        'categories.Security': 'Security',
        'categories.UX': 'UX',
      },
      codeExample: {
        title: 'See the Difference',
        subtitle:
          'One ruleset replaces scattered configs across all your AI tools',
        before: 'Before: Without Codingbuddy',
        after: 'After: With Codingbuddy',
        copy: 'Copy code',
        copied: 'Copied!',
        copyFailed: 'Copy failed',
      },
      quickStart: {
        title: 'Quick Start',
        subtitle: 'Get started in 3 simple steps',
        step1: 'Install the Package',
        step1Desc:
          'Add codingbuddy-rules to your project with a single command',
        step2: 'Configure Your AI Tool',
        step2Desc: "Add the MCP server config to your AI tool's settings file",
        step3: 'Start Coding',
        step3Desc:
          'Use PLAN, ACT, and EVAL modes with specialist agents across all your tools',
        copy: 'Copy',
        copied: 'Copied!',
        copyFailed: 'Copy failed',
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
      faq: {
        title: 'Frequently Asked Questions',
        subtitle: 'Everything you need to know about Codingbuddy',
        q1: 'What AI tools does Codingbuddy support?',
        a1: 'Codingbuddy supports Cursor, Claude Code, GitHub Copilot (Codex), Antigravity (Gemini), Amazon Q, and Kiro.',
        q2: 'How does the PLAN/ACT/EVAL workflow work?',
        a2: 'PLAN mode designs your implementation approach with TDD. ACT mode executes the changes. EVAL mode reviews quality.',
        q3: 'Do I need to configure each AI tool separately?',
        a3: 'No. Codingbuddy uses a single .ai-rules directory as the source of truth.',
        q4: 'Is Codingbuddy free and open source?',
        a4: 'Yes. Codingbuddy is fully open source under the MIT license.',
        q5: 'Can I customize the rules and agents?',
        a5: 'Absolutely. You can create custom rules in the .ai-rules directory.',
        q6: 'What are specialist agents?',
        a6: 'Specialist agents are 29 focused AI personas with expertise in specific areas.',
      },
    };
    const translations = namespace ? (allTranslations[namespace] ?? {}) : {};
    const t = (key: string, params?: Record<string, unknown>) => {
      if (key === 'count') return `${params?.count} agents`;
      return translations[key] ?? key;
    };
    return t;
  },
}));
