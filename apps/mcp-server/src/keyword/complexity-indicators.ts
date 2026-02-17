/**
 * Complexity Indicators for SRP Classification
 *
 * Contains pattern definitions for COMPLEX and SIMPLE task classification.
 * Extracted to separate file for maintainability and i18n support.
 *
 * Supported Languages:
 * - English (EN)
 * - Korean (KO)
 * - Japanese (JA)
 * - Chinese Simplified (ZH)
 * - Spanish (ES)
 *
 * @module complexity-indicators
 */

/**
 * Indicator patterns for task complexity classification.
 * Each pattern has a weight for scoring.
 */
export interface ComplexityIndicator {
  pattern: RegExp;
  description: string;
  weight: number;
}

/**
 * COMPLEX task indicators - patterns that suggest SRP should be applied.
 *
 * Based on structured-reasoning-guide.md criteria:
 * - Design decisions required
 * - Multiple factors to analyze
 * - Trade-off evaluation needed
 * - 2+ files/modules affected
 * - Architectural implications
 * - Multiple valid approaches exist
 *
 * @example
 * ```typescript
 * import { COMPLEX_INDICATORS } from './complexity-indicators';
 *
 * // Use in custom classifier
 * const isComplex = COMPLEX_INDICATORS.some(i => i.pattern.test(prompt));
 *
 * // Extend with custom patterns
 * const customIndicators = [
 *   ...COMPLEX_INDICATORS,
 *   { pattern: /my-custom-pattern/i, description: 'Custom', weight: 0.5 }
 * ];
 * ```
 */
export const COMPLEX_INDICATORS: ComplexityIndicator[] = [
  // Design & Architecture - high priority patterns
  // EN: design, architect | KO: 설계, 아키텍처 | JA: 設計, アーキテクチャ | ZH: 设计, 架构 | ES: diseño, arquitectura
  {
    pattern:
      /\b(design|architect)\w*\b|설계|아키텍처|아키텍쳐|設計|アーキテクチャ|设计|架构|dise[ñn]o|arquitectura/i,
    description: 'Design/architecture task',
    weight: 0.8,
  },
  // EN: how should we/I | KO: 어떻게 해야 | JA: どうすれば | ZH: 应该怎么 | ES: cómo debemos/debo
  {
    pattern:
      /\bhow\s+should\s+(we|i)\b|어떻게\s*(해야|하면)|어떤\s*방식으로|どうすれば|どのように|应该怎么|怎[么麼]做|c[oó]mo\s+(deber[ií]amos|debo)/i,
    description: 'Design decision question',
    weight: 0.9,
  },
  // EN: trade-off, pros and cons, compare | KO: 장단점, 비교 | JA: トレードオフ, 比較 | ZH: 权衡, 比较 | ES: pros y contras, comparar
  {
    pattern:
      /\b(trade-?off|pros?\s+and\s+cons?|compare|versus|vs\.?)\b|장단점|트레이드오프|비교\s*분석|トレードオフ|メリット.*デメリット|比較|权衡|利弊|比较分析|pros\s+y\s+contras|comparar/i,
    description: 'Trade-off analysis',
    weight: 0.9,
  },
  // EN: multiple approaches/options | KO: 여러 방법 | JA: 複数のアプローチ | ZH: 多种方法 | ES: múltiples enfoques
  {
    pattern:
      /\b(multiple|several|different)\s+(approach|option|way|method)s?\b|(여러|다양한|다수의)\s*(방법|방식|접근|옵션)|複数の?(アプローチ|方法|選択肢)|多[种種](方法|方式|选择)|m[uú]ltiples\s+(enfoques?|opciones?|m[eé]todos?)/i,
    description: 'Multiple approaches',
    weight: 0.7,
  },

  // Multi-file/Module scope
  // EN: refactor, restructure | KO: 리팩토링 | JA: リファクタリング | ZH: 重构 | ES: refactorizar
  {
    pattern:
      /\b(refactor|restructure|reorganize|migrate)\b|리팩토링|리팩터링|구조\s*개선|재구성|リファクタリング|再構成|重构|重[構构]|refactorizar|reestructurar/i,
    description: 'Code restructuring',
    weight: 0.7,
  },
  // EN: across multiple files/modules | KO: 여러 파일 | JA: 複数のファイル | ZH: 多个文件 | ES: múltiples archivos
  {
    pattern:
      /\b(across|multiple|several)\s+(file|module|component|service)s?\b|(여러|다수의|전체)\s*(파일|모듈|컴포넌트|서비스)|複数の?(ファイル|モジュール|コンポーネント)|多[个個](文件|模[块塊]|组件)|m[uú]ltiples\s+(archivos?|m[oó]dulos?|componentes?)/i,
    description: 'Multi-file scope',
    weight: 0.8,
  },

  // Complex features
  // EN: implement feature/system | KO: 기능 구현 | JA: 機能を実装 | ZH: 实现功能 | ES: implementar funcionalidad
  {
    pattern:
      /\b(implement|build|create)\s+.{0,20}(feature|system|service|module)\b|(구현|개발|만들).{0,10}(기능|시스템|서비스|모듈)|(実装|構築).{0,10}(機能|システム)|实现.{0,10}(功能|系统)|implementar.{0,20}(funcionalidad|sistema|servicio)/i,
    description: 'Feature implementation',
    weight: 0.6,
  },
  // EN: state management, authentication | KO: 상태 관리, 인증 | JA: 状態管理, 認証 | ZH: 状态管理, 认证 | ES: gestión de estado, autenticación
  {
    pattern:
      /\b(state\s+management|authentication|authorization|auth\s+system|caching)\b|상태\s*관리|인증\s*시스템|권한\s*관리|캐싱|状態管理|認証|キャッシュ|状态管理|认证|缓存|gesti[oó]n\s+de\s+estado|autenticaci[oó]n/i,
    description: 'Complex domain',
    weight: 0.8,
  },

  // Performance & Security
  // EN: optimize, performance, security | KO: 최적화, 보안 | JA: 最適化, セキュリティ | ZH: 优化, 安全 | ES: optimizar, seguridad
  {
    pattern:
      /\b(optimiz|performance|security|scalab)\w*\b|최적화|성능\s*개선|보안|확장성|最適化|パフォーマンス|セキュリティ|优化|性能|安全|可扩展|optimizar|rendimiento|seguridad|escalabilidad/i,
    description: 'Performance/Security concern',
    weight: 0.7,
  },

  // Analysis & Planning
  // EN: analyze approach/strategy | KO: 분석, 검토 | JA: 分析, 検討 | ZH: 分析, 评估 | ES: analizar, evaluar
  {
    pattern:
      /\b(analyz|evaluat|assess|review)\w*\s+.{0,20}(approach|option|strategy)\b|(분석|검토|평가).{0,10}(방법|옵션|전략)|(分析|検討|評価).{0,10}(アプローチ|方法)|分析.{0,10}(方法|策略)|analizar.{0,20}(enfoque|opci[oó]n|estrategia)/i,
    description: 'Analysis required',
    weight: 0.8,
  },
  // EN: what's the best way | KO: 가장 좋은 방법 | JA: 最善の方法 | ZH: 最好的方法 | ES: la mejor manera
  {
    pattern:
      /\bwhat('s|\s+is)\s+the\s+best\s+(way|approach|practice)\b|가장\s*좋은\s*(방법|방식)|최선의\s*(접근|방법)|最善の?(方法|アプローチ)|ベストプラクティス|最好的(方法|做法)|最佳(实践|方式)|cu[aá]l\s+es\s+la\s+mejor\s+(manera|forma|pr[aá]ctica)/i,
    description: 'Best practice inquiry',
    weight: 0.7,
  },

  // Integration & Dependencies
  // EN: integrate service/API | KO: 통합, 연동 | JA: 統合, 連携 | ZH: 集成, 对接 | ES: integrar
  {
    pattern:
      /\b(integrat|connect|link)\w*\s+.{0,20}(service|api|system|module)\b|(통합|연동|연결).{0,10}(서비스|API|시스템)|(統合|連携).{0,10}(サービス|API)|集成.{0,10}(服务|API|系统)|integrar.{0,20}(servicio|API|sistema)/i,
    description: 'Integration task',
    weight: 0.6,
  },
  // EN: dependency, coupling | KO: 의존성, 결합도 | JA: 依存関係 | ZH: 依赖, 耦合 | ES: dependencia, acoplamiento
  {
    pattern:
      /\b(dependency|dependencies|coupling|decoupl)\w*\b|의존성|종속성|결합도|依存関係|結合度|依赖|耦合|dependencia|acoplamiento/i,
    description: 'Dependency management',
    weight: 0.7,
  },
];

/**
 * SIMPLE task indicators - patterns that suggest SRP can be skipped.
 *
 * Based on structured-reasoning-guide.md criteria:
 * - Single fact verification
 * - Definition or syntax questions
 * - Clear yes/no questions
 * - Single file modification
 * - No architectural impact
 * - No trade-off analysis needed
 *
 * @example
 * ```typescript
 * import { SIMPLE_INDICATORS } from './complexity-indicators';
 *
 * // Check if a prompt matches simple patterns
 * const simpleMatches = SIMPLE_INDICATORS.filter(i => i.pattern.test(prompt));
 * const simpleScore = simpleMatches.reduce((sum, i) => sum + i.weight, 0);
 * ```
 */
/**
 * Negation patterns that invalidate COMPLEX indicator matches.
 *
 * When a COMPLEX keyword is preceded (or followed for some languages)
 * by these patterns, the match should be discounted as a false positive.
 *
 * Supported Languages:
 * - English: don't, do not, no need, without, skip, avoid, not
 * - Korean: 하지 말, 안, 필요 없
 * - Japanese: しないで, しない, 必要ない
 * - Chinese: 不要, 不需要, 不
 * - Spanish: no, sin, evitar
 *
 * @example
 * ```typescript
 * // "don't refactor" should NOT match COMPLEX
 * // The negation pattern "don't" precedes "refactor"
 * const isNegated = isNegatedMatch(prompt, matchIndex, matchEnd);
 * ```
 */
export const NEGATION_PATTERNS_BEFORE: RegExp[] = [
  // English negations (prefix)
  /\b(don'?t|do\s+not|no\s+need\s+to|without|skip|avoid|not\s+going\s+to|won'?t|shouldn'?t|needn'?t)\s+$/i,
  // Chinese negations (prefix): 不要, 不需要
  /(不要|不需要|不用|别|無需|毋須)$/,
  // Spanish negations (prefix): no, sin, evitar
  /\b(no|sin|evitar|no\s+hay\s+que|no\s+necesita)\s+$/i,
];

export const NEGATION_PATTERNS_AFTER: RegExp[] = [
  // Korean negations (suffix): 하지 말, 안 해도, 필요 없
  /^.{0,5}(하지\s*말|안\s*해도|필요\s*없|하지\s*않|말고)/,
  // Japanese negations (suffix): しないで, 必要ない - often attached directly
  /^.{0,3}(しないで|しなくて|必要(ない|なし)|やめて|せずに)/,
];

// Legacy export for backwards compatibility
export const NEGATION_PATTERNS: RegExp[] = [
  ...NEGATION_PATTERNS_BEFORE,
  ...NEGATION_PATTERNS_AFTER,
];

/**
 * Check if a match position is negated by surrounding text.
 *
 * @param prompt - Full prompt text
 * @param matchIndex - Index where the pattern matched
 * @param matchEnd - End index of the match (optional, defaults to matchIndex + 10)
 * @returns true if the match is negated
 */
export function isNegatedMatch(prompt: string, matchIndex: number, matchEnd?: number): boolean {
  // Get text before the match (up to 30 chars for context)
  const contextStart = Math.max(0, matchIndex - 30);
  const textBefore = prompt.slice(contextStart, matchIndex);

  // Check prefix negations
  if (NEGATION_PATTERNS_BEFORE.some(pattern => pattern.test(textBefore))) {
    return true;
  }

  // Get text after the match (up to 15 chars for suffix negations)
  const end = matchEnd ?? matchIndex + 10;
  const contextEnd = Math.min(prompt.length, end + 15);
  const textAfter = prompt.slice(end, contextEnd);

  // Check suffix negations
  if (NEGATION_PATTERNS_AFTER.some(pattern => pattern.test(textAfter))) {
    return true;
  }

  return false;
}

export const SIMPLE_INDICATORS: ComplexityIndicator[] = [
  // Fact verification
  // EN: what is the type/syntax | KO: 타입이 뭐야 | JA: 型は何ですか | ZH: 类型是什么 | ES: cuál es el tipo
  {
    pattern:
      /\bwhat\s+(is|are)\s+(the\s+)?(type|return\s+type|syntax)\b|(타입|반환\s*타입|문법)이?\s*(뭐|무엇)|型は?(何|なん)|戻り値の?型|类型是什么|返回类型|语法|cu[aá]l\s+es\s+el\s+tipo|sintaxis/i,
    description: 'Type/syntax question',
    weight: 0.9,
  },
  // EN: does it work/exist | KO: 되나요, 있나요 | JA: 動きますか | ZH: 能用吗 | ES: funciona, existe
  {
    pattern:
      /\b(does|is|are|can|will)\s+.{0,30}\s*(exist|work|valid|correct)\b|(있|되|맞|정상)\s*(나요|는지|을까)|動(く|き)ますか|正しい(ですか)?|能用吗|有效吗|存在吗|funciona|existe|es\s+v[aá]lido/i,
    description: 'Yes/no verification',
    weight: 0.7,
  },

  // Definition questions
  // EN: how to declare/define | KO: 선언 어떻게 | JA: どう宣言 | ZH: 怎么声明 | ES: cómo declarar
  {
    pattern:
      /\bhow\s+(do|to)\s+(i\s+)?(declare|define|import|export)\b|(선언|정의|임포트|익스포트)\s*어떻게|どう(宣言|定義|インポート)|怎[么麼](声明|定义|导入)|c[oó]mo\s+(declarar|definir|importar|exportar)/i,
    description: 'Definition question',
    weight: 0.8,
  },
  // EN: show me an example | KO: 예제 보여줘 | JA: 例を見せて | ZH: 给个例子 | ES: muéstrame un ejemplo
  {
    pattern:
      /\b(show|give)\s+(me\s+)?(an?\s+)?example\b|예제\s*(보여|알려|줘)|例を?(見せて|示して)|给[个個]例子|举[个個]例|mu[eé]strame\s+un\s+ejemplo|dame\s+un\s+ejemplo/i,
    description: 'Example request',
    weight: 0.6,
  },

  // Single file operations
  // EN: fix typo/error | KO: 오타 수정 | JA: タイポ修正 | ZH: 修复错误 | ES: corregir error
  {
    pattern:
      /\b(fix|correct|update)\s+(the\s+)?(typo|error|bug|issue)\s+(in|at)\b|오타\s*(수정|고쳐)|에러\s*수정|버그\s*수정|タイポ(修正|を直)|誤字(修正|を直)|修[复復](错误|bug)|改正錯誤|corregir\s+(el\s+)?(error|typo|bug)/i,
    description: 'Single fix',
    weight: 0.8,
  },
  // EN: rename function/variable | KO: 이름 변경 | JA: 名前を変更 | ZH: 重命名 | ES: renombrar
  {
    pattern:
      /\b(rename|move)\s+(this\s+)?(file|function|variable|class)\b|이름\s*(변경|바꿔)|리네임|名前を?(変更|変える)|リネーム|重命名|改名|renombrar|cambiar\s+el\s+nombre/i,
    description: 'Rename operation',
    weight: 0.7,
  },
  // EN: add comment/log | KO: 주석 추가 | JA: コメント追加 | ZH: 添加注释 | ES: agregar comentario
  {
    pattern:
      /\badd\s+(a\s+)?(comment|log|print|console)\b|주석\s*(추가|달아)|로그\s*추가|コメント(追加|を追加)|ログ(追加|を追加)|添加(注释|日志)|加[个個](注释|日志)|agregar\s+(un\s+)?comentario|a[ñn]adir\s+log/i,
    description: 'Add comment/log',
    weight: 0.9,
  },

  // Simple modifications
  // EN: update version/value | KO: 버전 변경 | JA: バージョン更新 | ZH: 更新版本 | ES: actualizar versión
  {
    pattern:
      /\b(update|change|set)\s+(the\s+)?(version|value|name|label)\b|(버전|값|이름)\s*(변경|수정|바꿔)|バージョン(更新|を変更)|値を?(変更|更新)|更新(版本|值)|修改(版本|值)|actualizar\s+(la\s+)?(versi[oó]n|valor)/i,
    description: 'Simple update',
    weight: 0.6,
  },
  // EN: format, lint | KO: 포맷팅 | JA: フォーマット | ZH: 格式化 | ES: formatear
  {
    pattern:
      /\b(format|lint|prettify|indent)\b|포맷팅|포맷\s*정리|린트|정리|フォーマット|整形|リント|格式化|整理代码|formatear|dar\s+formato/i,
    description: 'Formatting',
    weight: 0.9,
  },
];
