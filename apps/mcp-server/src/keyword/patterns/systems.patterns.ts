/**
 * Systems Developer Intent Patterns
 *
 * These patterns detect prompts related to systems programming:
 * Rust, C, C++, Go (systems-level), FFI, WASM, embedded, and low-level optimization.
 * Priority: 6th (after security-engineer, before data-engineer).
 *
 * Confidence Levels:
 * - 0.95: Explicit language names (rust, cargo, c++, cpp) and systems-specific keywords (FFI, WASM, unsafe)
 * - 0.90: Generic systems/low-level implementation requests (EN + KO), memory management, embedded
 *
 * NOTE: Patterns are scoped to avoid false positives with general "memory" or "performance" queries.
 *
 * @example
 * "Rust로 서버 구현해줘" → systems-developer (0.95)
 * "C++ 메모리 최적화" → systems-developer (0.95)
 * "FFI 바인딩 작성" → systems-developer (0.95)
 * "시스템 프로그래밍 구현" → systems-developer (0.90)
 */

import type { IntentPattern } from './intent-patterns.types';

export const SYSTEMS_INTENT_PATTERNS: ReadonlyArray<IntentPattern> = [
  // Rust language keywords (0.95)
  {
    pattern: /\brust\b/i,
    confidence: 0.95,
    description: 'Rust programming language',
  },
  {
    pattern: /\bcargo\b\s*(build|test|run|add|init|new)/i,
    confidence: 0.95,
    description: 'Cargo build tool commands',
  },
  {
    pattern: /\bcrate\b|\bownership\b|\bborrow\s*checker\b|rust.*\blifetime\b/i,
    confidence: 0.95,
    description: 'Rust-specific concepts (lifetime scoped to Rust context)',
  },
  // C / C++ language keywords (0.95)
  {
    pattern: /c\+\+|\.cpp\b|\.hpp\b|\bcpp\b/i,
    confidence: 0.95,
    description: 'C++ language or file extension',
  },
  // FFI and interop (0.95)
  {
    pattern: /\bffi\b|foreign\s*function\s*interface/i,
    confidence: 0.95,
    description: 'FFI — Foreign Function Interface',
  },
  {
    pattern: /ffi\s*(바인딩|binding)/i,
    confidence: 0.95,
    description: 'Korean: FFI binding (FFI-scoped to avoid false positives with React/TS bindings)',
  },
  // WebAssembly (0.95)
  {
    pattern: /\bwasm\b|\bwebassembly\b/i,
    confidence: 0.95,
    description: 'WebAssembly / WASM',
  },
  {
    pattern: /wasm[-\s]?bindgen|wasmtime|emscripten/i,
    confidence: 0.95,
    description: 'WASM toolchain',
  },
  // Unsafe / low-level (0.95)
  {
    pattern: /\bunsafe\b\s*(block|블록|코드|code)/i,
    confidence: 0.95,
    description: 'Unsafe block (Rust)',
  },
  // Assembly (0.95)
  {
    pattern: /\bassembly\s*(language|code|코드|언어|구현|작성)|\basm\b\s*(코드|구현|작성)/i,
    confidence: 0.95,
    description: 'Assembly language (scoped to avoid false positives with assembly lines)',
  },
  // Memory management — implementation-scoped (0.90)
  {
    pattern: /메모리\s*(관리|최적화|누수|할당)\s*(구현|수정|최적화)/i,
    confidence: 0.9,
    description: 'Korean: Memory management implementation',
  },
  {
    pattern: /memory\s*(management|leak|allocat|pool)\s*(implement|fix|optim)/i,
    confidence: 0.9,
    description: 'Memory management implementation (EN)',
  },
  // Systems programming — generic (0.90)
  {
    pattern: /시스템\s*프로그래밍|systems?\s*programming/i,
    confidence: 0.9,
    description: 'Systems programming (KO + EN)',
  },
  {
    pattern: /저수준\s*(구현|개발|최적화)|low[-\s]?level\s*(implement|develop|optim)/i,
    confidence: 0.9,
    description: 'Low-level implementation (KO + EN)',
  },
  // Embedded systems (0.90)
  {
    pattern: /embedded\s*(시스템|system|개발|develop|device)|\bbare.?metal\b|\bno_std\b|\bRTOS\b/i,
    confidence: 0.9,
    description:
      'Embedded / bare-metal systems (scoped to avoid false positives with embedded video/links)',
  },
  {
    pattern: /임베디드\s*(개발|시스템|구현)/i,
    confidence: 0.9,
    description: 'Korean: Embedded development',
  },
  // Performance optimization — systems-scoped (0.90)
  {
    pattern: /\bSIMD\b|\bAVX\b|\bSSE\b/i,
    confidence: 0.9,
    description: 'SIMD / vectorization',
  },
  {
    pattern: /hot\s*path\s*(최적화|optim)|캐시\s*(효율|최적화)\s*(구현|개선)/i,
    confidence: 0.9,
    description: 'Hot path / cache optimization',
  },
  // Concurrency primitives — systems-scoped (0.90)
  {
    pattern: /lock[-\s]?free|atomic\s*(operation|연산)|mutex\s*(구현|implement)/i,
    confidence: 0.9,
    description: 'Lock-free / atomic concurrency',
  },
];
