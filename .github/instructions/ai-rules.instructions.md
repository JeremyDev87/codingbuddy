---
applyTo: "packages/rules/.ai-rules/**/*"
---

# AI Rules Content Review

## Agent JSON Files

- Must conform to agent.schema.json
- Required fields: name, description, expertise, systemPrompt
- Expertise array should be specific and actionable

## Rule Markdown Files

- Must be valid Markdown (no broken links, proper heading hierarchy)
- Instructions must be clear, specific, and actionable
- Avoid vague directives — provide concrete examples
- Keep rules consistent across all adapter files

## Cross-Tool Consistency

- Changes to rules must be reflected across all adapters (Cursor, Claude, Codex, Q, Kiro, Antigravity)
- Agent definitions must be tool-agnostic
