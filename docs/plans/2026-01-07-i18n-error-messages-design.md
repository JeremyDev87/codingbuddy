# i18n Strategy for Error Messages

**Date**: 2026-01-07
**Status**: Design Document
**Author**: ACT Mode Implementation

## Overview

This document outlines the internationalization (i18n) strategy for error messages in the Codingbuddy MCP Server. Currently, all error messages are hardcoded in English. This design enables future localization support.

## Current State

### Error Message Locations

1. **Handler Error Messages** (`src/mcp/handlers/*.ts`)
   - `Missing required parameter: {param}`
   - `Invalid mode: {mode}. Must be PLAN, ACT, or EVAL`
   - `Failed to {action}: {error}`

2. **Service Error Messages** (`src/*/\*.service.ts`)
   - `Agent '{name}' not found`
   - `Invalid checklist schema for domain '{domain}'`
   - `Path validation failed: {details}`

3. **Validation Error Messages** (`src/shared/validation.constants.ts`, `src/shared/security.utils.ts`)
   - `Query cannot be empty`
   - `Query exceeds maximum length of {max} characters`
   - `Invalid argument: dangerous key detected at '{path}'`

## Proposed Architecture

### Error Message Keys

```typescript
// src/i18n/error-keys.ts
export const ERROR_KEYS = {
  // Parameter validation
  MISSING_REQUIRED_PARAM: 'error.validation.missingRequiredParam',
  INVALID_MODE: 'error.validation.invalidMode',
  EMPTY_QUERY: 'error.validation.emptyQuery',
  QUERY_TOO_LONG: 'error.validation.queryTooLong',

  // Security
  DANGEROUS_KEY_DETECTED: 'error.security.dangerousKeyDetected',
  PATH_TRAVERSAL_BLOCKED: 'error.security.pathTraversalBlocked',

  // Agent/Service
  AGENT_NOT_FOUND: 'error.agent.notFound',
  SCHEMA_VALIDATION_FAILED: 'error.schema.validationFailed',

  // Generic
  OPERATION_FAILED: 'error.generic.operationFailed',
} as const;
```

### Message Templates

```typescript
// src/i18n/messages/en.ts
export const EN_MESSAGES: Record<string, string> = {
  'error.validation.missingRequiredParam': 'Missing required parameter: {{param}}',
  'error.validation.invalidMode': 'Invalid mode: {{mode}}. Must be PLAN, ACT, or EVAL',
  'error.validation.emptyQuery': 'Query cannot be empty',
  'error.validation.queryTooLong': 'Query exceeds maximum length of {{max}} characters',
  'error.security.dangerousKeyDetected': 'Invalid argument: dangerous key detected at \'{{path}}\'',
  'error.security.pathTraversalBlocked': 'Path traversal attempt blocked: {{path}}',
  'error.agent.notFound': 'Agent \'{{name}}\' not found',
  'error.schema.validationFailed': 'Schema validation failed: {{errors}}',
  'error.generic.operationFailed': 'Failed to {{action}}: {{error}}',
};

// src/i18n/messages/ko.ts
export const KO_MESSAGES: Record<string, string> = {
  'error.validation.missingRequiredParam': '필수 매개변수가 누락되었습니다: {{param}}',
  'error.validation.invalidMode': '잘못된 모드: {{mode}}. PLAN, ACT, EVAL 중 하나여야 합니다',
  'error.validation.emptyQuery': '쿼리가 비어있습니다',
  'error.validation.queryTooLong': '쿼리가 최대 길이 {{max}}자를 초과했습니다',
  'error.security.dangerousKeyDetected': '유효하지 않은 인자: \'{{path}}\'에서 위험한 키가 감지되었습니다',
  'error.security.pathTraversalBlocked': '경로 탐색 시도가 차단되었습니다: {{path}}',
  'error.agent.notFound': '에이전트 \'{{name}}\'을(를) 찾을 수 없습니다',
  'error.schema.validationFailed': '스키마 검증 실패: {{errors}}',
  'error.generic.operationFailed': '{{action}} 실패: {{error}}',
};
```

### i18n Service

```typescript
// src/i18n/i18n.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { EN_MESSAGES } from './messages/en';
import { KO_MESSAGES } from './messages/ko';

type MessageKey = keyof typeof EN_MESSAGES;
type MessageParams = Record<string, string | number>;

const MESSAGES: Record<string, Record<string, string>> = {
  en: EN_MESSAGES,
  ko: KO_MESSAGES,
};

@Injectable()
export class I18nService {
  constructor(private readonly configService: ConfigService) {}

  async getMessage(key: MessageKey, params?: MessageParams): Promise<string> {
    const language = await this.configService.getLanguage() || 'en';
    const messages = MESSAGES[language] || MESSAGES['en'];
    let message = messages[key] || EN_MESSAGES[key] || key;

    // Replace template variables
    if (params) {
      for (const [paramKey, value] of Object.entries(params)) {
        message = message.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
      }
    }

    return message;
  }

  // Sync version for validation functions (uses default language)
  getMessageSync(key: MessageKey, params?: MessageParams, language = 'en'): string {
    const messages = MESSAGES[language] || MESSAGES['en'];
    let message = messages[key] || EN_MESSAGES[key] || key;

    if (params) {
      for (const [paramKey, value] of Object.entries(params)) {
        message = message.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
      }
    }

    return message;
  }
}
```

## Migration Strategy

### Phase 1: Infrastructure (Low Impact)
1. Create `src/i18n/` directory structure
2. Define error keys in `error-keys.ts`
3. Create English message templates
4. Create `I18nService` with backward-compatible API

### Phase 2: Handler Migration (Medium Impact)
1. Inject `I18nService` into handlers
2. Replace hardcoded strings with `getMessage()` calls
3. Update tests to verify i18n integration

### Phase 3: Validation Migration (High Impact)
1. Add language parameter to validation functions
2. Or create i18n-aware validation wrapper
3. Update shared utilities

### Phase 4: Additional Languages
1. Add Korean translations (`ko.ts`)
2. Add other languages as needed
3. Add language detection improvements

## Design Decisions

### Key Naming Convention
- Format: `{domain}.{category}.{action}`
- Examples: `error.validation.missingRequiredParam`, `error.agent.notFound`

### Template Variables
- Use double curly braces: `{{variable}}`
- Keep variable names consistent across languages

### Fallback Strategy
1. Try requested language
2. Fall back to English
3. Fall back to key itself (for debugging)

### Sync vs Async
- Handlers use async `getMessage()` (can access config)
- Validation functions use sync `getMessageSync()` (pure functions)

## File Structure

```
src/i18n/
├── index.ts              # Public exports
├── error-keys.ts         # Error key constants
├── i18n.service.ts       # Main i18n service
├── i18n.module.ts        # NestJS module
└── messages/
    ├── en.ts             # English messages
    ├── ko.ts             # Korean messages
    └── index.ts          # Message exports
```

## Testing Strategy

1. **Unit Tests**: Test message formatting with various params
2. **Integration Tests**: Test language switching in handlers
3. **Snapshot Tests**: Ensure message consistency across versions

## Considerations

### Performance
- Messages are loaded at startup (no runtime file I/O)
- Use sync version for hot paths (validation)

### Bundle Size
- Each language adds ~1-2KB
- Consider lazy loading for non-default languages

### Type Safety
- Use `const` assertions for error keys
- TypeScript will catch invalid keys at compile time

## Related Work

- `LanguageService` in `src/shared/language.service.ts` (handles language instructions)
- `ConfigService.getLanguage()` (provides user language preference)

## Status

This is a design document for future implementation. Current priority is **Low** as:
- The MCP server is primarily used by AI agents that understand English
- User-facing messages go through AI interpretation
- Core functionality is stable without i18n

Implement when:
- User demand for localized error messages increases
- Adding new languages to the rules system
- Expanding beyond AI-assisted development context
