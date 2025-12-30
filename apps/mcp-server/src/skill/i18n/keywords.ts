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
        en: [
          'error',
          'bug',
          'issue',
          'problem',
          'exception',
          'crash',
          'failure',
        ],
        ko: ['에러', '오류', '버그', '문제', '이슈', '장애', '예외'],
        ja: ['エラー', 'バグ', '問題', '障害', '例外'],
        zh: ['错误', 'bug', '问题', '异常', '故障'],
        es: ['error', 'bug', 'problema', 'fallo', 'excepción'],
      },
      not_working: {
        en: [
          'not working',
          "doesn't work",
          'broken',
          'failed',
          'failing',
          'stuck',
        ],
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
  // EXECUTING PLANS - Priority 22
  // ============================================================================
  {
    skillName: 'executing-plans',
    priority: 22,
    description: 'Execute implementation plans with checkpoints',
    concepts: {
      execute: {
        en: ['execute plan', 'follow plan', 'run plan', 'implement plan'],
        ko: ['계획 실행', '플랜 실행', '실행해'],
        ja: ['計画を実行', 'プランを実行'],
        zh: ['执行计划', '运行计划'],
        es: ['ejecutar plan', 'seguir plan'],
      },
      step_by_step: {
        en: ['step by step', 'one by one', 'sequentially'],
        ko: ['순서대로', '하나씩', '차례로'],
        ja: ['順番に', '一つずつ'],
        zh: ['一步一步', '逐个', '按顺序'],
        es: ['paso a paso', 'uno por uno'],
      },
      checkpoint: {
        en: ['checkpoint', 'with review'],
        ko: ['체크포인트', '확인하면서'],
        ja: ['チェックポイント'],
        zh: ['检查点', '审查'],
        es: ['checkpoint', 'revisión'],
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
        en: [
          'button',
          'form',
          'input',
          'modal',
          'popup',
          'dropdown',
          'menu',
          'tab',
          'card',
        ],
        ko: [
          '버튼',
          '폼',
          '입력',
          '모달',
          '팝업',
          '드롭다운',
          '메뉴',
          '탭',
          '카드',
        ],
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
        zh: [
          '按钮',
          '表单',
          '输入',
          '模态框',
          '弹窗',
          '下拉菜单',
          '菜单',
          '标签',
          '卡片',
        ],
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
        en: ['parallel', 'concurrent', 'simultaneously', 'at the same time'],
        ko: ['동시에', '병렬', '함께', '한꺼번에'],
        ja: ['並列', '同時に', '並行'],
        zh: ['并行', '同时', '并发'],
        es: ['paralelo', 'concurrente', 'simultáneo'],
      },
      multiple: {
        en: ['multiple', 'several', 'batch', 'many tasks'],
        ko: ['여러 개', '다수', '배치', '여러 작업'],
        ja: ['複数', 'バッチ', '多数'],
        zh: ['多个', '批量', '许多任务'],
        es: ['múltiple', 'varios', 'lote'],
      },
    },
  },

  // ============================================================================
  // SUBAGENT DEVELOPMENT - Priority 12
  // ============================================================================
  {
    skillName: 'subagent-driven-development',
    priority: 12,
    description: 'Execute plans in current session',
    concepts: {
      subagent: {
        en: ['subagent', 'sub-agent'],
        ko: ['서브에이전트', '하위 에이전트'],
        ja: ['サブエージェント'],
        zh: ['子代理', '子智能体'],
        es: ['subagente', 'sub-agente'],
      },
      session: {
        en: ['current session', 'this session'],
        ko: ['현재 세션', '이 세션'],
        ja: ['現在のセッション', 'このセッション'],
        zh: ['当前会话', '本次会话'],
        es: ['sesión actual', 'esta sesión'],
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
