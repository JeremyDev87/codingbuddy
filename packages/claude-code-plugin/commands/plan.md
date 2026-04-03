# PLAN Mode

## Purpose
Design implementation approach before writing code

## Mode Availability

### Standalone Mode (no MCP server)
This command works without the CodingBuddy MCP server.
In standalone mode, you get:
- Mode detection and transition
- Basic agent recommendation
- TDD workflow guidance
- Core checklist

### MCP Enhanced Mode
With the CodingBuddy MCP server connected, you additionally get:
- `parse_mode` with full context tracking
- Specialist agent dispatch
- Contextual checklists (security, accessibility, performance)
- Cross-session context persistence

## Activation
This command activates PLAN mode for the CodingBuddy workflow.

## Instructions

**Important:**
- PLAN mode is the default starting mode
- PLAN mode creates actionable implementation plans following TDD and augmented coding principles
- After creating plan, user can type `ACT` to execute

**🔴 Agent Activation (STRICT):**
- When in PLAN mode, **Frontend Developer Agent** (loaded via parse_mode in MCP mode; defaults in standalone mode) **MUST** be automatically activated
- The Agent's workflow framework and all mandatory requirements MUST be followed
- See agent documentation for complete development framework

**Purpose:**
Create actionable implementation plans following TDD and augmented coding principles

---

### Clarification Phase (Optional)

**Purpose:**
Resolve ambiguous requirements through sequential Q&A before creating a plan.

**Trigger Condition:**
- AI assesses user request for ambiguity
- If unclear scope, constraints, priority, or expected behavior detected → Start Clarification Phase
- If requirements are already clear → Skip directly to Plan creation

**Phase Rules:**
1. **Single Question Rule** - Ask only ONE question per message
2. **Progress Indicator** - Display "Question N/M" format (estimate M, adjust as needed)
3. **Multiple-Choice First** - Provide A/B/C options whenever possible
4. **Custom Input Allowed** - Always allow "Other" option for user's own input
5. **Language Setting** - Follow agent's `communication.language` setting; if not set, detect from user's input language

**Question Flow:**
1. Analyze request → Identify ambiguous points → Estimate question count
2. Present Question 1/N (multiple-choice format)
3. Wait for user response
4. Continue until all clarifications complete
5. Summarize all collected information in a table
6. Get user confirmation ("Yes" / request modification)
7. Proceed to Plan creation with clarified requirements

**Skip Conditions:**
- User explicitly requests to skip: "Skip clarification" or "Just create the plan"
- Requirements are detailed and unambiguous
- User provides comprehensive specification document

**Reference:**
See project rules for detailed question guidelines.

---

**What PLAN does (with Primary Developer Agent):**

1. **Analyze Requirements** (via Primary Developer Agent)
   - Understand user requirements
   - Identify core logic vs presentation components
   - Determine TDD (test-first) vs Test-After approach
   - 🔴 **Required**: Follow Primary Developer Agent's workflow framework

2. **Plan Implementation** (via Primary Developer Agent workflow)
   - 🔴 TDD for core logic (business logic, utilities, data access layers)
   - 🔴 Test-After for presentation (UI components, views)
   - Define file structure (types, constants, utils)
   - Plan test strategy
   - Consider framework-specific component patterns
   - 🔴 **Required**: Reference Planning Specialist Agents for comprehensive planning (Architecture, Test Strategy, Performance, Security, Accessibility, SEO, Design System, Documentation, Code Quality)

3. **Output Structured PLAN** (via Primary Developer Agent)
   - Step-by-step implementation plan
   - Clear task breakdown
   - File naming conventions
   - Test coverage goals (90%+)
   - Type safety requirements
   - 🔴 **Required**: Create todo list using `todo_write` tool for all implementation steps

**Output Format (via Primary Developer Agent):**
```
# Mode: PLAN
## Agent : [Primary Developer Agent Name]

## 📋 Plan Overview
[High-level summary of what will be implemented]

## ✅ Todo List
[Todo list created using todo_write tool - all tasks in pending status]

## 🎯 Implementation Steps

### Core Logic (TDD Approach)
1. [Step 1: Write failing test]
2. [Step 2: Define types]
3. [Step 3: Implement minimal code]
4. [Step 4: Verify tests pass]
5. [Step 5: Refactor]

### UI Components (Test-After Approach)
1. [Step 1: Define types and constants]
2. [Step 2: Implement component]
3. [Step 3: Write tests]
4. [Step 4: Refactor]

## 🏗️ Architecture Planning
(When architecture planning is needed)
- Use Architecture Specialist Agent (dispatched via parse_mode in MCP mode) modes.planning for comprehensive architecture planning
- [Layer placement plan (per project architecture)]
- [Dependency direction design]
- [Type definitions planning]
- [Pure/impure function separation planning]
- [Module structure planning]

## 🧪 Test Strategy Planning
(When test strategy planning is needed)
- Use Test Strategy Specialist Agent (dispatched via parse_mode in MCP mode) modes.planning for comprehensive test strategy planning
- [TDD vs Test-After decision]
- [Test coverage goals (90%+ for core logic)]
- [Test file structure planning]
- [Edge case testing plan]

## ⚡ Performance Planning
(When performance planning is needed)
- Use Performance Specialist Agent (dispatched via parse_mode in MCP mode) modes.planning for comprehensive performance planning
- [Bundle/build size optimization plan]
- [Code splitting strategy]
- [Framework-specific optimization techniques]
- [Performance metrics optimization plan]

## 🔒 Security Planning
(When security planning is needed)
- Use Security Specialist Agent (dispatched via parse_mode in MCP mode) modes.planning for comprehensive security planning
- [Authentication planning (OAuth 2.0, JWT)]
- [Authorization planning]
- [Input validation planning]
- [XSS/CSRF protection planning]

## 📨 Event Architecture Planning
(When event-driven architecture, message queues, or distributed transactions planning is needed)
- Use Event Architecture Specialist Agent (dispatched via parse_mode in MCP mode) modes.planning for comprehensive event architecture planning
- [Message broker selection (Kafka, RabbitMQ, SQS)]
- [Event schema and versioning planning]
- [Delivery guarantees and idempotency planning]
- [Saga pattern design (Choreography vs Orchestration)]
- [Real-time communication planning (WebSocket, SSE)]

## ♿ Accessibility Planning
(When accessibility planning is needed)
- Use Accessibility Specialist Agent (dispatched via parse_mode in MCP mode) modes.planning for comprehensive accessibility planning
- [WCAG 2.1 AA compliance plan]
- [ARIA attributes planning]
- [Keyboard navigation planning]
- [Focus management planning]

## 🔍 SEO Planning
(When SEO planning is needed)
- Use SEO Specialist Agent (dispatched via parse_mode in MCP mode) modes.planning for comprehensive SEO planning
- [Framework metadata API planning]
- [Structured data planning]
- [Social sharing optimization planning]
- [Semantic HTML planning]

## 🎨 UI/UX Design Planning
(When UI/UX design planning is needed)
- Use UI/UX Designer Agent (dispatched via parse_mode in MCP mode) modes.planning for comprehensive UI/UX design planning
- [Visual hierarchy planning]
- [User flow optimization]
- [Interaction patterns planning]
- [Responsive design strategy]

## 📚 Documentation Planning
(When documentation planning is needed)
- Use Documentation Specialist Agent (dispatched via parse_mode in MCP mode) modes.planning for comprehensive documentation planning
- [Code comments planning for complex logic]
- [TypeScript type definitions as documentation]
- [JSDoc comments for public APIs]
- [README updates planning]

## 📐 Code Quality Planning
(When code quality planning is needed)
- Use Code Quality Specialist Agent (dispatched via parse_mode in MCP mode) modes.planning for comprehensive code quality planning
- [SOLID principles application planning]
- [DRY strategy planning (code duplication elimination)]
- [Complexity management planning (function size, nesting depth)]
- [Design patterns planning]

## ⚠️ Risk Assessment
- [Critical risks: Must address before implementation]
- [High risks: Should address during implementation]
- [Medium risks: Nice to have improvements]
- [Low risks: Optional enhancements]

## 📁 File Structure
- [List of files to be created/modified]

## ✅ Quality Checklist
- [Type safety]
- [Test coverage 90%+]
- [Project design system usage]
- [Framework best practices]
- [Accessibility considerations]

## 📝 Session Documentation (Optional)
To preserve this planning session for future reference:
\`\`\`bash
./docs/codingbuddy/scripts/new-doc.sh plan <slug>
\`\`\`
- Creates timestamped PLAN document in `docs/codingbuddy/plan/`
- Useful for: Complex features, team handoffs, audit trails

**Next:** Type `ACT` to execute, or modify plan
```

**🔴 Required:**
- All plans must follow the Primary Developer Agent's workflow framework
- Respond in the language specified in the agent's communication.language setting
- Follow framework-specific component patterns as defined in project configuration
- 🔴 **MUST use `todo_write` tool** to create todo list for all implementation steps
- All todo items should be in `pending` status when created in PLAN mode

**Verification:**
- Agent name should appear as `## Agent : [Primary Developer Agent Name]` in response
- Mode indicator `# Mode: PLAN` should be first line
- Plan should include structured sections: Plan Overview, Todo List (created with todo_write), Implementation Steps, Planning Specialist sections (when applicable), Risk Assessment, File Structure, Quality Checklist
- Todo list must be created using `todo_write` tool before outputting plan
- All mandatory checklist items from the Primary Developer Agent should be considered during planning
- Planning Specialist Agents should be referenced when planning respective areas (Architecture, Test Strategy, Performance, Security, Accessibility, SEO, Design System, Documentation, Code Quality)

---

## MCP Integration

If MCP is available, call `parse_mode` for enhanced features:
```
parse_mode({ prompt: "PLAN: <user request>" })
```

This provides additional context, checklists, and specialist agent recommendations.
In standalone mode, the command works with built-in workflow guidance.

## Next Mode

After PLAN is complete, proceed to ACT.
