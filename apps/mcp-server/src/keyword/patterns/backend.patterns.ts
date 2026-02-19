/**
 * Backend Developer Intent Patterns
 *
 * These patterns detect prompts related to server-side development,
 * API design, and backend services.
 * Priority: 9th (after agent-architect, test, tooling, platform, security, systems, data, ai-ml patterns).
 *
 * Confidence Levels:
 * - 0.95: Backend frameworks (NestJS, Express, Django, Spring)
 * - 0.90: API patterns (REST, GraphQL, gRPC), server concepts
 * - 0.85: Generic backend keywords
 * - 0.80: TypeScript type definitions
 * - 0.75: Generic development (refactoring)
 *
 * @example
 * "NestJS API 만들어줘" → backend-developer (0.95)
 * "REST API 설계해줘" → backend-developer (0.90)
 * "서버 로직 구현" → backend-developer (0.85)
 */

import type { IntentPattern } from './intent-patterns.types';

export const BACKEND_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // Node.js Backend Frameworks (0.95)
  {
    pattern: /nestjs|nest\.js/i,
    confidence: 0.95,
    description: 'NestJS',
  },
  {
    pattern: /express\.js|express\s+서버|express\s+server/i,
    confidence: 0.95,
    description: 'Express',
  },
  {
    pattern: /fastify|koa\.js|hapi/i,
    confidence: 0.95,
    description: 'Node.js Framework',
  },
  // Python Backend Frameworks (0.95)
  {
    pattern: /django|flask|fastapi/i,
    confidence: 0.95,
    description: 'Python Framework',
  },
  // Other Backend Frameworks (0.95)
  {
    pattern: /spring\s*boot|spring\s*framework/i,
    confidence: 0.95,
    description: 'Spring Boot',
  },
  {
    pattern: /gin|echo|fiber/i,
    confidence: 0.9,
    description: 'Go Framework',
  },
  {
    pattern: /rails|ruby\s+on\s+rails/i,
    confidence: 0.95,
    description: 'Ruby on Rails',
  },
  // API Patterns (0.90)
  {
    pattern: /REST\s*API|RESTful/i,
    confidence: 0.9,
    description: 'REST API',
  },
  {
    pattern: /GraphQL\s*(API|서버|server|스키마|schema)/i,
    confidence: 0.9,
    description: 'GraphQL',
  },
  {
    pattern: /gRPC|protobuf/i,
    confidence: 0.9,
    description: 'gRPC',
  },
  // Server concepts (0.85-0.90)
  {
    pattern: /API\s*(설계|개발|구현|design|develop|implement)/i,
    confidence: 0.9,
    description: 'API Development',
  },
  {
    pattern: /서버\s*(개발|구현|로직)|server.?side\s*(logic|develop)/i,
    confidence: 0.85,
    description: 'Server Development',
  },
  {
    pattern: /백엔드\s*(개발|구현|로직)|backend\s*(develop|logic|implement)/i,
    confidence: 0.85,
    description: 'Backend Development',
  },
  {
    pattern: /미들웨어|middleware/i,
    confidence: 0.85,
    description: 'Middleware',
  },
  {
    pattern: /인증\s*서버|auth.*server|OAuth\s*서버/i,
    confidence: 0.85,
    description: 'Auth Server',
  },
  {
    pattern: /웹소켓|websocket|socket\.io/i,
    confidence: 0.85,
    description: 'WebSocket',
  },
  {
    pattern: /마이크로서비스|microservice/i,
    confidence: 0.85,
    description: 'Microservice',
  },
  // TODO(#568): Move to software-engineer.patterns.ts after software-engineer agent is created
  // Generic Development Patterns (0.75-0.80) - fallback before DEFAULT_ACT_AGENT
  {
    pattern: /리팩토링|refactor/i,
    confidence: 0.75,
    description: 'Refactoring',
  },
  {
    pattern: /타입\s*추가|type\s*definition/i,
    confidence: 0.8,
    description: 'TypeScript Type Definition',
  },
];
