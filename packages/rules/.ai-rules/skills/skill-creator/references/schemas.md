# Skill Evaluation Schemas Reference

JSON 스키마 정의 및 작업 디렉토리 구조 레퍼런스.

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

스킬 개발 및 평가 시 사용하는 작업 디렉토리 구조:

```
workspace/
├── trigger_eval.json              # 자동 평가 트리거 설정
├── iteration-1/                   # 첫 번째 개발 반복
│   ├── eval-1/                    # 첫 번째 평가 실행
│   │   ├── evals.json             # 평가 결과
│   │   ├── eval_metadata.json     # 평가 메타데이터
│   │   ├── grading.json           # 채점 결과
│   │   ├── timing.json            # 실행 시간 측정
│   │   ├── feedback.json          # 피드백 기록
│   │   └── benchmark.json         # 벤치마크 비교
│   └── eval-2/                    # 두 번째 평가 실행
│       └── ...
├── iteration-2/                   # 두 번째 개발 반복
│   └── eval-1/
│       └── ...
└── iteration-N/
    └── eval-N/
        └── ...
```

**디렉토리 명명 규칙:**
- `iteration-N`: 1-based 순차 번호. 스킬 SKILL.md 수정 시마다 새 iteration 생성
- `eval-N`: 1-based 순차 번호. 동일 iteration 내 재평가 시 증가
- `trigger_eval.json`: workspace 루트에 위치 (iteration 독립)

---

## Schema Definitions

모든 스키마는 JSON Schema Draft 2020-12 기준.

### 1. evals.json

개별 평가 시나리오의 실행 결과를 기록한다.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/evals.json",
  "title": "Skill Evaluation Results",
  "description": "개별 스킬 평가 시나리오의 실행 결과",
  "type": "object",
  "required": ["skill_name", "eval_id", "scenarios", "summary"],
  "properties": {
    "skill_name": {
      "type": "string",
      "description": "평가 대상 스킬의 name (kebab-case)",
      "pattern": "^[a-z][a-z0-9-]*$"
    },
    "eval_id": {
      "type": "string",
      "description": "고유 평가 식별자",
      "pattern": "^eval-[0-9]+$"
    },
    "scenarios": {
      "type": "array",
      "description": "평가 시나리오 목록",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "name", "status", "assertions"],
        "properties": {
          "id": {
            "type": "string",
            "description": "시나리오 식별자"
          },
          "name": {
            "type": "string",
            "description": "시나리오 설명"
          },
          "status": {
            "type": "string",
            "enum": ["pass", "fail", "skip", "error"],
            "description": "실행 결과 상태"
          },
          "assertions": {
            "type": "array",
            "description": "검증 항목 목록",
            "items": {
              "type": "object",
              "required": ["check", "expected", "actual", "passed"],
              "properties": {
                "check": {
                  "type": "string",
                  "description": "검증 항목명"
                },
                "expected": {
                  "description": "기대값 (any type)"
                },
                "actual": {
                  "description": "실제값 (any type)"
                },
                "passed": {
                  "type": "boolean"
                }
              }
            }
          },
          "output": {
            "type": "string",
            "description": "시나리오 실행 시 생성된 출력 (선택)"
          },
          "error_message": {
            "type": "string",
            "description": "status=error 시 에러 메시지"
          }
        }
      }
    },
    "summary": {
      "type": "object",
      "required": ["total", "passed", "failed", "skipped", "errored"],
      "properties": {
        "total": { "type": "integer", "minimum": 0 },
        "passed": { "type": "integer", "minimum": 0 },
        "failed": { "type": "integer", "minimum": 0 },
        "skipped": { "type": "integer", "minimum": 0 },
        "errored": { "type": "integer", "minimum": 0 }
      }
    }
  }
}
```

**사용 예시:**

```json
{
  "skill_name": "test-driven-development",
  "eval_id": "eval-1",
  "scenarios": [
    {
      "id": "scenario-1",
      "name": "RED phase에서 실패 테스트 작성 확인",
      "status": "pass",
      "assertions": [
        {
          "check": "test_file_created",
          "expected": true,
          "actual": true,
          "passed": true
        },
        {
          "check": "test_initially_fails",
          "expected": true,
          "actual": true,
          "passed": true
        }
      ]
    }
  ],
  "summary": { "total": 1, "passed": 1, "failed": 0, "skipped": 0, "errored": 0 }
}
```

---

### 2. eval_metadata.json

평가 실행의 환경 및 컨텍스트 메타데이터를 기록한다.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/eval_metadata.json",
  "title": "Evaluation Metadata",
  "description": "평가 실행 환경 및 컨텍스트 메타데이터",
  "type": "object",
  "required": ["eval_id", "iteration", "skill_version", "timestamp", "evaluator"],
  "properties": {
    "eval_id": {
      "type": "string",
      "pattern": "^eval-[0-9]+$"
    },
    "iteration": {
      "type": "integer",
      "minimum": 1,
      "description": "iteration 번호"
    },
    "skill_version": {
      "type": "string",
      "description": "평가 시점의 SKILL.md 해시 또는 버전"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "평가 시작 시각 (ISO 8601)"
    },
    "duration_ms": {
      "type": "integer",
      "minimum": 0,
      "description": "전체 평가 소요 시간 (밀리초)"
    },
    "evaluator": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["human", "ai", "automated"],
          "description": "평가 주체 유형"
        },
        "model": {
          "type": "string",
          "description": "AI 평가 시 사용된 모델 (예: claude-opus-4-20250514)"
        },
        "name": {
          "type": "string",
          "description": "평가자 이름 또는 식별자"
        }
      }
    },
    "environment": {
      "type": "object",
      "description": "평가 실행 환경 정보",
      "properties": {
        "tool": {
          "type": "string",
          "description": "사용된 AI 도구 (예: claude-code, cursor)",
          "enum": ["claude-code", "cursor", "codex", "amazon-q", "kiro", "antigravity"]
        },
        "tool_version": {
          "type": "string"
        },
        "os": {
          "type": "string"
        },
        "node_version": {
          "type": "string"
        }
      }
    },
    "trigger": {
      "type": "string",
      "enum": ["manual", "auto", "ci"],
      "description": "평가 트리거 방식"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "분류 태그"
    }
  }
}
```

---

### 3. grading.json

평가 시나리오의 채점 기준 및 점수를 정의한다.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/grading.json",
  "title": "Grading Results",
  "description": "스킬 평가 채점 기준 및 점수",
  "type": "object",
  "required": ["eval_id", "dimensions", "overall_score", "grade"],
  "properties": {
    "eval_id": {
      "type": "string",
      "pattern": "^eval-[0-9]+$"
    },
    "dimensions": {
      "type": "array",
      "description": "채점 차원 목록",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["name", "weight", "score", "max_score"],
        "properties": {
          "name": {
            "type": "string",
            "description": "채점 차원명",
            "enum": [
              "correctness",
              "completeness",
              "clarity",
              "structure",
              "tool-compatibility",
              "frontmatter-validity",
              "reference-quality"
            ]
          },
          "weight": {
            "type": "number",
            "minimum": 0,
            "maximum": 1,
            "description": "가중치 (전체 합=1.0)"
          },
          "score": {
            "type": "number",
            "minimum": 0,
            "description": "획득 점수"
          },
          "max_score": {
            "type": "number",
            "minimum": 1,
            "description": "최대 점수"
          },
          "rationale": {
            "type": "string",
            "description": "점수 사유"
          }
        }
      }
    },
    "overall_score": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "가중 평균 종합 점수 (0-100)"
    },
    "grade": {
      "type": "string",
      "enum": ["A", "B", "C", "D", "F"],
      "description": "등급 (A: 90+, B: 80+, C: 70+, D: 60+, F: <60)"
    },
    "pass": {
      "type": "boolean",
      "description": "합격 여부 (grade C 이상)"
    }
  }
}
```

**채점 차원:**

| Dimension | Description | Weight (권장) |
|-----------|-------------|---------------|
| `correctness` | 스킬 로직이 의도대로 동작하는가 | 0.25 |
| `completeness` | 모든 요구사항을 충족하는가 | 0.20 |
| `clarity` | 지시사항이 명확하고 모호하지 않은가 | 0.15 |
| `structure` | SKILL.md 구조가 표준을 따르는가 | 0.15 |
| `tool-compatibility` | 6개 도구에서 정상 동작하는가 | 0.10 |
| `frontmatter-validity` | 프론트매터가 스키마에 맞는가 | 0.10 |
| `reference-quality` | 레퍼런스 파일이 정확하고 유용한가 | 0.05 |

---

### 4. timing.json

평가 및 스킬 실행의 시간 측정 데이터를 기록한다.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/timing.json",
  "title": "Timing Data",
  "description": "스킬 평가 시간 측정 데이터",
  "type": "object",
  "required": ["eval_id", "total_ms", "phases"],
  "properties": {
    "eval_id": {
      "type": "string",
      "pattern": "^eval-[0-9]+$"
    },
    "total_ms": {
      "type": "integer",
      "minimum": 0,
      "description": "전체 소요 시간 (밀리초)"
    },
    "phases": {
      "type": "array",
      "description": "단계별 시간 측정",
      "items": {
        "type": "object",
        "required": ["name", "start_ms", "end_ms"],
        "properties": {
          "name": {
            "type": "string",
            "description": "단계명 (예: skill_load, scenario_exec, grading)"
          },
          "start_ms": {
            "type": "integer",
            "minimum": 0,
            "description": "시작 오프셋 (밀리초)"
          },
          "end_ms": {
            "type": "integer",
            "minimum": 0,
            "description": "종료 오프셋 (밀리초)"
          },
          "duration_ms": {
            "type": "integer",
            "minimum": 0,
            "description": "단계 소요 시간 (end_ms - start_ms)"
          }
        }
      }
    },
    "token_usage": {
      "type": "object",
      "description": "AI 토큰 사용량 (AI 평가 시)",
      "properties": {
        "input_tokens": { "type": "integer", "minimum": 0 },
        "output_tokens": { "type": "integer", "minimum": 0 },
        "total_tokens": { "type": "integer", "minimum": 0 }
      }
    },
    "tool_calls": {
      "type": "integer",
      "minimum": 0,
      "description": "총 도구 호출 횟수"
    }
  }
}
```

---

### 5. feedback.json

평가자 또는 사용자의 정성적 피드백을 기록한다.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/feedback.json",
  "title": "Evaluation Feedback",
  "description": "스킬 평가에 대한 정성적 피드백",
  "type": "object",
  "required": ["eval_id", "entries"],
  "properties": {
    "eval_id": {
      "type": "string",
      "pattern": "^eval-[0-9]+$"
    },
    "entries": {
      "type": "array",
      "description": "피드백 항목 목록",
      "items": {
        "type": "object",
        "required": ["severity", "category", "message"],
        "properties": {
          "severity": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low", "info"],
            "description": "심각도"
          },
          "category": {
            "type": "string",
            "enum": [
              "correctness",
              "usability",
              "compatibility",
              "performance",
              "documentation",
              "security",
              "accessibility"
            ],
            "description": "피드백 카테고리"
          },
          "message": {
            "type": "string",
            "description": "피드백 내용"
          },
          "scenario_id": {
            "type": "string",
            "description": "관련 시나리오 ID (선택)"
          },
          "suggestion": {
            "type": "string",
            "description": "개선 제안 (선택)"
          },
          "line_ref": {
            "type": "string",
            "description": "SKILL.md 내 관련 라인 참조 (선택)"
          }
        }
      }
    },
    "overall_comment": {
      "type": "string",
      "description": "종합 코멘트"
    }
  }
}
```

---

### 6. benchmark.json

스킬 버전 간 또는 기준선 대비 성능을 비교한다.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/benchmark.json",
  "title": "Benchmark Comparison",
  "description": "스킬 버전 간 벤치마크 비교 데이터",
  "type": "object",
  "required": ["eval_id", "baseline", "current", "comparison"],
  "properties": {
    "eval_id": {
      "type": "string",
      "pattern": "^eval-[0-9]+$"
    },
    "baseline": {
      "type": "object",
      "required": ["iteration", "eval_id", "overall_score"],
      "description": "비교 기준 (이전 평가)",
      "properties": {
        "iteration": { "type": "integer", "minimum": 1 },
        "eval_id": { "type": "string" },
        "overall_score": { "type": "number", "minimum": 0, "maximum": 100 }
      }
    },
    "current": {
      "type": "object",
      "required": ["iteration", "eval_id", "overall_score"],
      "description": "현재 평가",
      "properties": {
        "iteration": { "type": "integer", "minimum": 1 },
        "eval_id": { "type": "string" },
        "overall_score": { "type": "number", "minimum": 0, "maximum": 100 }
      }
    },
    "comparison": {
      "type": "object",
      "required": ["score_delta", "improved_dimensions", "regressed_dimensions"],
      "properties": {
        "score_delta": {
          "type": "number",
          "description": "점수 변화 (current - baseline)"
        },
        "improved_dimensions": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "delta"],
            "properties": {
              "name": { "type": "string" },
              "delta": { "type": "number", "exclusiveMinimum": 0 }
            }
          }
        },
        "regressed_dimensions": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "delta"],
            "properties": {
              "name": { "type": "string" },
              "delta": { "type": "number", "exclusiveMaximum": 0 }
            }
          }
        },
        "verdict": {
          "type": "string",
          "enum": ["improved", "regressed", "stable"],
          "description": "종합 판정"
        }
      }
    }
  }
}
```

---

### 7. trigger_eval.json

자동 평가 트리거 조건을 설정한다. workspace 루트에 위치하며 iteration과 독립적으로 관리된다.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://codingbuddy.dev/schemas/skill-eval/trigger_eval.json",
  "title": "Evaluation Trigger Configuration",
  "description": "자동 평가 트리거 조건 설정",
  "type": "object",
  "required": ["skill_name", "triggers"],
  "properties": {
    "skill_name": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9-]*$",
      "description": "대상 스킬명"
    },
    "triggers": {
      "type": "array",
      "description": "트리거 조건 목록",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["event", "action"],
        "properties": {
          "event": {
            "type": "string",
            "enum": [
              "skill_modified",
              "reference_modified",
              "frontmatter_changed",
              "manual",
              "schedule",
              "ci"
            ],
            "description": "트리거 이벤트"
          },
          "action": {
            "type": "string",
            "enum": ["full_eval", "quick_eval", "regression_only"],
            "description": "실행할 평가 유형"
          },
          "conditions": {
            "type": "object",
            "description": "추가 조건 (선택)",
            "properties": {
              "min_change_lines": {
                "type": "integer",
                "minimum": 1,
                "description": "최소 변경 라인 수"
              },
              "cooldown_minutes": {
                "type": "integer",
                "minimum": 1,
                "description": "동일 트리거 재실행 대기 시간 (분)"
              },
              "require_passing_baseline": {
                "type": "boolean",
                "description": "이전 평가 통과 필수 여부"
              }
            }
          }
        }
      }
    },
    "scenarios_path": {
      "type": "string",
      "description": "시나리오 정의 파일 경로 (기본: ./scenarios/)"
    },
    "notify": {
      "type": "object",
      "description": "평가 완료 알림 설정",
      "properties": {
        "on_pass": { "type": "boolean", "default": false },
        "on_fail": { "type": "boolean", "default": true },
        "on_regression": { "type": "boolean", "default": true }
      }
    }
  }
}
```

**트리거 이벤트:**

| Event | Description | 권장 Action |
|-------|-------------|-------------|
| `skill_modified` | SKILL.md 파일 변경 시 | `full_eval` |
| `reference_modified` | 레퍼런스 파일 변경 시 | `quick_eval` |
| `frontmatter_changed` | 프론트매터만 변경 시 | `quick_eval` |
| `manual` | 수동 트리거 | `full_eval` |
| `schedule` | 정기 실행 (cron) | `regression_only` |
| `ci` | CI/CD 파이프라인 내 | `full_eval` |

---

## Schema Relationships

```
trigger_eval.json ──triggers──▶ eval_metadata.json
                                     │
                                     ▼
                                evals.json ◀──references── grading.json
                                     │                         │
                                     ▼                         ▼
                               feedback.json            benchmark.json
                                                             │
                                                             ▼
                                                        timing.json
```

**데이터 흐름:**
1. `trigger_eval.json`이 평가를 트리거
2. `eval_metadata.json`에 실행 환경 기록
3. `evals.json`에 시나리오별 결과 저장
4. `grading.json`에 채점 결과 산출
5. `timing.json`에 시간 측정 데이터 기록
6. `feedback.json`에 정성적 피드백 추가
7. `benchmark.json`에서 이전 iteration과 비교

**공통 키:** 모든 스키마는 `eval_id` 필드로 연결된다.

---

## Validation

### ajv CLI로 검증

```bash
# 단일 파일 검증
npx ajv validate -s schemas/evals.schema.json -d workspace/iteration-1/eval-1/evals.json

# 전체 workspace 검증
for f in workspace/iteration-*/eval-*/evals.json; do
  npx ajv validate -s schemas/evals.schema.json -d "$f"
done
```

### 프로그래밍 방식 검증

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const evalsSchema = require('./schemas/evals.schema.json');
const validate = ajv.compile(evalsSchema);

const data = require('./workspace/iteration-1/eval-1/evals.json');
if (!validate(data)) {
  console.error('Validation errors:', validate.errors);
}
```
