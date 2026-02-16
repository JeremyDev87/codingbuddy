# Static Sections (Hero, Problem, Solution, FAQ) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build 4 static page sections (Hero, Problem, Solution, FAQ) for the landing page and compose them in the page orchestrator.

**Architecture:** Create sections as Client Components in a new `sections/` directory at the project root (parallel to `widgets/`). Each section receives `WidgetProps` (`{ locale }`) and uses `useTranslations` for i18n, following the same pattern as existing widgets. FAQ uses the existing shadcn/ui Accordion component with a data file for Q&A items.

**Tech Stack:** React 19 + Next.js 16 App Router, next-intl (i18n), shadcn/ui (Button, Badge, Card, Accordion), lucide-react (icons), Tailwind CSS 4, Vitest + Testing Library

**Issue:** [#318](https://github.com/JeremyDev87/codingbuddy/issues/318)

---

## File Overview

```
apps/landing-page/
├── sections/                        # NEW directory (parallel to widgets/)
│   ├── Hero.tsx                     # CREATE - Hero section
│   ├── Problem.tsx                  # CREATE - Problem section
│   ├── Solution.tsx                 # CREATE - Solution section
│   └── FAQ/
│       ├── index.tsx                # CREATE - FAQ section (Accordion)
│       └── data/questions.ts        # CREATE - FAQ Q&A data
├── messages/
│   ├── en.json                      # MODIFY - add problem, solution, faq translations
│   ├── ko.json                      # MODIFY
│   ├── ja.json                      # MODIFY
│   ├── zh-CN.json                   # MODIFY
│   └── es.json                      # MODIFY
├── __tests__/
│   ├── __helpers__/
│   │   └── next-intl-mock.ts        # MODIFY - add new translation mocks
│   └── sections/                    # NEW directory
│       ├── Hero.test.tsx            # CREATE
│       ├── Problem.test.tsx         # CREATE
│       ├── Solution.test.tsx        # CREATE
│       └── FAQ.test.tsx             # CREATE
├── src/app/[locale]/
│   └── page.tsx                     # MODIFY - compose all sections
└── tsconfig.json                    # MODIFY - add @/sections/* path alias
```

---

## Task 1: Foundation - i18n Translations & Path Alias

### Task 1-1: Add path alias for sections

**Files:**
- Modify: `apps/landing-page/tsconfig.json:28`

**Step 1: Add sections path alias**

In `tsconfig.json`, add to the `paths` object:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/types": ["./types"],
      "@/widgets/*": ["./widgets/*"],
      "@/components/*": ["./components/*"],
      "@/sections/*": ["./sections/*"]
    }
  }
}
```

**Step 2: Verify TypeScript resolves the path**

Run: `cd apps/landing-page && npx tsc --noEmit --pretty 2>&1 | head -5`
Expected: No new errors (sections directory doesn't exist yet, that's OK)

**Step 3: Commit**

```bash
git add apps/landing-page/tsconfig.json
git commit -m "chore(landing-page): add @/sections path alias"
```

---

### Task 1-2: Add i18n translations (en.json)

**Files:**
- Modify: `apps/landing-page/messages/en.json`

**Step 1: Add hero.github, problem, solution, faq translations**

Replace the entire `en.json` with:

```json
{
  "hero": {
    "badge": "Open Source",
    "title": "Multi-AI Rules for Consistent Coding",
    "description": "One ruleset for Cursor, Claude Code, Codex, Antigravity, Q, and Kiro. Consistent AI-assisted coding across all your tools.",
    "cta": "Get Started",
    "github": "GitHub"
  },
  "problem": {
    "title": "The Problem with AI Coding Today",
    "subtitle": "Every AI tool has its own rules format. Your team wastes time maintaining duplicate configurations.",
    "pain1Title": "Inconsistent Rules",
    "pain1Desc": "Each tool needs its own config — .cursorrules, CLAUDE.md, .codex — with no shared standard.",
    "pain2Title": "Duplicated Effort",
    "pain2Desc": "Copy-paste the same coding rules across multiple tools every time you update them.",
    "pain3Title": "No Quality Standards",
    "pain3Desc": "AI generates code without structured TDD, SOLID principles, or coverage requirements.",
    "pain4Title": "Lost Context",
    "pain4Desc": "Different workflows per tool means no shared specialist knowledge or consistent methodology."
  },
  "solution": {
    "title": "One Ruleset. All Tools.",
    "subtitle": "Codingbuddy gives your AI assistants consistent rules, specialist agents, and structured workflows.",
    "benefit1Title": "Single Source of Truth",
    "benefit1Desc": "One ruleset automatically applied to Cursor, Claude Code, Codex, Antigravity, Q, and Kiro.",
    "benefit2Title": "29 Specialist Agents",
    "benefit2Desc": "Focused expertise for architecture, security, testing, performance, accessibility, and more.",
    "benefit3Title": "Structured Workflow",
    "benefit3Desc": "PLAN → ACT → EVAL cycle ensures consistent quality across all your AI-assisted development.",
    "benefit4Title": "Quality Built-in",
    "benefit4Desc": "TDD, SOLID principles, and 90%+ test coverage enforced as standard practice."
  },
  "agents": {
    "title": "AI Specialist Agents",
    "subtitle": "29 specialized AI agents to enhance your development workflow",
    "filter": "Filter by category",
    "search": "Search agents...",
    "allCategories": "All Categories",
    "noResults": "No agents found matching your criteria",
    "categories": {
      "Planning": "Planning",
      "Development": "Development",
      "Review": "Review",
      "Security": "Security",
      "UX": "UX"
    },
    "count": "{count} agents"
  },
  "codeExample": {
    "title": "See the Difference",
    "subtitle": "One ruleset replaces scattered configs across all your AI tools",
    "before": "Before: Without Codingbuddy",
    "after": "After: With Codingbuddy",
    "copy": "Copy code",
    "copied": "Copied!",
    "copyFailed": "Copy failed"
  },
  "quickStart": {
    "title": "Quick Start",
    "subtitle": "Get started in 3 simple steps",
    "step1": "Install the Package",
    "step1Desc": "Add codingbuddy-rules to your project with a single command",
    "step2": "Configure Your AI Tool",
    "step2Desc": "Add the MCP server config to your AI tool's settings file",
    "step3": "Start Coding",
    "step3Desc": "Use PLAN, ACT, and EVAL modes with specialist agents across all your tools",
    "copy": "Copy",
    "copied": "Copied!",
    "copyFailed": "Copy failed"
  },
  "faq": {
    "title": "Frequently Asked Questions",
    "q1": "What AI tools does Codingbuddy support?",
    "a1": "Codingbuddy supports Cursor, Claude Code, GitHub Copilot (Codex), Antigravity (Gemini), Amazon Q, and Kiro. One ruleset works across all these tools via the MCP server protocol.",
    "q2": "How does the PLAN/ACT/EVAL workflow work?",
    "a2": "PLAN mode designs your implementation approach with TDD. ACT mode executes the changes. EVAL mode reviews code quality and suggests improvements. You can also use AUTO mode for autonomous cycling until quality targets are met.",
    "q3": "Do I need to configure each AI tool separately?",
    "a3": "No. Codingbuddy uses a single .ai-rules directory as the source of truth. Each AI tool reads from this shared ruleset through its adapter, so you only maintain one configuration.",
    "q4": "Is Codingbuddy free and open source?",
    "a4": "Yes. Codingbuddy is fully open source under the MIT license. You can use it freely in personal and commercial projects.",
    "q5": "Can I customize the rules and agents?",
    "a5": "Absolutely. You can create custom rules in the .ai-rules directory, define your own specialist agents, and adjust quality standards to match your team's workflow.",
    "q6": "What are specialist agents?",
    "a6": "Specialist agents are 29 focused AI personas with expertise in specific areas like architecture review, security auditing, test strategy, performance optimization, and accessibility. They provide deep, domain-specific guidance."
  }
}
```

**Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('apps/landing-page/messages/en.json', 'utf8')); console.log('OK')"`
Expected: `OK`

---

### Task 1-3: Add i18n translations (ko.json)

**Files:**
- Modify: `apps/landing-page/messages/ko.json`

**Step 1: Add Korean translations**

Replace the entire `ko.json` with:

```json
{
  "hero": {
    "badge": "오픈 소스",
    "title": "일관된 코딩을 위한 멀티 AI 규칙",
    "description": "Cursor, Claude Code, Codex, Antigravity, Q, Kiro를 위한 하나의 규칙 세트. 모든 도구에서 일관된 AI 지원 코딩.",
    "cta": "시작하기",
    "github": "GitHub"
  },
  "problem": {
    "title": "오늘날 AI 코딩의 문제점",
    "subtitle": "모든 AI 도구마다 고유한 규칙 형식이 있습니다. 팀은 중복 설정을 유지하느라 시간을 낭비합니다.",
    "pain1Title": "일관성 없는 규칙",
    "pain1Desc": "각 도구마다 .cursorrules, CLAUDE.md, .codex 등 별도의 설정이 필요하며, 공유 표준이 없습니다.",
    "pain2Title": "중복된 노력",
    "pain2Desc": "업데이트할 때마다 동일한 코딩 규칙을 여러 도구에 복사-붙여넣기 해야 합니다.",
    "pain3Title": "품질 기준 부재",
    "pain3Desc": "AI가 구조화된 TDD, SOLID 원칙, 커버리지 요구사항 없이 코드를 생성합니다.",
    "pain4Title": "컨텍스트 손실",
    "pain4Desc": "도구마다 다른 워크플로우로 인해 전문가 지식이나 일관된 방법론을 공유할 수 없습니다."
  },
  "solution": {
    "title": "하나의 규칙 세트. 모든 도구.",
    "subtitle": "Codingbuddy는 AI 어시스턴트에게 일관된 규칙, 전문 에이전트, 구조화된 워크플로우를 제공합니다.",
    "benefit1Title": "단일 진실 공급원",
    "benefit1Desc": "하나의 규칙 세트가 Cursor, Claude Code, Codex, Antigravity, Q, Kiro에 자동 적용됩니다.",
    "benefit2Title": "29개 전문 에이전트",
    "benefit2Desc": "아키텍처, 보안, 테스팅, 성능, 접근성 등에 특화된 전문 지식을 제공합니다.",
    "benefit3Title": "구조화된 워크플로우",
    "benefit3Desc": "PLAN → ACT → EVAL 사이클로 모든 AI 지원 개발에서 일관된 품질을 보장합니다.",
    "benefit4Title": "내장된 품질 기준",
    "benefit4Desc": "TDD, SOLID 원칙, 90% 이상 테스트 커버리지가 표준 관행으로 적용됩니다."
  },
  "agents": {
    "title": "AI 전문 에이전트",
    "subtitle": "개발 워크플로우를 향상시키는 29개의 전문 AI 에이전트",
    "filter": "카테고리별 필터",
    "search": "에이전트 검색...",
    "allCategories": "전체 카테고리",
    "noResults": "조건에 맞는 에이전트를 찾을 수 없습니다",
    "categories": {
      "Planning": "기획",
      "Development": "개발",
      "Review": "리뷰",
      "Security": "보안",
      "UX": "UX"
    },
    "count": "{count}개 에이전트"
  },
  "codeExample": {
    "title": "차이를 확인하세요",
    "subtitle": "하나의 규칙 세트로 모든 AI 도구의 분산된 설정을 대체합니다",
    "before": "이전: Codingbuddy 없이",
    "after": "이후: Codingbuddy 사용",
    "copy": "코드 복사",
    "copied": "복사 완료!",
    "copyFailed": "복사 실패"
  },
  "quickStart": {
    "title": "빠른 시작",
    "subtitle": "3단계로 간단하게 시작하세요",
    "step1": "패키지 설치",
    "step1Desc": "한 줄 명령어로 codingbuddy-rules를 프로젝트에 추가하세요",
    "step2": "AI 도구 설정",
    "step2Desc": "AI 도구의 설정 파일에 MCP 서버 구성을 추가하세요",
    "step3": "코딩 시작",
    "step3Desc": "모든 도구에서 PLAN, ACT, EVAL 모드와 전문 에이전트를 활용하세요",
    "copy": "복사",
    "copied": "복사 완료!",
    "copyFailed": "복사 실패"
  },
  "faq": {
    "title": "자주 묻는 질문",
    "q1": "어떤 AI 도구를 지원하나요?",
    "a1": "Codingbuddy는 Cursor, Claude Code, GitHub Copilot(Codex), Antigravity(Gemini), Amazon Q, Kiro를 지원합니다. MCP 서버 프로토콜을 통해 하나의 규칙 세트가 모든 도구에서 작동합니다.",
    "q2": "PLAN/ACT/EVAL 워크플로우는 어떻게 동작하나요?",
    "a2": "PLAN 모드는 TDD 접근으로 구현 방안을 설계합니다. ACT 모드는 변경 사항을 실행합니다. EVAL 모드는 코드 품질을 검토하고 개선을 제안합니다. AUTO 모드로 품질 목표 달성까지 자동 순환할 수도 있습니다.",
    "q3": "각 AI 도구를 개별적으로 설정해야 하나요?",
    "a3": "아닙니다. Codingbuddy는 단일 .ai-rules 디렉토리를 진실 공급원으로 사용합니다. 각 AI 도구는 어댑터를 통해 이 공유 규칙 세트를 읽으므로, 하나의 설정만 관리하면 됩니다.",
    "q4": "Codingbuddy는 무료이고 오픈 소스인가요?",
    "a4": "네. Codingbuddy는 MIT 라이선스 하에 완전히 오픈 소스입니다. 개인 및 상업 프로젝트에서 자유롭게 사용할 수 있습니다.",
    "q5": "규칙과 에이전트를 커스터마이즈할 수 있나요?",
    "a5": "물론입니다. .ai-rules 디렉토리에서 커스텀 규칙을 만들고, 자신만의 전문 에이전트를 정의하고, 팀의 워크플로우에 맞게 품질 기준을 조정할 수 있습니다.",
    "q6": "전문 에이전트란 무엇인가요?",
    "a6": "전문 에이전트는 아키텍처 리뷰, 보안 감사, 테스트 전략, 성능 최적화, 접근성 등 특정 영역에 전문성을 가진 29개의 AI 페르소나입니다. 도메인별 심층 가이드를 제공합니다."
  }
}
```

---

### Task 1-4: Add i18n translations (ja.json)

**Files:**
- Modify: `apps/landing-page/messages/ja.json`

**Step 1: Add Japanese translations**

Replace the entire `ja.json` with:

```json
{
  "hero": {
    "badge": "オープンソース",
    "title": "一貫したコーディングのためのマルチAIルール",
    "description": "Cursor、Claude Code、Codex、Antigravity、Q、Kiro対応の統一ルールセット。すべてのツールで一貫したAI支援コーディング。",
    "cta": "始める",
    "github": "GitHub"
  },
  "problem": {
    "title": "今日のAIコーディングの問題",
    "subtitle": "AIツールごとに独自のルール形式があります。チームは重複する設定の維持に時間を費やしています。",
    "pain1Title": "一貫性のないルール",
    "pain1Desc": "各ツールに.cursorrules、CLAUDE.md、.codexなど個別の設定が必要で、共有基準がありません。",
    "pain2Title": "重複した作業",
    "pain2Desc": "更新のたびに同じコーディングルールを複数のツールにコピー＆ペーストする必要があります。",
    "pain3Title": "品質基準の欠如",
    "pain3Desc": "AIは構造化されたTDD、SOLID原則、カバレッジ要件なしでコードを生成します。",
    "pain4Title": "コンテキストの損失",
    "pain4Desc": "ツールごとに異なるワークフローにより、専門知識や一貫した方法論を共有できません。"
  },
  "solution": {
    "title": "1つのルールセット。すべてのツール。",
    "subtitle": "CodingbuddyはAIアシスタントに一貫したルール、専門エージェント、構造化されたワークフローを提供します。",
    "benefit1Title": "唯一の真実の情報源",
    "benefit1Desc": "1つのルールセットがCursor、Claude Code、Codex、Antigravity、Q、Kiroに自動適用されます。",
    "benefit2Title": "29の専門エージェント",
    "benefit2Desc": "アーキテクチャ、セキュリティ、テスト、パフォーマンス、アクセシビリティなどの専門知識を提供します。",
    "benefit3Title": "構造化されたワークフロー",
    "benefit3Desc": "PLAN → ACT → EVALサイクルで、すべてのAI支援開発で一貫した品質を保証します。",
    "benefit4Title": "組み込みの品質基準",
    "benefit4Desc": "TDD、SOLID原則、90%以上のテストカバレッジが標準プラクティスとして適用されます。"
  },
  "agents": {
    "title": "AI専門エージェント",
    "subtitle": "開発ワークフローを強化する29の専門AIエージェント",
    "filter": "カテゴリで絞り込み",
    "search": "エージェントを検索...",
    "allCategories": "すべてのカテゴリ",
    "noResults": "条件に一致するエージェントが見つかりません",
    "categories": {
      "Planning": "企画",
      "Development": "開発",
      "Review": "レビュー",
      "Security": "セキュリティ",
      "UX": "UX"
    },
    "count": "{count}エージェント"
  },
  "codeExample": {
    "title": "違いを確認",
    "subtitle": "1つのルールセットで全AIツールの分散設定を置き換え",
    "before": "変更前：Codingbuddyなし",
    "after": "変更後：Codingbuddy使用",
    "copy": "コードをコピー",
    "copied": "コピーしました！",
    "copyFailed": "コピーに失敗しました"
  },
  "quickStart": {
    "title": "クイックスタート",
    "subtitle": "3つの簡単なステップで始めましょう",
    "step1": "パッケージをインストール",
    "step1Desc": "1つのコマンドでcodingbuddy-rulesをプロジェクトに追加",
    "step2": "AIツールを設定",
    "step2Desc": "AIツールの設定ファイルにMCPサーバー構成を追加",
    "step3": "コーディング開始",
    "step3Desc": "すべてのツールでPLAN、ACT、EVALモードとスペシャリストエージェントを活用",
    "copy": "コピー",
    "copied": "コピーしました！",
    "copyFailed": "コピーに失敗しました"
  },
  "faq": {
    "title": "よくある質問",
    "q1": "どのAIツールに対応していますか？",
    "a1": "CodingbuddyはCursor、Claude Code、GitHub Copilot（Codex）、Antigravity（Gemini）、Amazon Q、Kiroに対応しています。MCPサーバープロトコルを通じて、1つのルールセットがすべてのツールで機能します。",
    "q2": "PLAN/ACT/EVALワークフローはどのように機能しますか？",
    "a2": "PLANモードはTDDアプローチで実装計画を設計します。ACTモードは変更を実行します。EVALモードはコード品質をレビューし改善を提案します。AUTOモードで品質目標達成まで自動サイクルすることもできます。",
    "q3": "各AIツールを個別に設定する必要がありますか？",
    "a3": "いいえ。Codingbuddyは単一の.ai-rulesディレクトリを信頼できる情報源として使用します。各AIツールはアダプターを通じてこの共有ルールセットを読み取るため、1つの設定だけを管理すれば十分です。",
    "q4": "Codingbuddyは無料でオープンソースですか？",
    "a4": "はい。CodingbuddyはMITライセンスの下で完全にオープンソースです。個人および商用プロジェクトで自由に使用できます。",
    "q5": "ルールやエージェントをカスタマイズできますか？",
    "a5": "もちろんです。.ai-rulesディレクトリでカスタムルールを作成し、独自の専門エージェントを定義し、チームのワークフローに合わせて品質基準を調整できます。",
    "q6": "専門エージェントとは何ですか？",
    "a6": "専門エージェントとは、アーキテクチャレビュー、セキュリティ監査、テスト戦略、パフォーマンス最適化、アクセシビリティなどの特定分野に専門性を持つ29のAIペルソナです。ドメイン固有の深い指導を提供します。"
  }
}
```

---

### Task 1-5: Add i18n translations (zh-CN.json)

**Files:**
- Modify: `apps/landing-page/messages/zh-CN.json`

**Step 1: Add Chinese translations**

Replace the entire `zh-CN.json` with:

```json
{
  "hero": {
    "badge": "开源",
    "title": "统一 AI 编码规则",
    "description": "一套规则适用于 Cursor、Claude Code、Codex、Antigravity、Q 和 Kiro。所有工具中一致的 AI 辅助编码。",
    "cta": "开始使用",
    "github": "GitHub"
  },
  "problem": {
    "title": "当今 AI 编码的问题",
    "subtitle": "每个 AI 工具都有自己的规则格式。您的团队浪费时间维护重复的配置。",
    "pain1Title": "规则不一致",
    "pain1Desc": "每个工具需要各自的配置 — .cursorrules、CLAUDE.md、.codex — 没有共享标准。",
    "pain2Title": "重复劳动",
    "pain2Desc": "每次更新时都需要将相同的编码规则复制粘贴到多个工具中。",
    "pain3Title": "缺乏质量标准",
    "pain3Desc": "AI 在没有结构化 TDD、SOLID 原则或覆盖率要求的情况下生成代码。",
    "pain4Title": "上下文丢失",
    "pain4Desc": "每个工具不同的工作流意味着无法共享专家知识或一致的方法论。"
  },
  "solution": {
    "title": "一套规则。所有工具。",
    "subtitle": "Codingbuddy 为您的 AI 助手提供一致的规则、专家代理和结构化工作流。",
    "benefit1Title": "单一事实来源",
    "benefit1Desc": "一套规则自动应用于 Cursor、Claude Code、Codex、Antigravity、Q 和 Kiro。",
    "benefit2Title": "29 个专家代理",
    "benefit2Desc": "为架构、安全、测试、性能、可访问性等提供专业知识。",
    "benefit3Title": "结构化工作流",
    "benefit3Desc": "PLAN → ACT → EVAL 循环确保所有 AI 辅助开发中的一致质量。",
    "benefit4Title": "内置质量标准",
    "benefit4Desc": "TDD、SOLID 原则和 90% 以上测试覆盖率作为标准实践执行。"
  },
  "agents": {
    "title": "AI 专业代理",
    "subtitle": "29个专业AI代理，提升您的开发工作流程",
    "filter": "按类别筛选",
    "search": "搜索代理...",
    "allCategories": "所有类别",
    "noResults": "未找到符合条件的代理",
    "categories": {
      "Planning": "规划",
      "Development": "开发",
      "Review": "审查",
      "Security": "安全",
      "UX": "用户体验"
    },
    "count": "{count}个代理"
  },
  "codeExample": {
    "title": "看看区别",
    "subtitle": "一套规则替代所有AI工具中分散的配置",
    "before": "之前：没有Codingbuddy",
    "after": "之后：使用Codingbuddy",
    "copy": "复制代码",
    "copied": "已复制！",
    "copyFailed": "复制失败"
  },
  "quickStart": {
    "title": "快速入门",
    "subtitle": "3个简单步骤即可开始",
    "step1": "安装包",
    "step1Desc": "一条命令将 codingbuddy-rules 添加到项目中",
    "step2": "配置 AI 工具",
    "step2Desc": "将 MCP 服务器配置添加到 AI 工具的设置文件中",
    "step3": "开始编码",
    "step3Desc": "在所有工具中使用 PLAN、ACT、EVAL 模式和专业代理",
    "copy": "复制",
    "copied": "已复制！",
    "copyFailed": "复制失败"
  },
  "faq": {
    "title": "常见问题",
    "q1": "支持哪些 AI 工具？",
    "a1": "Codingbuddy 支持 Cursor、Claude Code、GitHub Copilot（Codex）、Antigravity（Gemini）、Amazon Q 和 Kiro。通过 MCP 服务器协议，一套规则在所有工具中生效。",
    "q2": "PLAN/ACT/EVAL 工作流如何运作？",
    "a2": "PLAN 模式通过 TDD 方法设计实施方案。ACT 模式执行变更。EVAL 模式审查代码质量并提出改进建议。您也可以使用 AUTO 模式自动循环直到达到质量目标。",
    "q3": "需要为每个 AI 工具单独配置吗？",
    "a3": "不需要。Codingbuddy 使用单一的 .ai-rules 目录作为唯一事实来源。每个 AI 工具通过适配器读取此共享规则集，因此只需维护一份配置。",
    "q4": "Codingbuddy 是免费开源的吗？",
    "a4": "是的。Codingbuddy 基于 MIT 许可证完全开源。您可以在个人和商业项目中自由使用。",
    "q5": "可以自定义规则和代理吗？",
    "a5": "当然可以。您可以在 .ai-rules 目录中创建自定义规则、定义自己的专家代理，并根据团队工作流调整质量标准。",
    "q6": "什么是专家代理？",
    "a6": "专家代理是 29 个在架构审查、安全审计、测试策略、性能优化、可访问性等特定领域具有专业知识的 AI 角色。它们提供深入的领域特定指导。"
  }
}
```

---

### Task 1-6: Add i18n translations (es.json)

**Files:**
- Modify: `apps/landing-page/messages/es.json`

**Step 1: Add Spanish translations**

Replace the entire `es.json` with:

```json
{
  "hero": {
    "badge": "Código Abierto",
    "title": "Reglas Multi-IA para Codificación Consistente",
    "description": "Un conjunto de reglas para Cursor, Claude Code, Codex, Antigravity, Q y Kiro. Codificación asistida por IA consistente en todas tus herramientas.",
    "cta": "Comenzar",
    "github": "GitHub"
  },
  "problem": {
    "title": "El Problema con la Codificación IA Hoy",
    "subtitle": "Cada herramienta IA tiene su propio formato de reglas. Tu equipo pierde tiempo manteniendo configuraciones duplicadas.",
    "pain1Title": "Reglas Inconsistentes",
    "pain1Desc": "Cada herramienta necesita su propia configuración — .cursorrules, CLAUDE.md, .codex — sin un estándar compartido.",
    "pain2Title": "Esfuerzo Duplicado",
    "pain2Desc": "Copiar y pegar las mismas reglas de codificación en múltiples herramientas cada vez que las actualizas.",
    "pain3Title": "Sin Estándares de Calidad",
    "pain3Desc": "La IA genera código sin TDD estructurado, principios SOLID ni requisitos de cobertura.",
    "pain4Title": "Contexto Perdido",
    "pain4Desc": "Flujos de trabajo diferentes por herramienta significa que no hay conocimiento especialista compartido ni metodología consistente."
  },
  "solution": {
    "title": "Un Conjunto de Reglas. Todas las Herramientas.",
    "subtitle": "Codingbuddy da a tus asistentes IA reglas consistentes, agentes especialistas y flujos de trabajo estructurados.",
    "benefit1Title": "Fuente Única de Verdad",
    "benefit1Desc": "Un conjunto de reglas aplicado automáticamente a Cursor, Claude Code, Codex, Antigravity, Q y Kiro.",
    "benefit2Title": "29 Agentes Especialistas",
    "benefit2Desc": "Experiencia enfocada en arquitectura, seguridad, testing, rendimiento, accesibilidad y más.",
    "benefit3Title": "Flujo de Trabajo Estructurado",
    "benefit3Desc": "El ciclo PLAN → ACT → EVAL asegura calidad consistente en todo tu desarrollo asistido por IA.",
    "benefit4Title": "Calidad Incorporada",
    "benefit4Desc": "TDD, principios SOLID y cobertura de tests del 90%+ aplicados como práctica estándar."
  },
  "agents": {
    "title": "Agentes AI Especializados",
    "subtitle": "29 agentes AI especializados para mejorar tu flujo de desarrollo",
    "filter": "Filtrar por categoría",
    "search": "Buscar agentes...",
    "allCategories": "Todas las categorías",
    "noResults": "No se encontraron agentes que coincidan con los criterios",
    "categories": {
      "Planning": "Planificación",
      "Development": "Desarrollo",
      "Review": "Revisión",
      "Security": "Seguridad",
      "UX": "UX"
    },
    "count": "{count} agentes"
  },
  "codeExample": {
    "title": "Mira la Diferencia",
    "subtitle": "Un conjunto de reglas reemplaza configuraciones dispersas en todas tus herramientas de IA",
    "before": "Antes: Sin Codingbuddy",
    "after": "Después: Con Codingbuddy",
    "copy": "Copiar código",
    "copied": "¡Copiado!",
    "copyFailed": "Error al copiar"
  },
  "quickStart": {
    "title": "Inicio Rápido",
    "subtitle": "Comienza en 3 simples pasos",
    "step1": "Instalar el paquete",
    "step1Desc": "Agrega codingbuddy-rules a tu proyecto con un solo comando",
    "step2": "Configurar tu herramienta IA",
    "step2Desc": "Agrega la configuración del servidor MCP al archivo de tu herramienta IA",
    "step3": "Empezar a codificar",
    "step3Desc": "Usa los modos PLAN, ACT y EVAL con agentes especialistas en todas tus herramientas",
    "copy": "Copiar",
    "copied": "¡Copiado!",
    "copyFailed": "Error al copiar"
  },
  "faq": {
    "title": "Preguntas Frecuentes",
    "q1": "¿Qué herramientas IA soporta Codingbuddy?",
    "a1": "Codingbuddy soporta Cursor, Claude Code, GitHub Copilot (Codex), Antigravity (Gemini), Amazon Q y Kiro. Un conjunto de reglas funciona en todas estas herramientas a través del protocolo MCP.",
    "q2": "¿Cómo funciona el flujo PLAN/ACT/EVAL?",
    "a2": "El modo PLAN diseña tu enfoque de implementación con TDD. El modo ACT ejecuta los cambios. El modo EVAL revisa la calidad del código y sugiere mejoras. También puedes usar AUTO para ciclar automáticamente hasta alcanzar los objetivos de calidad.",
    "q3": "¿Necesito configurar cada herramienta IA por separado?",
    "a3": "No. Codingbuddy usa un único directorio .ai-rules como fuente de verdad. Cada herramienta IA lee de este conjunto de reglas compartido a través de su adaptador, así que solo mantienes una configuración.",
    "q4": "¿Es Codingbuddy gratuito y de código abierto?",
    "a4": "Sí. Codingbuddy es completamente de código abierto bajo la licencia MIT. Puedes usarlo libremente en proyectos personales y comerciales.",
    "q5": "¿Puedo personalizar las reglas y agentes?",
    "a5": "Por supuesto. Puedes crear reglas personalizadas en el directorio .ai-rules, definir tus propios agentes especialistas y ajustar los estándares de calidad al flujo de trabajo de tu equipo.",
    "q6": "¿Qué son los agentes especialistas?",
    "a6": "Los agentes especialistas son 29 personas IA enfocadas con experiencia en áreas específicas como revisión de arquitectura, auditoría de seguridad, estrategia de testing, optimización de rendimiento y accesibilidad. Proporcionan guía profunda y específica del dominio."
  }
}
```

---

### Task 1-7: Update next-intl mock for tests

**Files:**
- Modify: `apps/landing-page/__tests__/__helpers__/next-intl-mock.ts`

**Step 1: Add hero, problem, solution, faq translations to mock**

Replace the entire mock file with:

```typescript
import { vi } from 'vitest';

/**
 * Shared mock for next-intl useTranslations hook.
 * Import this file in test files that render components using next-intl.
 *
 * Usage: import '@/__tests__/__helpers__/next-intl-mock';
 */
vi.mock('next-intl', () => ({
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
      faq: {
        title: 'Frequently Asked Questions',
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
```

**Step 2: Commit foundation changes**

```bash
git add apps/landing-page/messages/ apps/landing-page/__tests__/__helpers__/next-intl-mock.ts
git commit -m "feat(landing-page): add i18n translations for static sections (hero, problem, solution, faq)"
```

---

## Task 2: Hero Section

**Files:**
- Create: `apps/landing-page/sections/Hero.tsx`
- Test: `apps/landing-page/__tests__/sections/Hero.test.tsx`

### Step 1: Implement Hero component

Create `apps/landing-page/sections/Hero.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WidgetProps } from '@/types';

export const Hero = ({ locale }: WidgetProps) => {
  const t = useTranslations('hero');

  return (
    <section
      data-testid="hero"
      lang={locale}
      aria-labelledby="hero-heading"
      className="relative overflow-hidden px-4 py-24 text-center sm:py-32"
    >
      {/* Background gradient effect */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="bg-primary/5 absolute top-0 left-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
        <div className="bg-primary/10 absolute bottom-0 right-0 size-[400px] translate-x-1/4 translate-y-1/4 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl">
        <Badge variant="secondary" className="mb-6">
          {t('badge')}
        </Badge>

        <h1
          id="hero-heading"
          className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl"
        >
          {t('title')}
        </h1>

        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg sm:text-xl">
          {t('description')}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <a href="#quick-start">
              {t('cta')}
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a
              href="https://github.com/JeremyDev87/codingbuddy"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="size-4" />
              {t('github')}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};
```

### Step 2: Write Hero test

Create `apps/landing-page/__tests__/sections/Hero.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/__tests__/__helpers__/next-intl-mock';
import { Hero } from '@/sections/Hero';

describe('Hero', () => {
  it('should render with locale prop', () => {
    render(<Hero locale="en" />);
    expect(screen.getByTestId('hero')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', () => {
    render(<Hero locale="ko" />);
    expect(screen.getByTestId('hero')).toHaveAttribute('lang', 'ko');
  });

  it('should display h1 heading with gradient text', () => {
    render(<Hero locale="en" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Multi-AI Rules for Consistent Coding',
    );
  });

  it('should have aria-labelledby linking to heading', () => {
    render(<Hero locale="en" />);
    const section = screen.getByTestId('hero');
    expect(section).toHaveAttribute('aria-labelledby', 'hero-heading');
  });

  it('should display badge', () => {
    render(<Hero locale="en" />);
    expect(screen.getByText('Open Source')).toBeInTheDocument();
  });

  it('should display description', () => {
    render(<Hero locale="en" />);
    expect(
      screen.getByText(/One ruleset for Cursor/),
    ).toBeInTheDocument();
  });

  it('should render CTA button linking to quick-start', () => {
    render(<Hero locale="en" />);
    const ctaLink = screen.getByRole('link', { name: /Get Started/i });
    expect(ctaLink).toHaveAttribute('href', '#quick-start');
  });

  it('should render GitHub button with external link', () => {
    render(<Hero locale="en" />);
    const githubLink = screen.getByRole('link', { name: /GitHub/i });
    expect(githubLink).toHaveAttribute(
      'href',
      'https://github.com/JeremyDev87/codingbuddy',
    );
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
```

### Step 3: Run tests to verify

Run: `cd apps/landing-page && npx vitest run __tests__/sections/Hero.test.tsx`
Expected: All 8 tests PASS

### Step 4: Commit

```bash
git add apps/landing-page/sections/Hero.tsx apps/landing-page/__tests__/sections/Hero.test.tsx
git commit -m "feat(landing-page): add Hero section with badge, gradient title, and CTA buttons"
```

---

## Task 3: Problem Section

**Files:**
- Create: `apps/landing-page/sections/Problem.tsx`
- Test: `apps/landing-page/__tests__/sections/Problem.test.tsx`

### Step 1: Implement Problem component

Create `apps/landing-page/sections/Problem.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { FileWarning, Copy, ShieldOff, Unplug } from 'lucide-react';
import type { WidgetProps } from '@/types';

const painPoints = [
  { key: 'pain1', icon: FileWarning },
  { key: 'pain2', icon: Copy },
  { key: 'pain3', icon: ShieldOff },
  { key: 'pain4', icon: Unplug },
] as const;

export const Problem = ({ locale }: WidgetProps) => {
  const t = useTranslations('problem');

  return (
    <section
      data-testid="problem"
      lang={locale}
      aria-labelledby="problem-heading"
      className="bg-muted/50 px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2
            id="problem-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {painPoints.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="bg-background rounded-lg border p-6"
            >
              <div className="text-destructive/80 mb-3">
                <Icon className="size-6" aria-hidden="true" />
              </div>
              <h3 className="mb-2 font-semibold">{t(`${key}Title`)}</h3>
              <p className="text-muted-foreground text-sm">
                {t(`${key}Desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
```

### Step 2: Write Problem test

Create `apps/landing-page/__tests__/sections/Problem.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/__tests__/__helpers__/next-intl-mock';
import { Problem } from '@/sections/Problem';

describe('Problem', () => {
  it('should render with locale prop', () => {
    render(<Problem locale="en" />);
    expect(screen.getByTestId('problem')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', () => {
    render(<Problem locale="ko" />);
    expect(screen.getByTestId('problem')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', () => {
    render(<Problem locale="en" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'The Problem with AI Coding Today',
    );
  });

  it('should have aria-labelledby linking to heading', () => {
    render(<Problem locale="en" />);
    const section = screen.getByTestId('problem');
    expect(section).toHaveAttribute('aria-labelledby', 'problem-heading');
  });

  it('should display subtitle', () => {
    render(<Problem locale="en" />);
    expect(
      screen.getByText(/Every AI tool has its own rules format/),
    ).toBeInTheDocument();
  });

  it('should render 4 pain points', () => {
    render(<Problem locale="en" />);
    expect(screen.getByText('Inconsistent Rules')).toBeInTheDocument();
    expect(screen.getByText('Duplicated Effort')).toBeInTheDocument();
    expect(screen.getByText('No Quality Standards')).toBeInTheDocument();
    expect(screen.getByText('Lost Context')).toBeInTheDocument();
  });

  it('should render pain point descriptions', () => {
    render(<Problem locale="en" />);
    expect(
      screen.getByText(/Each tool needs its own config/),
    ).toBeInTheDocument();
  });
});
```

### Step 3: Run tests to verify

Run: `cd apps/landing-page && npx vitest run __tests__/sections/Problem.test.tsx`
Expected: All 7 tests PASS

### Step 4: Commit

```bash
git add apps/landing-page/sections/Problem.tsx apps/landing-page/__tests__/sections/Problem.test.tsx
git commit -m "feat(landing-page): add Problem section with pain points grid"
```

---

## Task 4: Solution Section

**Files:**
- Create: `apps/landing-page/sections/Solution.tsx`
- Test: `apps/landing-page/__tests__/sections/Solution.test.tsx`

### Step 1: Implement Solution component

Create `apps/landing-page/sections/Solution.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { DatabaseZap, Bot, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import type { WidgetProps } from '@/types';

const benefits = [
  { key: 'benefit1', icon: DatabaseZap },
  { key: 'benefit2', icon: Bot },
  { key: 'benefit3', icon: ArrowRightLeft },
  { key: 'benefit4', icon: ShieldCheck },
] as const;

export const Solution = ({ locale }: WidgetProps) => {
  const t = useTranslations('solution');

  return (
    <section
      data-testid="solution"
      lang={locale}
      aria-labelledby="solution-heading"
      className="px-4 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2
            id="solution-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t('title')}
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {benefits.map(({ key, icon: Icon }) => (
            <Card key={key} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="text-primary mb-2">
                  <Icon className="size-6" aria-hidden="true" />
                </div>
                <CardTitle>{t(`${key}Title`)}</CardTitle>
                <CardDescription>{t(`${key}Desc`)}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
```

### Step 2: Write Solution test

Create `apps/landing-page/__tests__/sections/Solution.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/__tests__/__helpers__/next-intl-mock';
import { Solution } from '@/sections/Solution';

describe('Solution', () => {
  it('should render with locale prop', () => {
    render(<Solution locale="en" />);
    expect(screen.getByTestId('solution')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', () => {
    render(<Solution locale="ko" />);
    expect(screen.getByTestId('solution')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', () => {
    render(<Solution locale="en" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'One Ruleset. All Tools.',
    );
  });

  it('should have aria-labelledby linking to heading', () => {
    render(<Solution locale="en" />);
    const section = screen.getByTestId('solution');
    expect(section).toHaveAttribute('aria-labelledby', 'solution-heading');
  });

  it('should display subtitle', () => {
    render(<Solution locale="en" />);
    expect(
      screen.getByText(/Codingbuddy gives your AI assistants/),
    ).toBeInTheDocument();
  });

  it('should render 4 benefit cards', () => {
    render(<Solution locale="en" />);
    expect(screen.getByText('Single Source of Truth')).toBeInTheDocument();
    expect(screen.getByText('29 Specialist Agents')).toBeInTheDocument();
    expect(screen.getByText('Structured Workflow')).toBeInTheDocument();
    expect(screen.getByText('Quality Built-in')).toBeInTheDocument();
  });

  it('should render benefit descriptions', () => {
    render(<Solution locale="en" />);
    expect(
      screen.getByText(/One ruleset automatically applied/),
    ).toBeInTheDocument();
  });
});
```

### Step 3: Run tests to verify

Run: `cd apps/landing-page && npx vitest run __tests__/sections/Solution.test.tsx`
Expected: All 7 tests PASS

### Step 4: Commit

```bash
git add apps/landing-page/sections/Solution.tsx apps/landing-page/__tests__/sections/Solution.test.tsx
git commit -m "feat(landing-page): add Solution section with benefits cards"
```

---

## Task 5: FAQ Section

**Files:**
- Create: `apps/landing-page/sections/FAQ/data/questions.ts`
- Create: `apps/landing-page/sections/FAQ/index.tsx`
- Test: `apps/landing-page/__tests__/sections/FAQ.test.tsx`

### Step 1: Create FAQ data file

Create `apps/landing-page/sections/FAQ/data/questions.ts`:

```typescript
/** FAQ question identifier used as i18n key prefix */
export interface FAQItem {
  /** i18n key index (e.g., "q1", "q2") */
  key: string;
}

export const faqItems: FAQItem[] = [
  { key: 'q1' },
  { key: 'q2' },
  { key: 'q3' },
  { key: 'q4' },
  { key: 'q5' },
  { key: 'q6' },
];
```

### Step 2: Implement FAQ component

Create `apps/landing-page/sections/FAQ/index.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { WidgetProps } from '@/types';
import { faqItems } from './data/questions';

export const FAQ = ({ locale }: WidgetProps) => {
  const t = useTranslations('faq');

  return (
    <section
      data-testid="faq"
      lang={locale}
      aria-labelledby="faq-heading"
      className="bg-muted/50 mx-auto w-full max-w-4xl px-4 py-16 sm:py-24"
    >
      <div className="mb-12 text-center">
        <h2
          id="faq-heading"
          className="text-3xl font-bold tracking-tight sm:text-4xl"
        >
          {t('title')}
        </h2>
      </div>

      <Accordion type="single" collapsible defaultValue="q1">
        {faqItems.map(({ key }) => {
          const answerKey = key.replace('q', 'a');
          return (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger className="text-left text-base font-medium">
                {t(key)}
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">{t(answerKey)}</p>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
};
```

### Step 3: Write FAQ test

Create `apps/landing-page/__tests__/sections/FAQ.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/__tests__/__helpers__/next-intl-mock';
import { FAQ } from '@/sections/FAQ';

describe('FAQ', () => {
  it('should render with locale prop', () => {
    render(<FAQ locale="en" />);
    expect(screen.getByTestId('faq')).toBeInTheDocument();
  });

  it('should set lang attribute matching locale', () => {
    render(<FAQ locale="ko" />);
    expect(screen.getByTestId('faq')).toHaveAttribute('lang', 'ko');
  });

  it('should display section heading', () => {
    render(<FAQ locale="en" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Frequently Asked Questions',
    );
  });

  it('should have aria-labelledby linking to heading', () => {
    render(<FAQ locale="en" />);
    const section = screen.getByTestId('faq');
    expect(section).toHaveAttribute('aria-labelledby', 'faq-heading');
  });

  it('should render 6 FAQ items', () => {
    render(<FAQ locale="en" />);
    expect(
      screen.getByText('What AI tools does Codingbuddy support?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('How does the PLAN/ACT/EVAL workflow work?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Do I need to configure each AI tool separately?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Is Codingbuddy free and open source?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Can I customize the rules and agents?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('What are specialist agents?'),
    ).toBeInTheDocument();
  });

  it('should show first item expanded by default', () => {
    render(<FAQ locale="en" />);
    expect(
      screen.getByText(/Codingbuddy supports Cursor/),
    ).toBeInTheDocument();
  });

  it('should expand item on click', async () => {
    const user = userEvent.setup();
    render(<FAQ locale="en" />);

    await user.click(
      screen.getByText('How does the PLAN/ACT/EVAL workflow work?'),
    );

    expect(
      screen.getByText(/PLAN mode designs your implementation/),
    ).toBeInTheDocument();
  });
});
```

### Step 4: Run tests to verify

Run: `cd apps/landing-page && npx vitest run __tests__/sections/FAQ.test.tsx`
Expected: All 7 tests PASS

### Step 5: Commit

```bash
git add apps/landing-page/sections/FAQ/
git add apps/landing-page/__tests__/sections/FAQ.test.tsx
git commit -m "feat(landing-page): add FAQ section with accordion"
```

---

## Task 6: Page Orchestrator Integration

**Files:**
- Modify: `apps/landing-page/src/app/[locale]/page.tsx`

### Step 1: Update page.tsx to compose all sections

Replace the entire `page.tsx` with:

```tsx
import type { SlotProps } from '@/types';
import { Hero } from '@/sections/Hero';
import { Problem } from '@/sections/Problem';
import { Solution } from '@/sections/Solution';
import { FAQ } from '@/sections/FAQ';

const LocalePage = async ({ params }: SlotProps) => {
  const { locale } = await params;

  return (
    <>
      <Hero locale={locale} />
      <Problem locale={locale} />
      <Solution locale={locale} />
      <FAQ locale={locale} />
    </>
  );
};

export default LocalePage;
```

### Step 2: Run all tests

Run: `cd apps/landing-page && npx vitest run`
Expected: All tests PASS (existing + new)

### Step 3: Commit

```bash
git add apps/landing-page/src/app/[locale]/page.tsx
git commit -m "feat(landing-page): integrate static sections into page orchestrator"
```

---

## Task 7: Final Verification

### Step 1: Run full test suite

Run: `cd apps/landing-page && npx vitest run`
Expected: All tests PASS

### Step 2: Run TypeScript check

Run: `cd apps/landing-page && npx tsc --noEmit`
Expected: No errors

### Step 3: Run Prettier format check

Run: `cd apps/landing-page && npx prettier --check 'sections/**/*.tsx' 'messages/*.json' '__tests__/sections/**/*.tsx' 'src/app/\\[locale\\]/page.tsx'`
Expected: All files formatted correctly (or fix with `--write`)

### Step 4: Verify build

Run: `cd apps/landing-page && npx next build`
Expected: Build succeeds

### Step 5: Final commit (if formatting needed)

```bash
git add -A
git commit -m "fix(landing-page): fix formatting in static sections"
```

---

## Summary of Changes

| Area | Files | Action |
|------|-------|--------|
| Sections | 5 files (`Hero.tsx`, `Problem.tsx`, `Solution.tsx`, `FAQ/index.tsx`, `FAQ/data/questions.ts`) | CREATE |
| Tests | 4 files (`Hero.test.tsx`, `Problem.test.tsx`, `Solution.test.tsx`, `FAQ.test.tsx`) | CREATE |
| i18n | 5 files (`en.json`, `ko.json`, `ja.json`, `zh-CN.json`, `es.json`) | MODIFY |
| Mock | 1 file (`next-intl-mock.ts`) | MODIFY |
| Config | 1 file (`tsconfig.json`) | MODIFY |
| Page | 1 file (`page.tsx`) | MODIFY |
| **Total** | **17 files** | |

## Estimated Commits: 7
1. `chore: add @/sections path alias`
2. `feat: add i18n translations for static sections`
3. `feat: add Hero section`
4. `feat: add Problem section`
5. `feat: add Solution section`
6. `feat: add FAQ section`
7. `feat: integrate static sections into page orchestrator`
