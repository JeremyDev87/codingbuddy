import type { SkillKeywordConfig } from './keywords.types';

/**
 * Multi-language Keyword Registry
 *
 * Centralized keyword definitions for 5 languages:
 * - EN (English), KO (한국어), JA (日本語), ZH (中文), ES (Español)
 */
export const SKILL_KEYWORDS: SkillKeywordConfig[] = [
  // ============================================================================
  // DEBUGGING - Priority 25 (highest)
  // ============================================================================
  {
    skillName: 'systematic-debugging',
    priority: 25,
    description: 'Systematic approach to debugging',
    concepts: {
      error: {
        en: ['error', 'bug', 'issue', 'problem', 'exception', 'crash', 'failure'],
        ko: ['에러', '오류', '버그', '문제', '이슈', '장애', '예외'],
        ja: ['エラー', 'バグ', '問題', '障害', '例外'],
        zh: ['错误', 'bug', '问题', '异常', '故障'],
        es: ['error', 'bug', 'problema', 'fallo', 'excepción'],
      },
      not_working: {
        en: ['not working', "doesn't work", 'broken', 'failed', 'failing', 'stuck'],
        ko: ['안 돼', '안돼', '안되', '작동 안', '동작 안', '실패', '안 나와'],
        ja: ['動かない', '機能しない', '壊れた', '失敗'],
        zh: ['不工作', '不能用', '坏了', '失败'],
        es: ['no funciona', 'roto', 'fallido'],
      },
      fix: {
        en: ['fix', 'debug', 'solve', 'resolve', 'troubleshoot', 'investigate'],
        ko: ['고쳐', '수정해', '해결해', '디버그', '디버깅'],
        ja: ['直して', '修正', '解決', 'デバッグ'],
        zh: ['修复', '修正', '解决', '调试'],
        es: ['arreglar', 'solucionar', 'depurar', 'resolver'],
      },
      symptom: {
        en: ['slow', 'freeze', 'hang', 'timeout', 'memory leak'],
        ko: ['느려', '멈춰', '타임아웃', '메모리 누수'],
        ja: ['遅い', 'フリーズ', 'タイムアウト'],
        zh: ['慢', '卡住', '超时', '内存泄漏'],
        es: ['lento', 'congelado', 'tiempo de espera'],
      },
    },
  },

  // ============================================================================
  // INCIDENT RESPONSE - Priority 24
  // Just below systematic-debugging: organizational response before technical fixes
  // ============================================================================
  {
    skillName: 'incident-response',
    priority: 24,
    description: 'Systematic incident response for production issues',
    concepts: {
      incident: {
        en: [
          'incident',
          'outage',
          'downtime',
          'service disruption',
          'production issue',
          'system down',
          'service down',
        ],
        ko: ['인시던트', '장애', '다운타임', '서비스 중단', '운영 이슈', '시스템 장애'],
        ja: ['インシデント', '障害', 'ダウンタイム', 'サービス中断', '本番障害'],
        zh: ['事故', '故障', '停机', '服务中断', '生产问题', '系统故障'],
        es: ['incidente', 'interrupción', 'caída', 'problema de producción'],
      },
      severity: {
        en: [
          'P1',
          'P2',
          'P3',
          'P4',
          'SEV1',
          'SEV2',
          'critical incident',
          'major incident',
          'severity',
        ],
        ko: ['P1', 'P2', 'P3', 'P4', '심각도', '중요도', '긴급 장애'],
        ja: ['P1', 'P2', 'P3', 'P4', '深刻度', '緊急度', '重大障害'],
        zh: ['P1', 'P2', 'P3', 'P4', '严重性', '紧急程度', '重大事故'],
        es: ['P1', 'P2', 'P3', 'P4', 'severidad', 'incidente crítico'],
      },
      response: {
        en: [
          'incident response',
          'on-call',
          'oncall',
          'on-call rotation',
          'war room',
          'bridge call',
          'triage',
          'incident commander',
          'PagerDuty',
          'OpsGenie',
          'alerting',
          'pager',
          'alert fatigue',
        ],
        ko: [
          '인시던트 대응',
          '온콜',
          '온콜 로테이션',
          '워룸',
          '트리아지',
          '장애 대응',
          '페이저듀티',
          '옵스지니',
          '알림',
        ],
        ja: [
          'インシデント対応',
          'オンコール',
          'オンコールローテーション',
          'ウォールーム',
          'トリアージ',
          'PagerDuty',
          'OpsGenie',
          'アラート',
        ],
        zh: [
          '事故响应',
          '值班',
          '值班轮换',
          '作战室',
          '分诊',
          '事故指挥',
          'PagerDuty',
          'OpsGenie',
          '告警',
        ],
        es: [
          'respuesta a incidentes',
          'guardia',
          'rotación de guardia',
          'sala de guerra',
          'triaje',
          'PagerDuty',
          'OpsGenie',
          'alertas',
        ],
      },
      recovery: {
        en: [
          'rollback',
          'failover',
          'disaster recovery',
          'business continuity',
          'mitigation',
          'containment',
        ],
        ko: ['롤백', '페일오버', '재해 복구', '비즈니스 연속성', '완화', '격리'],
        ja: ['ロールバック', 'フェイルオーバー', '災害復旧', '事業継続', '軽減'],
        zh: ['回滚', '故障转移', '灾难恢复', '业务连续性', '缓解', '隔离'],
        es: ['rollback', 'failover', 'recuperación', 'continuidad', 'mitigación'],
      },
      postmortem: {
        en: [
          'postmortem',
          'post-mortem',
          'RCA',
          'root cause analysis',
          'incident review',
          'blameless',
          'retrospective',
        ],
        ko: ['포스트모템', '사후 분석', 'RCA', '근본 원인 분석', '장애 리뷰', '비난 없는'],
        ja: ['ポストモーテム', '事後分析', 'RCA', '根本原因分析', '障害レビュー'],
        zh: ['事后分析', 'RCA', '根因分析', '事故复盘', '无责分析'],
        es: ['postmortem', 'RCA', 'análisis de causa raíz', 'revisión', 'sin culpa'],
      },
    },
  },

  // ============================================================================
  // PERFORMANCE OPTIMIZATION - Priority 23
  // Just below incident-response: systematic profiling before optimization
  // ============================================================================
  {
    skillName: 'performance-optimization',
    priority: 23,
    description: 'Systematic performance optimization with profiling-first workflow',
    concepts: {
      performance: {
        en: ['slow', 'performance', 'optimize', 'speed up', 'faster', 'latency', 'throughput'],
        ko: ['느려', '성능', '최적화', '빠르게', '지연', '처리량'],
        ja: ['遅い', 'パフォーマンス', '最適化', '高速化', 'レイテンシ'],
        zh: ['慢', '性能', '优化', '加速', '延迟', '吞吐量'],
        es: ['lento', 'rendimiento', 'optimizar', 'acelerar', 'latencia'],
      },
      profiling: {
        en: ['profile', 'profiler', 'profiling', 'benchmark', 'measure', 'bottleneck', 'hot path'],
        ko: ['프로파일', '프로파일링', '벤치마크', '측정', '병목', '핫패스'],
        ja: ['プロファイル', 'ベンチマーク', '測定', 'ボトルネック'],
        zh: ['分析', '基准测试', '测量', '瓶颈', '热点路径'],
        es: ['perfilar', 'benchmark', 'medir', 'cuello de botella'],
      },
      metrics: {
        en: ['p95', 'p99', 'response time', 'load time', 'render time', 'memory usage'],
        ko: ['응답 시간', '로드 시간', '렌더 시간', '메모리 사용량'],
        ja: ['応答時間', 'ロード時間', 'レンダリング時間', 'メモリ使用量'],
        zh: ['响应时间', '加载时间', '渲染时间', '内存使用'],
        es: ['tiempo de respuesta', 'tiempo de carga', 'uso de memoria'],
      },
      regression: {
        en: ['performance regression', 'performance budget', 'performance test', 'perf test'],
        ko: ['성능 회귀', '성능 예산', '성능 테스트'],
        ja: ['パフォーマンス回帰', 'パフォーマンスバジェット', 'パフォーマンステスト'],
        zh: ['性能回归', '性能预算', '性能测试'],
        es: ['regresión de rendimiento', 'presupuesto de rendimiento'],
      },
    },
  },

  // ============================================================================
  // DATABASE MIGRATION - Priority 22
  // Below performance-optimization: systematic database changes require planning
  // ============================================================================
  {
    skillName: 'database-migration',
    priority: 22,
    description: 'Systematic database migration with zero-downtime patterns',
    concepts: {
      migration: {
        en: [
          'migration',
          'migrate',
          'schema change',
          'database migration',
          'data migration',
          'table migration',
        ],
        ko: [
          '마이그레이션',
          '스키마 변경',
          '데이터 마이그레이션',
          'DB 마이그레이션',
          '테이블 이전',
        ],
        ja: ['マイグレーション', 'スキーマ変更', 'データ移行', 'テーブル移行'],
        zh: ['迁移', '数据库迁移', '模式变更', '数据迁移', '表迁移'],
        es: ['migración', 'migrar', 'cambio de esquema', 'migración de datos'],
      },
      schema: {
        en: [
          'alter table',
          'add column',
          'drop column',
          'modify column',
          'rename column',
          'change type',
          'DDL',
        ],
        ko: ['컬럼 추가', '컬럼 삭제', '컬럼 수정', '컬럼 이름 변경', '타입 변경'],
        ja: ['カラム追加', 'カラム削除', 'カラム変更', 'タイプ変更'],
        zh: ['添加列', '删除列', '修改列', '重命名列', '类型变更'],
        es: ['agregar columna', 'eliminar columna', 'modificar columna'],
      },
      zero_downtime: {
        en: [
          'zero downtime',
          'online migration',
          'expand contract',
          'rolling migration',
          'blue green database',
          'shadow table',
        ],
        ko: ['무중단', '온라인 마이그레이션', '확장 수축 패턴', '롤링 마이그레이션'],
        ja: ['ゼロダウンタイム', 'オンライン移行', '拡張収縮パターン'],
        zh: ['零停机', '在线迁移', '扩展收缩模式', '滚动迁移'],
        es: ['cero tiempo de inactividad', 'migración en línea'],
      },
      large_scale: {
        en: ['large table', 'millions of rows', 'batch migration', 'bulk update', 'backfill'],
        ko: ['대용량 테이블', '수백만 행', '배치 마이그레이션', '대량 업데이트'],
        ja: ['大規模テーブル', '数百万行', 'バッチ移行', '一括更新'],
        zh: ['大表', '百万行', '批量迁移', '批量更新', '回填'],
        es: ['tabla grande', 'millones de filas', 'migración por lotes'],
      },
      rollback: {
        en: [
          'rollback migration',
          'revert migration',
          'undo migration',
          'migration rollback',
          'down migration',
        ],
        ko: ['롤백', '마이그레이션 롤백', '되돌리기', '마이그레이션 취소'],
        ja: ['ロールバック', '移行ロールバック', '元に戻す'],
        zh: ['回滚', '迁移回滚', '撤销迁移', '还原'],
        es: ['rollback', 'revertir migración', 'deshacer migración'],
      },
      validation: {
        en: [
          'data validation',
          'integrity check',
          'pre migration',
          'post migration',
          'verify migration',
        ],
        ko: ['데이터 검증', '무결성 검사', '마이그레이션 전 검증', '마이그레이션 후 검증'],
        ja: ['データ検証', '整合性チェック', '移行前検証', '移行後検証'],
        zh: ['数据验证', '完整性检查', '迁移前验证', '迁移后验证'],
        es: ['validación de datos', 'verificación de integridad'],
      },
    },
  },

  // ============================================================================
  // EXECUTING PLANS - Priority 22
  // ============================================================================
  {
    skillName: 'executing-plans',
    priority: 22,
    description: 'Execute implementation plans with checkpoints',
    concepts: {
      execute: {
        en: [
          'execute plan',
          'follow plan',
          'run plan',
          'implement plan',
          'start implementing',
          'begin implementation',
          'proceed with plan',
          'go ahead with',
          'lets do this',
          'lets start',
        ],
        ko: [
          '계획 실행',
          '플랜 실행',
          '실행해',
          '시작해',
          '진행해',
          '구현 시작',
          '작업 시작',
          '해보자',
          '시작하자',
          '바로 진행',
        ],
        ja: ['計画を実行', 'プランを実行', '始めよう', '実装開始'],
        zh: ['执行计划', '运行计划', '开始实现', '开始做'],
        es: ['ejecutar plan', 'seguir plan', 'empezar', 'comenzar'],
      },
      step_by_step: {
        en: ['step by step', 'one by one', 'sequentially', 'incrementally'],
        ko: ['순서대로', '하나씩', '차례로', '단계별로'],
        ja: ['順番に', '一つずつ', '段階的に'],
        zh: ['一步一步', '逐个', '按顺序', '逐步'],
        es: ['paso a paso', 'uno por uno', 'secuencialmente'],
      },
      checkpoint: {
        en: ['checkpoint', 'with review', 'check progress', 'verify each'],
        ko: ['체크포인트', '확인하면서', '점검하며', '검토하면서'],
        ja: ['チェックポイント', '確認しながら'],
        zh: ['检查点', '审查', '逐一检查'],
        es: ['checkpoint', 'revisión', 'verificar'],
      },
    },
  },

  // ============================================================================
  // PR REVIEW - Priority 22
  // Same priority as executing-plans: both are action-oriented execution skills
  // that guide a specific workflow rather than broad planning/brainstorming
  // ============================================================================
  {
    skillName: 'pr-review',
    priority: 22, // Matches executing-plans - specific action workflow skill
    description: 'Systematic PR review with anti-sycophancy principles',
    concepts: {
      review: {
        en: [
          'PR review',
          'pull request review',
          'review pull request',
          'code review',
          'review PR',
          'review MR',
          'merge request',
          'review this PR',
        ],
        ko: ['PR 리뷰', '풀리퀘스트 리뷰', '코드 리뷰', 'MR 리뷰', '검토해'],
        ja: ['PRレビュー', 'プルリクエストレビュー', 'コードレビュー'],
        zh: ['PR审查', '代码审查', '合并请求审查'],
        es: ['revisar PR', 'revisión de código', 'revisar pull request'],
      },
      approve: {
        en: ['approve PR', 'approve merge', 'LGTM', 'sign off on PR', 'merge approval'],
        ko: ['PR 승인', 'MR 승인', 'LGTM'],
        ja: ['PR承認', 'LGTM', 'マージ承認'],
        zh: ['批准PR', 'LGTM', '同意合并'],
        es: ['aprobar PR', 'aprobar merge', 'LGTM'],
      },
      critique: {
        en: ['request changes', 'find issues', 'critique', 'feedback on PR'],
        ko: ['수정 요청', '이슈 찾기', '피드백'],
        ja: ['修正要求', '問題を見つける', 'フィードバック'],
        zh: ['请求修改', '找问题', '反馈'],
        es: ['solicitar cambios', 'encontrar problemas', 'crítica'],
      },
      checklist: {
        en: ['security check', 'code quality check', 'review checklist'],
        ko: ['보안 점검', '코드 품질 체크', '리뷰 체크리스트'],
        ja: ['セキュリティチェック', 'コード品質チェック', 'レビューチェックリスト'],
        zh: ['安全检查', '代码质量检查', '审查清单'],
        es: ['verificación de seguridad', 'verificación de calidad', 'lista de verificación'],
      },
      efficiency: {
        en: ['review efficiency', 'time-boxing', 'review turnaround', 'PR too long'],
        ko: ['리뷰 효율', '타임박싱', '리뷰 속도'],
        ja: ['レビュー効率', 'タイムボックス', 'レビュー速度', 'PRが長すぎる'],
        zh: ['审查效率', '时间控制', '审查速度', 'PR太长', '審查效率', '時間控制'],
        es: ['eficiencia de revisión', 'tiempo de revisión', 'PR demasiado largo'],
      },
      feedback: {
        en: ['constructive feedback', 'review feedback', 'mentoring through reviews'],
        ko: ['건설적 피드백', '리뷰 피드백', '멘토링'],
        ja: ['建設的フィードバック', 'メンタリング', 'レビューフィードバック', 'メンター'],
        zh: ['建设性反馈', '指导', '反馈技巧', '建設性反饋', '指導'],
        es: ['feedback constructivo', 'mentoría en revisiones', 'retroalimentación de revisión'],
      },
      metrics: {
        en: ['review metrics', 'review tracking', 'escapees', 'review cycles'],
        ko: ['리뷰 지표', '리뷰 추적', '리뷰 사이클'],
        ja: ['レビュー指標', 'レビュー追跡', 'レビューサイクル'],
        zh: ['审查指标', '审查跟踪', '审查周期', '审查工具', '審查指標', '審查追蹤', '審查週期'],
        es: ['métricas de revisión', 'seguimiento de revisiones', 'ciclos de revisión'],
      },
    },
  },

  // ============================================================================
  // SECURITY AUDIT - Priority 22
  // Same priority as pr-review/executing-plans: mandatory action skill before shipping
  // ============================================================================
  {
    skillName: 'security-audit',
    priority: 22,
    description: 'OWASP Top 10 based security review, secrets scanning, auth/authz checks',
    concepts: {
      security: {
        en: [
          'security review',
          'security audit',
          'security check',
          'OWASP',
          'secure code',
          'security assessment',
        ],
        ko: ['보안 검토', '보안 감사', '보안 점검', '보안 리뷰', 'OWASP', '시큐리티 감사'],
        ja: ['セキュリティレビュー', 'セキュリティ監査', 'セキュリティチェック', 'OWASP'],
        zh: ['安全审查', '安全审计', '安全检查', 'OWASP', '安全评估'],
        es: ['revisión de seguridad', 'auditoría de seguridad', 'OWASP', 'evaluación de seguridad'],
      },
      vulnerability: {
        en: [
          'vulnerability',
          'vulnerabilities',
          'CVE',
          'exploit',
          'injection',
          'XSS',
          'CSRF',
          'SSRF',
          'SQL injection',
        ],
        ko: ['취약점', '취약성', 'CVE', '인젝션', 'SQL 인젝션', 'XSS', 'CSRF'],
        ja: ['脆弱性', 'CVE', 'インジェクション', 'SQLインジェクション', 'XSS'],
        zh: ['漏洞', 'CVE', '注入', 'SQL注入', 'XSS', 'CSRF', 'SSRF'],
        es: ['vulnerabilidad', 'vulnerabilidades', 'CVE', 'inyección', 'SQL injection', 'XSS'],
      },
      credentials: {
        en: [
          'hardcoded secret',
          'hardcoded secrets',
          'exposed credential',
          'API key leak',
          'token leak',
          'secrets scan',
        ],
        ko: ['하드코딩된 시크릿', '자격증명 노출', 'API 키 유출', '토큰 유출', '시크릿 스캔'],
        ja: ['ハードコードシークレット', '認証情報漏洩', 'APIキー漏洩', 'シークレットスキャン'],
        zh: ['硬编码密钥', '凭据泄露', 'API密钥泄露', 'token泄露', '密钥扫描'],
        es: [
          'secreto hardcodeado',
          'credencial expuesta',
          'fuga de API key',
          'escaneo de secretos',
        ],
      },
      auth: {
        en: [
          'authentication flaw',
          'authorization bypass',
          'access control',
          'broken auth',
          'privilege escalation',
        ],
        ko: ['인증 결함', '인가 우회', '접근 제어', '권한 상승', '인증 취약점'],
        ja: ['認証の欠陥', '認可バイパス', 'アクセス制御', '権限昇格'],
        zh: ['认证缺陷', '授权绕过', '访问控制', '权限提升'],
        es: [
          'fallo de autenticación',
          'bypass de autorización',
          'control de acceso',
          'escalación de privilegios',
        ],
      },
    },
  },

  // ============================================================================
  // DOCUMENTATION GENERATION - Priority 16
  // Above TDD (15): documentation is a concrete deliverable, not just process
  // ============================================================================
  {
    skillName: 'documentation-generation',
    priority: 16,
    description: 'Generate README, API docs, CHANGELOG, and ADRs from code',
    concepts: {
      readme: {
        en: ['README', 'write documentation', 'create documentation', 'technical documentation'],
        ko: ['README', '문서 작성', '기술 문서'],
        ja: [
          'README',
          'ドキュメント作成',
          'ドキュメントを作成',
          '技術文書',
          'ドキュメント生成',
          '文書化',
        ],
        zh: ['README', '写文档', '技术文档', '文档生成', '文档化'],
        es: ['README', 'escribir documentación', 'documentación técnica'],
      },
      api_docs: {
        en: [
          'API docs',
          'API documentation',
          'API reference',
          'generate docs',
          'generate documentation',
        ],
        ko: ['API 문서', 'API 레퍼런스', '문서 생성'],
        ja: ['APIドキュメント', 'APIリファレンス', 'ドキュメント生成'],
        zh: ['API文档', 'API参考', '生成文档'],
        es: ['documentación API', 'referencia API', 'generar documentación'],
      },
      changelog: {
        en: ['CHANGELOG', 'changelog', 'release notes', 'change log'],
        ko: ['CHANGELOG', '릴리즈 노트', '변경 이력'],
        ja: ['CHANGELOG', 'リリースノート', '変更履歴'],
        zh: ['CHANGELOG', '发布说明', '更新日志'],
        es: ['CHANGELOG', 'notas de versión', 'registro de cambios'],
      },
      adr: {
        en: ['ADR', 'architecture decision', 'decision record'],
        ko: ['ADR', '아키텍처 결정', '결정 기록'],
        ja: ['ADR', 'アーキテクチャ決定', '決定記録'],
        zh: ['ADR', '架构决策', '决策记录'],
        es: ['ADR', 'decisión de arquitectura', 'registro de decisión'],
      },
      document: {
        en: ['document this', 'document the', 'documenting'],
        ko: ['문서화'],
        ja: ['ドキュメント化'],
        zh: ['文档化'],
        es: ['documentar'],
      },
    },
  },

  // ============================================================================
  // CODE EXPLANATION - Priority 17
  // Above documentation-generation (16): understanding code is prerequisite to documenting
  // Below frontend-design (18): analysis skill, not creation skill
  // ============================================================================
  {
    skillName: 'code-explanation',
    priority: 17,
    description:
      "Structured code explanation from bird's eye to line-by-line for onboarding and reviews",
    concepts: {
      explain: {
        en: [
          'explain code',
          'explain this',
          'explain the',
          'code explanation',
          'walk me through',
          'walk through',
        ],
        ko: ['코드 설명', '설명해줘', '설명해 줘', '설명 부탁', '코드 분석'],
        ja: ['コード説明', '説明して', 'コードを説明', '解説して'],
        zh: ['解释代码', '代码解释', '讲解代码', '说明代码'],
        es: ['explicar código', 'explicar este', 'explicación de código'],
      },
      understand: {
        en: [
          'understand code',
          'understand this',
          'how does this work',
          'what does this do',
          'what is this code',
        ],
        ko: ['이해', '이게 뭐야', '어떻게 동작', '어떻게 작동', '뭐하는 코드'],
        ja: ['理解', 'どう動く', '何をする', 'これは何'],
        zh: ['理解代码', '这是什么', '怎么工作', '做什么的'],
        es: ['entender código', 'cómo funciona', 'qué hace esto'],
      },
      onboarding: {
        en: [
          'onboarding',
          'new to this',
          'unfamiliar',
          'codebase overview',
          'codebase tour',
          'getting started with code',
        ],
        ko: ['온보딩', '처음 보는', '익숙하지 않', '코드베이스 개요', '코드 투어'],
        ja: ['オンボーディング', '初めて見る', '不慣れ', 'コードベース概要'],
        zh: ['入职', '不熟悉', '代码库概览', '代码导览'],
        es: ['incorporación', 'nuevo en esto', 'desconocido', 'visión general del código'],
      },
      review_explanation: {
        en: ['code review explanation', 'analyze code', 'code analysis', 'code walkthrough'],
        ko: ['코드 리뷰 설명', '코드 워크스루', '분석해줘'],
        ja: ['コードレビュー説明', 'コード分析', 'コードウォークスルー'],
        zh: ['代码审查说明', '代码分析', '代码走查'],
        es: ['explicación de revisión', 'analizar código', 'análisis de código'],
      },
      architecture_explanation: {
        en: [
          'architecture overview',
          'system overview',
          'how is this organized',
          'project structure',
        ],
        ko: ['아키텍처 개요', '시스템 개요', '프로젝트 구조', '전체 구조'],
        ja: ['アーキテクチャ概要', 'システム概要', 'プロジェクト構造'],
        zh: ['架构概览', '系统概览', '项目结构', '整体结构'],
        es: ['visión general de arquitectura', 'visión del sistema', 'estructura del proyecto'],
      },
    },
  },

  // ============================================================================
  // WRITING PLANS - Priority 20
  // ============================================================================
  {
    skillName: 'writing-plans',
    priority: 20,
    description: 'Create implementation plans',
    concepts: {
      plan: {
        en: ['plan', 'roadmap', 'schedule', 'milestone'],
        ko: ['계획', '플랜', '일정', '로드맵', '마일스톤'],
        ja: ['計画', 'ロードマップ', 'スケジュール'],
        zh: ['计划', '路线图', '日程', '里程碑'],
        es: ['plan', 'cronograma', 'hoja de ruta'],
      },
      complex: {
        en: ['complex', 'large', 'big project', 'major', 'significant'],
        ko: ['복잡', '대규모', '큰 작업', '대형'],
        ja: ['複雑', '大規模', '大きなプロジェクト'],
        zh: ['复杂', '大型', '重大', '大项目'],
        es: ['complejo', 'grande', 'mayor', 'significativo'],
      },
      architecture: {
        en: ['architecture', 'structure', 'design', 'blueprint'],
        ko: ['아키텍처', '구조', '설계'],
        ja: ['アーキテクチャ', '構造', '設計'],
        zh: ['架构', '结构', '设计'],
        es: ['arquitectura', 'estructura', 'diseño'],
      },
      refactor: {
        en: ['refactor', 'restructure', 'reorganize'],
        ko: ['리팩토링', '재구성', '재구조화'],
        ja: ['リファクタリング', '再構成'],
        zh: ['重构', '重组', '重新设计'],
        es: ['refactorizar', 'reestructurar'],
      },
    },
  },

  // ============================================================================
  // FRONTEND DESIGN - Priority 18
  // ============================================================================
  {
    skillName: 'frontend-design',
    priority: 18,
    description: 'Build production-grade UI components',
    concepts: {
      ui_element: {
        en: ['button', 'form', 'input', 'modal', 'popup', 'dropdown', 'menu', 'tab', 'card'],
        ko: ['버튼', '폼', '입력', '모달', '팝업', '드롭다운', '메뉴', '탭', '카드'],
        ja: [
          'ボタン',
          'フォーム',
          '入力',
          'モーダル',
          'ポップアップ',
          'ドロップダウン',
          'メニュー',
          'タブ',
          'カード',
        ],
        zh: ['按钮', '表单', '输入', '模态框', '弹窗', '下拉菜单', '菜单', '标签', '卡片'],
        es: [
          'botón',
          'formulario',
          'entrada',
          'modal',
          'popup',
          'menú desplegable',
          'menú',
          'pestaña',
          'tarjeta',
        ],
      },
      component: {
        en: ['component', 'widget', 'element'],
        ko: ['컴포넌트', '위젯', '요소'],
        ja: ['コンポーネント', 'ウィジェット'],
        zh: ['组件', '控件', '元素'],
        es: ['componente', 'widget', 'elemento'],
      },
      page: {
        en: ['page', 'screen', 'view', 'dashboard', 'landing'],
        ko: ['페이지', '화면', '뷰', '대시보드', '랜딩'],
        ja: ['ページ', '画面', 'ビュー', 'ダッシュボード'],
        zh: ['页面', '屏幕', '视图', '仪表板', '落地页'],
        es: ['página', 'pantalla', 'vista', 'panel', 'landing'],
      },
      style: {
        en: ['style', 'CSS', 'layout', 'design', 'Tailwind'],
        ko: ['스타일', '레이아웃', '디자인', '예쁘게', '꾸며'],
        ja: ['スタイル', 'レイアウト', 'デザイン'],
        zh: ['样式', '布局', '设计', '美化'],
        es: ['estilo', 'diseño', 'disposición'],
      },
      responsive: {
        en: ['responsive', 'mobile', 'desktop', 'media query'],
        ko: ['반응형', '모바일', '데스크톱'],
        ja: ['レスポンシブ', 'モバイル', 'デスクトップ'],
        zh: ['响应式', '移动端', '桌面端', '媒体查询'],
        es: ['responsivo', 'móvil', 'escritorio'],
      },
    },
  },

  // ============================================================================
  // TECH-DEBT - Priority 19
  // Strategic assessment tool: identify, catalog, prioritize, and plan debt paydown
  // Above frontend-design (18), below writing-plans (20)
  // ============================================================================
  {
    skillName: 'tech-debt',
    priority: 19,
    description: 'Debt identification, ROI-based prioritization, and incremental paydown planning',
    concepts: {
      debt_assessment: {
        en: [
          'technical debt',
          'tech debt',
          'debt assessment',
          'debt analysis',
          'code health',
          'tech health review',
          'code health check',
          'code rot',
          'code decay',
        ],
        ko: [
          '기술 부채',
          '기술부채',
          '부채 평가',
          '부채 분석',
          '코드 건강',
          '기술 건강성',
          '코드 건강 점검',
        ],
        ja: [
          '技術的負債',
          '技術負債',
          '負債評価',
          '負債分析',
          'コード健全性',
          '技術健全性レビュー',
          'コード健全性チェック',
        ],
        zh: ['技术债务', '技术债', '债务评估', '债务分析', '代码健康', '代码健康检查'],
        es: [
          'deuda técnica',
          'deuda tecnológica',
          'evaluación de deuda',
          'análisis de deuda',
          'salud del código',
          'revisión de salud técnica',
        ],
      },
      debt_prioritization: {
        en: [
          'debt prioritization',
          'debt priority',
          'ROI prioritization',
          'velocity impact',
          'bug risk',
          'priority score',
          'debt paydown',
          'pay down debt',
          'pay off debt',
        ],
        ko: [
          '부채 우선순위',
          'ROI 우선순위',
          '속도 영향',
          '버그 리스크',
          '우선순위 점수',
          '부채 상환',
          '부채 해소',
        ],
        ja: [
          '負債優先順位',
          'ROI優先順位',
          '速度影響',
          'バグリスク',
          '優先度スコア',
          '負債返済',
          '負債解消',
        ],
        zh: [
          '债务优先级',
          'ROI优先级',
          '速度影响',
          '缺陷风险',
          '优先级评分',
          '偿还债务',
          '消除债务',
        ],
        es: [
          'priorización de deuda',
          'prioridad de deuda',
          'priorización ROI',
          'impacto en velocidad',
          'riesgo de bugs',
          'puntaje de prioridad',
          'pagar deuda',
        ],
      },
      debt_tracking: {
        en: [
          'debt register',
          'debt catalog',
          'debt inventory',
          'debt tracking',
          'sprint capacity',
          'quarterly tech review',
          'quarterly debt review',
          'maintainability',
        ],
        ko: [
          '부채 레지스터',
          '부채 목록',
          '부채 인벤토리',
          '부채 추적',
          '스프린트 용량',
          '분기 기술 리뷰',
          '분기 부채 리뷰',
          '유지보수성',
        ],
        ja: [
          '負債レジスター',
          '負債カタログ',
          '負債インベントリ',
          '負債追跡',
          'スプリント容量',
          '四半期技術レビュー',
          '四半期負債レビュー',
          '保守性',
        ],
        zh: [
          '债务登记',
          '债务目录',
          '债务清单',
          '债务跟踪',
          '冲刺容量',
          '季度技术审查',
          '季度债务审查',
          '可维护性',
        ],
        es: [
          'registro de deuda',
          'catálogo de deuda',
          'inventario de deuda',
          'seguimiento de deuda',
          'capacidad de sprint',
          'revisión trimestral técnica',
          'revisión trimestral de deuda',
          'mantenibilidad',
        ],
      },
    },
  },

  // ============================================================================
  // REFACTORING - Priority 21
  // Above writing-plans (20) - execution skill should win over planning skill
  // Structured workflow skill for code improvement without behavior change
  // ============================================================================
  {
    skillName: 'refactoring',
    priority: 21,
    description: 'Structured, test-driven refactoring workflow with Tidy First principles',
    concepts: {
      refactor_action: {
        en: [
          'refactor',
          'refactoring',
          'restructure',
          'reorganize code',
          'improve code structure',
          'clean up code',
          'tidy code',
          'tidy up',
          'execute refactor',
          'apply refactoring',
          'do refactoring',
          'perform refactoring',
        ],
        ko: [
          '리팩토링',
          '리팩터링',
          '코드 정리',
          '코드 개선',
          '구조 개선',
          '정리해줘',
          '깔끔하게',
          '리팩토링 실행',
          '리팩토링 적용',
        ],
        ja: [
          'リファクタリング',
          'コード整理',
          'コード改善',
          '構造改善',
          '整理して',
          'リファクタリング実行',
          'リファクタリング適用',
        ],
        zh: [
          '重构',
          '代码重构',
          '代码整理',
          '结构优化',
          '代码改进',
          '整理代码',
          '执行重构',
          '应用重构',
        ],
        es: [
          'refactorizar',
          'refactoring',
          'reorganizar código',
          'limpiar código',
          'mejorar estructura',
          'ejecutar refactorización',
          'aplicar refactorización',
        ],
      },
      code_smell: {
        en: [
          'code smell',
          'long method',
          'long function',
          'duplicate code',
          'duplicated code',
          'large class',
          'feature envy',
          'primitive obsession',
          'god class',
          'spaghetti code',
        ],
        ko: ['코드 스멜', '긴 메서드', '긴 함수', '중복 코드', '큰 클래스', '스파게티 코드'],
        ja: [
          'コードスメル',
          '長いメソッド',
          '長い関数',
          '重複コード',
          '大きいクラス',
          'スパゲッティコード',
        ],
        zh: ['代码异味', '长方法', '长函数', '重复代码', '大类', '上帝类', '意大利面代码'],
        es: [
          'code smell',
          'método largo',
          'función larga',
          'código duplicado',
          'clase grande',
          'código espagueti',
        ],
      },
      extract: {
        en: [
          'extract method',
          'extract function',
          'extract class',
          'extract component',
          'extract hook',
          'pull out',
          'separate',
        ],
        ko: ['메서드 추출', '함수 추출', '클래스 추출', '컴포넌트 추출', '훅 추출', '분리해'],
        ja: ['メソッド抽出', '関数抽出', 'クラス抽出', 'コンポーネント抽出', '分離'],
        zh: ['提取方法', '提取函数', '提取类', '提取组件', '分离'],
        es: ['extraer método', 'extraer función', 'extraer clase', 'extraer componente', 'separar'],
      },
    },
  },

  // ============================================================================
  // TEST-DRIVEN DEVELOPMENT - Priority 15
  // ============================================================================
  {
    skillName: 'test-driven-development',
    priority: 15,
    description: 'Test-driven development workflow',
    concepts: {
      tdd: {
        en: ['TDD', 'test first', 'red green', 'test driven'],
        ko: ['TDD', '테스트 먼저', '레드 그린'],
        ja: ['TDD', 'テストファースト', 'レッドグリーン'],
        zh: ['TDD', '测试先行', '红绿'],
        es: ['TDD', 'test primero', 'rojo verde'],
      },
      test: {
        en: ['test', 'spec', 'unit test', 'integration test', 'e2e'],
        ko: ['테스트', '스펙', '유닛 테스트', '통합 테스트'],
        ja: ['テスト', 'スペック', 'ユニットテスト', '統合テスト'],
        zh: ['测试', '单元测试', '集成测试', '端到端'],
        es: ['test', 'prueba', 'prueba unitaria', 'prueba de integración'],
      },
      coverage: {
        en: ['coverage', 'test coverage'],
        ko: ['커버리지', '테스트 범위'],
        ja: ['カバレッジ', 'テストカバレッジ'],
        zh: ['覆盖率', '测试覆盖'],
        es: ['cobertura', 'cobertura de pruebas'],
      },
      verify: {
        en: ['verify', 'validate', 'assert'],
        ko: ['검증', '확인'],
        ja: ['検証', 'バリデーション'],
        zh: ['验证', '断言'],
        es: ['verificar', 'validar'],
      },
    },
  },

  // ============================================================================
  // PARALLEL AGENTS - Priority 12
  // ============================================================================
  {
    skillName: 'dispatching-parallel-agents',
    priority: 12,
    description: 'Handle parallel independent tasks',
    concepts: {
      parallel: {
        en: [
          'parallel',
          'concurrent',
          'simultaneously',
          'at the same time',
          'in parallel',
          'all at once',
          'together',
        ],
        ko: ['동시에', '병렬', '함께', '한꺼번에', '동시 실행', '같이'],
        ja: ['並列', '同時に', '並行', '一斉に'],
        zh: ['并行', '同时', '并发', '一起'],
        es: ['paralelo', 'concurrente', 'simultáneo', 'a la vez'],
      },
      multiple: {
        en: [
          'multiple',
          'several',
          'batch',
          'many tasks',
          'these tasks',
          'all of these',
          'each of these',
        ],
        ko: ['여러 개', '다수', '배치', '여러 작업', '이것들', '모두', '각각'],
        ja: ['複数', 'バッチ', '多数', 'これら全て'],
        zh: ['多个', '批量', '许多任务', '这些', '全部'],
        es: ['múltiple', 'varios', 'lote', 'todos estos'],
      },
      independent: {
        en: ['independent', 'separate', 'different tasks'],
        ko: ['독립적', '별개의', '다른 작업'],
        ja: ['独立', '別々の', '異なるタスク'],
        zh: ['独立', '分开的', '不同的任务'],
        es: ['independiente', 'separado', 'diferentes tareas'],
      },
    },
  },

  // ============================================================================
  // SUBAGENT DEVELOPMENT - Priority 12
  // ============================================================================
  {
    skillName: 'subagent-driven-development',
    priority: 12,
    description: 'Execute plans in current session using background agents',
    concepts: {
      subagent: {
        en: [
          'subagent',
          'sub-agent',
          'background agent',
          'helper agent',
          'delegate task',
          'spawn agent',
        ],
        ko: ['서브에이전트', '하위 에이전트', '백그라운드 에이전트', '작업 위임', '에이전트 생성'],
        ja: ['サブエージェント', 'バックグラウンドエージェント'],
        zh: ['子代理', '子智能体', '后台代理', '委托任务'],
        es: ['subagente', 'sub-agente', 'agente de fondo'],
      },
      session: {
        en: ['current session', 'this session', 'same conversation', 'without switching'],
        ko: ['현재 세션', '이 세션', '같은 대화', '전환 없이'],
        ja: ['現在のセッション', 'このセッション', '同じ会話'],
        zh: ['当前会话', '本次会话', '同一对话'],
        es: ['sesión actual', 'esta sesión', 'misma conversación'],
      },
      autonomous: {
        en: ['autonomous', 'independently', 'without my input', 'on your own'],
        ko: ['자율적으로', '독립적으로', '알아서', '스스로'],
        ja: ['自律的に', '独立して', '自動で'],
        zh: ['自主', '独立', '自动'],
        es: ['autónomo', 'independiente', 'por tu cuenta'],
      },
    },
  },

  // ============================================================================
  // BRAINSTORMING - Priority 10 (lowest, most general)
  // ============================================================================
  {
    skillName: 'brainstorming',
    priority: 10,
    description: 'Explore requirements before implementation',
    concepts: {
      create: {
        en: ['create', 'build', 'make', 'develop', 'implement'],
        ko: ['만들어', '생성해', '개발해', '구현해'],
        ja: ['作成', '作って', '開発', '実装'],
        zh: ['创建', '开发', '做', '实现'],
        es: ['crear', 'construir', 'hacer', 'desarrollar'],
      },
      add: {
        en: ['add', 'write', 'include'],
        ko: ['추가해', '작성해', '넣어'],
        ja: ['追加', '書いて'],
        zh: ['添加', '写', '加入'],
        es: ['añadir', 'escribir', 'incluir'],
      },
      new: {
        en: ['new', 'from scratch', 'fresh'],
        ko: ['새로운', '신규', '처음부터'],
        ja: ['新しい', 'ゼロから'],
        zh: ['新的', '从头开始', '全新'],
        es: ['nuevo', 'desde cero'],
      },
      idea: {
        en: ['idea', 'how to', 'approach', 'best practice'],
        ko: ['아이디어', '어떻게', '방법', '좋은 방법'],
        ja: ['アイデア', 'どうやって', '方法'],
        zh: ['想法', '怎么', '方法', '最佳实践'],
        es: ['idea', 'cómo', 'enfoque', 'mejor práctica'],
      },
      improve: {
        en: ['improve', 'enhance', 'upgrade', 'optimize'],
        ko: ['개선해', '향상', '업그레이드', '최적화'],
        ja: ['改善', '向上', 'アップグレード'],
        zh: ['改进', '提升', '升级', '优化'],
        es: ['mejorar', 'optimizar', 'actualizar'],
      },
    },
  },
];
