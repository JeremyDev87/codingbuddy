<p align="center">
  <a href="README.md">English</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.zh-CN.md">中文</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.es.md">Español</a>
</p>

# Codingbuddy

[![CI](https://github.com/JeremyDev87/codingbuddy/actions/workflows/dev.yml/badge.svg)](https://github.com/JeremyDev87/codingbuddy/actions/workflows/dev.yml)
[![npm version](https://img.shields.io/npm/v/codingbuddy.svg)](https://www.npmjs.com/package/codingbuddy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <img src="docs/ai-rules-architecture.svg" alt="Codingbuddy AI Rules Architecture" width="800"/>
</p>

**모든 AI 코딩 어시스턴트를 위한 단일 규칙 시스템**

Codingbuddy는 Cursor, Claude Code, GitHub Copilot 등 다양한 AI 도구에서 동일한 코딩 규칙을 적용할 수 있는 통합 시스템을 제공합니다. 팀 전체가 어떤 AI 도구를 사용하든 동일한 코딩 표준을 따를 수 있습니다.

## 왜 Codingbuddy인가?

- **일관성**: 모든 AI 도구가 동일한 코딩 표준을 따름
- **단일 소스**: 규칙을 한 번만 수정하면 모든 도구에 적용
- **벤더 종속 없음**: AI에 구애받지 않는 규칙으로 어떤 어시스턴트와도 호환
- **구조화된 워크플로우**: PLAN → ACT → EVAL 개발 사이클

## 빠른 시작

```bash
# 프로젝트 초기화 (API 키 불필요)
npx codingbuddy init

# 선택: AI 기반 초기화로 더 깊은 분석
# npx codingbuddy init --ai  # ANTHROPIC_API_KEY 필요

# AI 도구에 추가 (예: Claude Desktop)
# 다른 AI 도구는 docs/ko/supported-tools.md 참조
```

Claude Desktop 설정 파일에 추가 (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "codingbuddy": {
      "command": "npx",
      "args": ["codingbuddy", "mcp"]
    }
  }
}
```

[전체 시작 가이드 →](docs/ko/getting-started.md)

## 지원 AI 도구

| 도구 | 상태 |
|------|------|
| Claude Code | ✅ 전체 MCP 지원 |
| Cursor | ✅ 지원 |
| GitHub Copilot | ✅ 지원 |
| Antigravity | ✅ 지원 |
| Amazon Q | ✅ 지원 |
| Kiro | ✅ 지원 |
| OpenCode | ✅ 지원 |

[설정 가이드 →](docs/ko/supported-tools.md)

## 문서

| 문서 | 설명 |
|------|------|
| [시작하기](docs/ko/getting-started.md) | 설치 및 빠른 설정 |
| [철학](docs/ko/philosophy.md) | 비전과 설계 원칙 |
| [지원 도구](docs/ko/supported-tools.md) | AI 도구 통합 가이드 |
| [설정](docs/config-schema.md) | 설정 파일 옵션 |
| [API 레퍼런스](docs/api.md) | MCP 서버 기능 |
| [개발 가이드](docs/development.md) | 기여 및 로컬 설정 |

## 작동 방식

위 아키텍처 다이어그램에서 3계층 에이전트 시스템의 전체 구조를 확인하세요:

- **Layer 1 (모드 에이전트)**: PLAN → ACT → EVAL 워크플로우 사이클
- **Layer 2 (주요 에이전트)**: Frontend/Backend Developer, Code Reviewer, DevOps
- **Layer 3 (전문가)**: 9명의 도메인 전문가 (보안, 성능, 접근성 등)
- **스킬**: 재사용 가능한 기능 (TDD, 디버깅, 브레인스토밍 등)

모든 AI 도구 설정이 동일한 `packages/rules/.ai-rules/` 디렉토리를 참조합니다. 규칙을 한 번 수정하면 모든 도구가 업데이트된 표준을 따릅니다.

## 기여하기

기여를 환영합니다! 자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.

## 라이선스

MIT © [Codingbuddy](https://github.com/JeremyDev87/codingbuddy)
