# Skill Evaluation Schemas Reference

JSON schema definitions and workspace directory structure reference for the skill evaluation system.

## Table of Contents

- [Workspace Directory Structure](#workspace-directory-structure)
- [Schema Definitions](#schema-definitions)
  - [1. evals.json](#1-evalsjson)
  - [2. eval_metadata.json](#2-eval_metadatajson)
  - [3. grading.json](#3-gradingjson)
  - [4. timing.json](#4-timingjson)
  - [5. feedback.json](#5-feedbackjson)
  - [6. benchmark.json](#6-benchmarkjson)
  - [7. trigger_eval.json](#7-trigger_evaljson)
- [Schema Relationships](#schema-relationships)
- [Validation](#validation)

---

## Workspace Directory Structure

Workspace directory structure used during skill evaluation. Each iteration represents a skill modification cycle, and each eval includes a `with_skill` (skill applied) and `without_skill` (baseline) comparison run.

```
workspace/
├── evals.json                     # Evaluation scenario definitions (shared across all iterations)
├── trigger_eval.json              # Trigger evaluation cases (benchmark mode)
└── iteration-N/                   # Nth skill modification cycle
    ├── eval-0/                    # First evaluation (0-based)
    │   ├── with_skill/            # Skill-applied run
    │   │   ├── outputs/           # Generated output files
    │   │   ├── eval_metadata.json # Evaluation metadata
    │   │   ├── grading.json       # Grading results
    │   │   └── timing.json        # Execution time measurements
    │   └── without_skill/         # Baseline run (no skill applied)
    │       ├── outputs/           # Generated output files
    │       ├── eval_metadata.json # Evaluation metadata
    │       ├── grading.json       # Grading results
    │       └── timing.json        # Execution time measurements
    ├── eval-1/                    # Second evaluation
    │   ├── with_skill/
    │   │   └── ...
    │   └── without_skill/
    │       └── ...
    ├── benchmark.json             # Iteration benchmark aggregate results
    ├── benchmark.md               # Benchmark markdown report
    └── feedback.json              # User feedback
```

**Directory naming conventions:**
- `iteration-N`: 1-based sequential number. A new iteration is created each time SKILL.md is modified
- `eval-N`: 0-based sequential number. Corresponds to each scenario in `evals.json`
- `with_skill/`: Evaluation run with the skill applied
- `without_skill/`: Baseline run without the skill (comparison target)
- `outputs/`: Files generated during each run (code, documents, etc.)

**File location rules:**
- `evals.json`, `trigger_eval.json`: Workspace root (iteration-independent)
- `eval_metadata.json`, `grading.json`, `timing.json`: Inside each eval's `with_skill/` or `without_skill/`
- `benchmark.json`, `benchmark.md`, `feedback.json`: Iteration root

---

## Schema Definitions

### 1. evals.json

Defines the list of evaluation scenarios. Located at the workspace root and shared across all iterations.

**Schema:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/evals.json",
  "title": "Skill Evaluation Scenarios",
  "description": "Skill evaluation scenario definitions",
  "type": "object",
  "required": ["skill_name", "evals"],
  "properties": {
    "skill_name": {
      "type": "string",
      "description": "Name of the skill being evaluated (kebab-case)",
      "pattern": "^[a-z][a-z0-9-]*$"
    },
    "evals": {
      "type": "array",
      "description": "List of evaluation scenarios",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "prompt", "expected_output", "files"],
        "properties": {
          "id": {
            "type": "integer",
            "minimum": 1,
            "description": "Scenario ID (1-based)"
          },
          "prompt": {
            "type": "string",
            "description": "User task prompt"
          },
          "expected_output": {
            "type": "string",
            "description": "Expected result description"
          },
          "files": {
            "type": "array",
            "items": { "type": "string" },
            "description": "List of input file paths (empty array if none)"
          }
        }
      }
    }
  }
}
```

**Example:**

```json
{
  "skill_name": "test-driven-development",
  "evals": [
    {
      "id": 1,
      "prompt": "Add a function that validates email addresses",
      "expected_output": "Test file created first with failing test, then implementation, then refactor",
      "files": ["src/utils/validators.ts"]
    },
    {
      "id": 2,
      "prompt": "Fix the login timeout bug",
      "expected_output": "Failing test reproducing the bug, then minimal fix, then cleanup",
      "files": ["src/auth/login.ts", "src/auth/login.test.ts"]
    }
  ]
}
```

---

### 2. eval_metadata.json

Records metadata for an individual evaluation run. Located in each `with_skill/` and `without_skill/` directory.

**Schema:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/eval_metadata.json",
  "title": "Evaluation Metadata",
  "description": "Metadata for an individual evaluation run",
  "type": "object",
  "required": ["eval_id", "eval_name", "prompt", "assertions"],
  "properties": {
    "eval_id": {
      "type": "integer",
      "minimum": 0,
      "description": "Evaluation ID (0-based, corresponds to evals.json id-1)"
    },
    "eval_name": {
      "type": "string",
      "description": "Descriptive name for the evaluation"
    },
    "prompt": {
      "type": "string",
      "description": "User task prompt (copied from evals.json)"
    },
    "assertions": {
      "type": "array",
      "description": "List of verification items",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["name", "description"],
        "properties": {
          "name": {
            "type": "string",
            "description": "Verifiable item name"
          },
          "description": {
            "type": "string",
            "description": "Description of pass criteria"
          }
        }
      }
    }
  }
}
```

**Example:**

```json
{
  "eval_id": 0,
  "eval_name": "Email Validation TDD Cycle",
  "prompt": "Add a function that validates email addresses",
  "assertions": [
    {
      "name": "test_file_created_first",
      "description": "Test file was created before the implementation file"
    },
    {
      "name": "test_initially_fails",
      "description": "Test fails when run before implementation"
    },
    {
      "name": "minimal_implementation",
      "description": "Only minimal code to pass the test was written"
    },
    {
      "name": "refactor_step_present",
      "description": "A refactoring step was performed after GREEN"
    }
  ]
}
```

---

### 3. grading.json

Records grading results for an evaluation run. Includes pass/fail judgment and supporting evidence for each assertion.

**Schema:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/grading.json",
  "title": "Grading Results",
  "description": "Evaluation grading results",
  "type": "object",
  "required": ["expectations"],
  "properties": {
    "expectations": {
      "type": "array",
      "description": "Grading results per assertion",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["text", "passed", "evidence"],
        "properties": {
          "text": {
            "type": "string",
            "description": "Assertion description (corresponds to assertion.description in eval_metadata.json)"
          },
          "passed": {
            "type": "boolean",
            "description": "Whether it passed"
          },
          "evidence": {
            "type": "string",
            "description": "Basis for judgment (specific evidence)"
          }
        }
      }
    }
  }
}
```

**Example:**

```json
{
  "expectations": [
    {
      "text": "Test file was created before the implementation file",
      "passed": true,
      "evidence": "validators.test.ts was created 2 minutes before validators.ts (confirmed via git log)"
    },
    {
      "text": "Test fails when run before implementation",
      "passed": true,
      "evidence": "RED phase confirmed: 'Expected isValidEmail to be defined' error"
    },
    {
      "text": "Only minimal code to pass the test was written",
      "passed": false,
      "evidence": "Initial implementation included unnecessary domain validation logic (exceeds assertion scope)"
    }
  ]
}
```

**Pass rate calculation:**

```
pass_rate = expectations.filter(e => e.passed).length / expectations.length
```

---

### 4. timing.json

Records time and token usage for an evaluation run.

**Schema:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/timing.json",
  "title": "Timing Data",
  "description": "Evaluation execution time and token usage",
  "type": "object",
  "required": ["total_tokens", "duration_ms", "total_duration_seconds"],
  "properties": {
    "total_tokens": {
      "type": "integer",
      "minimum": 0,
      "description": "Total token usage (input + output)"
    },
    "duration_ms": {
      "type": "integer",
      "minimum": 0,
      "description": "Execution time (milliseconds)"
    },
    "total_duration_seconds": {
      "type": "number",
      "minimum": 0,
      "description": "Total execution time (seconds, with decimal)"
    }
  }
}
```

**Example:**

```json
{
  "total_tokens": 45230,
  "duration_ms": 32150,
  "total_duration_seconds": 32.15
}
```

**Used in benchmark comparison:**
- Compare timing.json between `with_skill` and `without_skill` to measure token/time overhead from skill application

---

### 5. feedback.json

Records user feedback on evaluations. Located at the iteration root and consolidates feedback across multiple eval runs.

**Schema:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/feedback.json",
  "title": "Evaluation Feedback",
  "description": "User feedback on evaluations",
  "type": "object",
  "required": ["reviews", "status"],
  "properties": {
    "reviews": {
      "type": "array",
      "description": "List of feedback items",
      "items": {
        "type": "object",
        "required": ["run_id", "feedback", "timestamp"],
        "properties": {
          "run_id": {
            "type": "string",
            "description": "Run identifier (e.g., eval-0-with_skill, eval-1-without_skill)",
            "pattern": "^eval-[0-9]+-(?:with_skill|without_skill)$"
          },
          "feedback": {
            "type": "string",
            "description": "User feedback content"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "Feedback creation time (ISO 8601)"
          }
        }
      }
    },
    "status": {
      "type": "string",
      "enum": ["in_progress", "complete"],
      "description": "Feedback collection status"
    }
  }
}
```

**Example:**

```json
{
  "reviews": [
    {
      "run_id": "eval-0-with_skill",
      "feedback": "TDD cycle was well followed, but error message verification was skipped in the RED phase",
      "timestamp": "2026-03-21T14:30:00.000Z"
    },
    {
      "run_id": "eval-0-without_skill",
      "feedback": "When run without the skill, there was a tendency to write tests after implementation",
      "timestamp": "2026-03-21T14:35:00.000Z"
    }
  ],
  "status": "in_progress"
}
```

**run_id format:**
- `eval-{eval_id}-with_skill`: Feedback for skill-applied run
- `eval-{eval_id}-without_skill`: Feedback for baseline run

---

### 6. benchmark.json

Records aggregate benchmark results per iteration. Aggregates `with_skill` vs `without_skill` comparison data across all evals.

**Schema:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/benchmark.json",
  "title": "Benchmark Results",
  "description": "Iteration benchmark aggregate results",
  "type": "object",
  "required": ["skill_name", "iteration", "summary", "eval_results"],
  "properties": {
    "skill_name": {
      "type": "string",
      "description": "Name of the skill being evaluated",
      "pattern": "^[a-z][a-z0-9-]*$"
    },
    "iteration": {
      "type": "integer",
      "minimum": 1,
      "description": "Iteration number (1-based)"
    },
    "summary": {
      "type": "object",
      "description": "Aggregate summary statistics across all evals",
      "required": ["pass_rate", "tokens", "duration_seconds"],
      "properties": {
        "pass_rate": {
          "type": "object",
          "required": ["mean", "stddev"],
          "properties": {
            "mean": {
              "type": "number",
              "minimum": 0,
              "maximum": 1,
              "description": "Mean pass rate (0.0~1.0)"
            },
            "stddev": {
              "type": "number",
              "minimum": 0,
              "description": "Pass rate standard deviation"
            }
          }
        },
        "tokens": {
          "type": "object",
          "required": ["mean", "stddev"],
          "properties": {
            "mean": {
              "type": "number",
              "minimum": 0,
              "description": "Mean token usage"
            },
            "stddev": {
              "type": "number",
              "minimum": 0,
              "description": "Token standard deviation"
            }
          }
        },
        "duration_seconds": {
          "type": "object",
          "required": ["mean", "stddev"],
          "properties": {
            "mean": {
              "type": "number",
              "minimum": 0,
              "description": "Mean execution time (seconds)"
            },
            "stddev": {
              "type": "number",
              "minimum": 0,
              "description": "Time standard deviation"
            }
          }
        }
      }
    },
    "eval_results": {
      "type": "array",
      "description": "Individual eval comparison results",
      "items": {
        "type": "object",
        "required": ["eval_id", "with_skill", "baseline"],
        "properties": {
          "eval_id": {
            "type": "integer",
            "minimum": 0,
            "description": "Evaluation ID (0-based)"
          },
          "with_skill": {
            "type": "object",
            "required": ["pass_rate", "tokens", "duration"],
            "description": "Skill-applied results",
            "properties": {
              "pass_rate": {
                "type": "number",
                "minimum": 0,
                "maximum": 1,
                "description": "Pass rate (0.0~1.0)"
              },
              "tokens": {
                "type": "integer",
                "minimum": 0,
                "description": "Token usage"
              },
              "duration": {
                "type": "number",
                "minimum": 0,
                "description": "Execution time (seconds)"
              }
            }
          },
          "baseline": {
            "type": "object",
            "required": ["pass_rate", "tokens", "duration"],
            "description": "Baseline (no skill applied) results",
            "properties": {
              "pass_rate": {
                "type": "number",
                "minimum": 0,
                "maximum": 1
              },
              "tokens": {
                "type": "integer",
                "minimum": 0
              },
              "duration": {
                "type": "number",
                "minimum": 0
              }
            }
          }
        }
      }
    }
  }
}
```

**Example:**

```json
{
  "skill_name": "test-driven-development",
  "iteration": 1,
  "summary": {
    "pass_rate": { "mean": 0.85, "stddev": 0.12 },
    "tokens": { "mean": 42000, "stddev": 5200 },
    "duration_seconds": { "mean": 35.5, "stddev": 8.3 }
  },
  "eval_results": [
    {
      "eval_id": 0,
      "with_skill": { "pass_rate": 0.75, "tokens": 45230, "duration": 32.15 },
      "baseline": { "pass_rate": 0.50, "tokens": 38400, "duration": 28.90 }
    },
    {
      "eval_id": 1,
      "with_skill": { "pass_rate": 1.0, "tokens": 38770, "duration": 38.85 },
      "baseline": { "pass_rate": 0.25, "tokens": 35200, "duration": 25.40 }
    }
  ]
}
```

**Interpretation guide:**
- `with_skill.pass_rate > baseline.pass_rate`: Skill improves quality
- `with_skill.tokens > baseline.tokens`: Token overhead from skill application
- Lower `summary.pass_rate.stddev` means more consistent performance

---

### 7. trigger_eval.json

Defines test cases for evaluating skill recommendation triggers. Used in benchmark mode to measure the trigger accuracy of `recommend_skills`.

**Schema:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/trigger_eval.json",
  "title": "Trigger Evaluation Cases",
  "description": "Test cases for skill recommendation trigger accuracy",
  "type": "array",
  "minItems": 1,
  "items": {
    "type": "object",
    "required": ["query", "should_trigger"],
    "properties": {
      "query": {
        "type": "string",
        "description": "User prompt (test input)"
      },
      "should_trigger": {
        "type": "boolean",
        "description": "Whether the skill should be recommended for this prompt"
      }
    }
  }
}
```

**Example:**

```json
[
  {
    "query": "Add a new feature to validate user registration",
    "should_trigger": true
  },
  {
    "query": "Fix the null pointer exception in the payment module",
    "should_trigger": true
  },
  {
    "query": "What does this function do?",
    "should_trigger": false
  },
  {
    "query": "Deploy the application to production",
    "should_trigger": false
  }
]
```

**Usage:**
1. Pass each `query` from `trigger_eval.json` to `recommend_skills`
2. Check whether the target skill is included in the results
3. Compare against `should_trigger` to calculate accuracy

**Accuracy metrics:**
- **Precision**: Ratio of correct recommendations among all recommendations
- **Recall**: Ratio of actual recommendations among all that should have been recommended
- **F1 Score**: Harmonic mean of Precision and Recall

---

## Schema Relationships

```
evals.json (workspace root)
    │
    │ eval.id → eval_id mapping
    ▼
iteration-N/eval-{id}/
    ├── with_skill/
    │   ├── eval_metadata.json ◄── Prompt and assertions defined in evals.json
    │   ├── grading.json ◄── Grading of assertions from eval_metadata.json
    │   └── timing.json ── Independent measurement
    └── without_skill/
        ├── eval_metadata.json
        ├── grading.json
        └── timing.json
    │
    ▼ Aggregation
iteration-N/
    ├── benchmark.json ◄── with_skill vs without_skill comparison across all evals
    └── feedback.json ◄── User feedback (references evals via run_id)

trigger_eval.json (workspace root) ── recommend_skills accuracy measurement (independent)
```

**Data flow:**
1. Define evaluation scenarios in `evals.json`
2. Run `with_skill/` and `without_skill/` for each eval
3. Record execution information in `eval_metadata.json`
4. Store per-assertion grading results in `grading.json`
5. Measure tokens/time in `timing.json`
6. Aggregate and compare all eval results in `benchmark.json`
7. Collect user feedback in `feedback.json`
8. Measure recommendation accuracy separately with `trigger_eval.json`

**ID mapping:**
- `evals.json` `id` (1-based) → `eval-{id-1}/` directory (0-based)
- `eval_metadata.json` `eval_id` (0-based) = eval number of the directory
- `feedback.json` `run_id` = `eval-{eval_id}-{with_skill|without_skill}`

---

## Validation

### Validation with ajv CLI

```bash
# Validate evals.json
npx ajv-cli@5.0.0 validate \
  -s schemas/evals.schema.json \
  -d workspace/evals.json \
  --spec=draft7

# Validate all grading.json files within an iteration
for f in workspace/iteration-*/eval-*/*/grading.json; do
  npx ajv-cli@5.0.0 validate \
    -s schemas/grading.schema.json \
    -d "$f" \
    --spec=draft7
done

# Validate trigger_eval.json
npx ajv-cli@5.0.0 validate \
  -s schemas/trigger_eval.schema.json \
  -d workspace/trigger_eval.json \
  --spec=draft7
```

### Programmatic Validation

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Load schemas
const evalsSchema = require('./schemas/evals.schema.json');
const gradingSchema = require('./schemas/grading.schema.json');
const timingSchema = require('./schemas/timing.schema.json');

// Compile validation functions
const validateEvals = ajv.compile(evalsSchema);
const validateGrading = ajv.compile(gradingSchema);
const validateTiming = ajv.compile(timingSchema);

// Validate data
const evalsData = require('./workspace/evals.json');
if (!validateEvals(evalsData)) {
  console.error('evals.json validation errors:', validateEvals.errors);
}
```

### Consistency Validation

Additional validation to check referential integrity between schemas:

```typescript
// Verify evals.json id to eval directory mapping
function validateConsistency(workspacePath: string): string[] {
  const errors: string[] = [];
  const evals = require(`${workspacePath}/evals.json`);

  for (const eval of evals.evals) {
    const evalDir = `${workspacePath}/iteration-1/eval-${eval.id - 1}`;

    // Check with_skill directory exists
    if (!fs.existsSync(`${evalDir}/with_skill/eval_metadata.json`)) {
      errors.push(`Missing: ${evalDir}/with_skill/eval_metadata.json`);
    }

    // Check without_skill directory exists
    if (!fs.existsSync(`${evalDir}/without_skill/eval_metadata.json`)) {
      errors.push(`Missing: ${evalDir}/without_skill/eval_metadata.json`);
    }
  }

  return errors;
}
```
