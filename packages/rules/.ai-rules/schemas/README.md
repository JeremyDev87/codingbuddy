# Codingbuddy Schemas

This directory contains JSON schemas for validating AI rule files.

## Available Schemas

### agent.schema.json

Validates agent definition files in `.ai-rules/agents/`.

**Required Fields:**
- `name` - Agent display name
- `description` - Brief description of expertise
- `role` - Role definition with title and expertise
- `context_files` - List of context files to load

**Agent Types:**

| Type | Key Field | Examples |
|------|-----------|----------|
| Developer | `activation` | frontend-developer, backend-developer |
| Reviewer | `activation` | code-reviewer |
| Specialist | `modes` | security-specialist, performance-specialist |
| Other | Neither | devops-engineer |

## Usage

### VS Code Integration

Schemas are automatically applied in VS Code via `.vscode/settings.json`:

```json
{
  "json.schemas": [
    {
      "fileMatch": [".ai-rules/agents/*.json"],
      "url": "./.ai-rules/schemas/agent.schema.json"
    }
  ]
}
```

### CLI Validation

```bash
# Validate all agent files
yarn validate:rules

# Validate schema only
yarn validate:rules:schema
```

### Manual Validation with ajv

```bash
npx ajv validate -s .ai-rules/schemas/agent.schema.json -d ".ai-rules/agents/*.json"
```

## Schema Development

When modifying the schema:

1. Update `agent.schema.json`
2. Run validation against all existing files
3. Fix any breaking changes or adjust schema
4. Update this README if needed
