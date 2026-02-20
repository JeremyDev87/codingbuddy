<p align="center">
  <a href="philosophy.md">English</a> |
  <a href="ko/philosophy.md">한국어</a> |
  <a href="zh-CN/philosophy.md">中文</a> |
  <a href="ja/philosophy.md">日本語</a> |
  <a href="es/philosophy.md">Español</a>
</p>

# Philosophy

This document explains the vision, core beliefs, and design principles behind Codingbuddy.

## Vision

**AI Expert Team for Your Code**

A single AI can't be an expert at everything. When you ask an AI to write code, you get a single perspective—no security review, no accessibility check, no architecture validation. Just one AI doing everything "okay" but nothing excellently.

Human development teams have specialists:
- **Architects** who design systems
- **Security engineers** who find vulnerabilities
- **QA specialists** who catch edge cases
- **Performance experts** who optimize bottlenecks

**Codingbuddy brings the specialist team model to AI coding.**

Instead of one AI trying to do everything, Codingbuddy orchestrates 35 specialized agents that collaborate to review, verify, and refine your code until it meets professional standards.

## Core Beliefs

### 1. Multi-Agent Collaboration

Quality comes from multiple perspectives. Our 3-tier agent system ensures comprehensive coverage:

| Tier | Purpose | Examples |
|------|---------|----------|
| **Mode Agents** | Workflow orchestration | plan-mode, act-mode, eval-mode, auto-mode |
| **Primary Agents** | Core implementation | solution-architect, frontend-developer, backend-developer |
| **Specialist Agents** | Domain expertise | security, accessibility, performance, test-strategy |

Each agent brings focused expertise, and they collaborate to achieve what no single AI could.

### 2. Quality-Driven Development

The PLAN → ACT → EVAL cycle ensures quality at every step:

```
PLAN: Design before coding (architecture, test strategy)
  ↓
ACT: Implement with TDD and quality standards
  ↓
EVAL: Multi-specialist review (security, performance, accessibility)
  ↓
Iterate until: Critical=0 AND High=0
```

### 3. Exit Criteria

Ship only when quality targets are met:

| Severity | Must Fix Before Ship |
|----------|---------------------|
| 🔴 Critical | Yes - Immediate security/data issues |
| 🟠 High | Yes - Significant problems |
| 🟡 Medium | Optional - Technical debt |
| 🟢 Low | Optional - Enhancement |

### 4. Progressive Disclosure

Start simple, go deep when needed:

- **Quick Start**: Get running in 2 minutes with `npx codingbuddy init`
- **Workflow Modes**: PLAN → ACT → EVAL structured development
- **Specialist Agents**: Access 35 domain experts on demand
- **AUTO Mode**: Autonomous iteration until quality achieved

### 5. Convention Over Configuration

Sensible defaults that work for most projects:

- PLAN → ACT → EVAL workflow
- TDD-first development approach
- 90%+ test coverage target
- SOLID principles and clean code

Override only what you need to change.

## Design Principles

### Agent Architecture

```
┌─────────────────────────────────────────┐
│           Mode Agents (4)               │
│  plan-mode, act-mode, eval-mode,        │
│  auto-mode                              │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         Primary Agents (16)             │
│  solution-architect, frontend-developer │
│  backend-developer, data-engineer, ...  │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│        Specialist Agents (15)           │
│   security, accessibility, performance  │
│   test-strategy, event-architecture ... │
└─────────────────────────────────────────┘
```

### Separation of Concerns

| Layer | Purpose | Format |
|-------|---------|--------|
| **Rules** | What to do (workflow, quality standards) | Markdown |
| **Agents** | Who knows what (specialist expertise) | JSON |
| **Adapters** | How to integrate (tool-specific setup) | Markdown |

This separation allows:

- Rules to evolve independently of tool support
- New agents without changing core rules
- New tool support without modifying existing rules

### Extensibility Over Complexity

The system is designed to be extended, not configured:

- Add new specialist agents by creating JSON files
- Support new AI tools by writing adapter guides
- Include project-specific context without modifying core rules

Simple things should be simple. Complex things should be possible.

## The Workflow Model

Codingbuddy introduces a structured workflow for AI-assisted development:

### PLAN Mode (Default)

- Understand requirements
- Design implementation approach
- Identify risks and edge cases
- No code changes made
- Activates: Solution Architect + relevant specialists

### ACT Mode

- Execute the plan
- Follow TDD: Red → Green → Refactor
- Make incremental, tested changes
- Activates: Primary Developer + quality specialists

### EVAL Mode

- Review implementation quality
- Multi-dimensional assessment (security, performance, accessibility)
- Identify improvements with severity levels
- Activates: Code Reviewer + parallel specialists

### AUTO Mode

- Autonomous PLAN → ACT → EVAL cycling
- Continues until: Critical=0 AND High=0
- Maximum iteration safeguard
- Best for complex features requiring iterative refinement

This workflow prevents the common pitfall of AI assistants jumping straight into code without proper planning.

## What Makes It Different

| Traditional AI Coding | Codingbuddy |
|----------------------|-------------|
| Single AI perspective | 35 specialist agent perspectives |
| "Generate and hope" | Plan → Implement → Verify |
| No quality gates | Critical=0, High=0 required |
| Manual review needed | Automated multi-dimensional review |
| Inconsistent quality | Iterative refinement until standards met |

## What Codingbuddy Is Not

- **Not a code generator**: It provides structure, expertise, and quality gates—not magic code
- **Not a replacement for human judgment**: It augments developer decision-making with specialist perspectives
- **Not a one-size-fits-all solution**: It's designed to be customized per project

## Further Reading

- [Getting Started](./getting-started.md) - Quick setup guide
- [Supported Tools](./supported-tools.md) - AI tool integration
- [Core Rules](../packages/rules/.ai-rules/rules/core.md) - Workflow details
- [Agents System](../packages/rules/.ai-rules/agents/README.md) - Complete agent reference
