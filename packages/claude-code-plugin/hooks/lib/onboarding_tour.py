"""First-run onboarding tour for CodingBuddy.

Detects first-run via ~/.codingbuddy/onboarded flag file and renders
an interactive 3-step tour introducing core features.
"""
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from buddy_renderer import (
    ANSI_COLORS,
    BUDDY_FACE,
    DEFAULT_BUDDY_CONFIG,
    get_buddy_config,
    render_face_banner,
    render_section_header,
)
from data_dir import resolve_data_dir


def _onboarded_dir() -> str:
    return resolve_data_dir()


def _onboarded_flag() -> str:
    return os.path.join(_onboarded_dir(), "onboarded")

# Environment variable to skip tour
SKIP_ENV_VAR = "CODINGBUDDY_SKIP_TOUR"


def is_first_run() -> bool:
    """Check if this is the user's first run.

    Returns:
        True if onboarded flag does not exist and skip env var is not set.
    """
    if os.environ.get(SKIP_ENV_VAR):
        return False
    return not os.path.isfile(_onboarded_flag())


def mark_onboarded() -> None:
    """Create the onboarded flag file to prevent future tours."""
    os.makedirs(_onboarded_dir(), exist_ok=True)
    Path(_onboarded_flag()).touch()


# ── i18n Tour Content ──────────────────────────────────────────────

TOUR_WELCOME: Dict[str, str] = {
    "en": "Welcome to CodingBuddy! Here's a quick tour...",
    "ko": "CodingBuddy에 오신 걸 환영해요! 간단히 소개할게요...",
    "ja": "CodingBuddyへようこそ！簡単にご紹介します...",
    "zh": "欢迎使用CodingBuddy！快速介绍一下...",
    "es": "Bienvenido a CodingBuddy! Un tour rapido...",
}

TOUR_STEPS: Dict[int, Dict[str, Dict[str, str]]] = {
    1: {
        "en": {
            "title": "PLAN/ACT/EVAL Workflow",
            "body": "Type PLAN to design, ACT to implement, EVAL to review — or AUTO for the full cycle.",
            "example": 'PLAN add user authentication',
        },
        "ko": {
            "title": "PLAN/ACT/EVAL 워크플로우",
            "body": "PLAN으로 설계, ACT로 구현, EVAL로 검토 — 또는 AUTO로 전체 사이클을 실행하세요.",
            "example": 'PLAN 사용자 인증 추가',
        },
        "ja": {
            "title": "PLAN/ACT/EVAL ワークフロー",
            "body": "PLANで設計、ACTで実装、EVALでレビュー — またはAUTOで全サイクル実行。",
            "example": 'PLAN ユーザー認証を追加',
        },
        "zh": {
            "title": "PLAN/ACT/EVAL 工作流",
            "body": "用PLAN设计、ACT实现、EVAL审查 — 或AUTO执行完整周期。",
            "example": 'PLAN 添加用户认证',
        },
        "es": {
            "title": "Flujo PLAN/ACT/EVAL",
            "body": "PLAN para disenar, ACT para implementar, EVAL para revisar — o AUTO para el ciclo completo.",
            "example": 'PLAN agregar autenticacion',
        },
    },
    2: {
        "en": {
            "title": "38 Specialist Agents",
            "body": "Security, accessibility, performance... experts ready to analyze your code.",
            "example": 'AUTO implement login page',
        },
        "ko": {
            "title": "38명의 전문가 에이전트",
            "body": "보안, 접근성, 성능... 전문가들이 코드 분석을 도와줍니다.",
            "example": 'AUTO 로그인 페이지 구현',
        },
        "ja": {
            "title": "38人の専門エージェント",
            "body": "セキュリティ、アクセシビリティ、パフォーマンス...専門家がコード分析をサポート。",
            "example": 'AUTO ログインページを実装',
        },
        "zh": {
            "title": "38位专家代理",
            "body": "安全、无障碍、性能...专家随时准备分析您的代码。",
            "example": 'AUTO 实现登录页面',
        },
        "es": {
            "title": "38 Agentes Especialistas",
            "body": "Seguridad, accesibilidad, rendimiento... expertos listos para analizar tu codigo.",
            "example": 'AUTO implementar pagina de login',
        },
    },
    3: {
        "en": {
            "title": "Checklists & Skills",
            "body": "Auto-generated quality checklists and specialized skills for every task.",
            "example": 'EVAL review my changes',
        },
        "ko": {
            "title": "체크리스트 & 스킬",
            "body": "자동 생성되는 품질 체크리스트와 모든 작업을 위한 전문 스킬.",
            "example": 'EVAL 변경사항 검토',
        },
        "ja": {
            "title": "チェックリスト & スキル",
            "body": "自動生成の品質チェックリストと各タスク向けの専門スキル。",
            "example": 'EVAL 変更をレビュー',
        },
        "zh": {
            "title": "清单 & 技能",
            "body": "自动生成质量清单和每个任务的专业技能。",
            "example": 'EVAL 审查我的更改',
        },
        "es": {
            "title": "Listas & Habilidades",
            "body": "Listas de calidad auto-generadas y habilidades especializadas para cada tarea.",
            "example": 'EVAL revisar mis cambios',
        },
    },
}

def get_tour_skip_message(lang: str) -> str:
    """Generate skip message with actual data dir path."""
    data_dir = resolve_data_dir()
    templates = {
        "en": f"Skip future tours: touch {data_dir}/onboarded",
        "ko": f"투어 건너뛰기: touch {data_dir}/onboarded",
        "ja": f"ツアーをスキップ: touch {data_dir}/onboarded",
        "zh": f"跳过教程: touch {data_dir}/onboarded",
        "es": f"Saltar tour: touch {data_dir}/onboarded",
    }
    return templates.get(lang, templates["en"])

TOUR_HEADER: Dict[str, str] = {
    "en": "Quick Tour",
    "ko": "퀵 투어",
    "ja": "クイックツアー",
    "zh": "快速导览",
    "es": "Tour Rapido",
}

# Step number circled digits
_STEP_NUMBERS = {1: "\u2460", 2: "\u2461", 3: "\u2462"}


# ── Suggestion Templates (i18n) ───────────────────────────────────

_SUGGESTION_TEMPLATES: Dict[str, Dict[str, Dict[str, str]]] = {
    "low_coverage": {
        "en": {
            "mode": "AUTO",
            "prompt": "AUTO improve test coverage",
            "reason": "Test coverage is {coverage}%",
        },
        "ko": {
            "mode": "AUTO",
            "prompt": "AUTO 테스트 커버리지 개선",
            "reason": "테스트 커버리지가 {coverage}%입니다",
        },
        "ja": {
            "mode": "AUTO",
            "prompt": "AUTO テストカバレッジを改善",
            "reason": "テストカバレッジは{coverage}%です",
        },
        "zh": {
            "mode": "AUTO",
            "prompt": "AUTO 提高测试覆盖率",
            "reason": "测试覆盖率为{coverage}%",
        },
        "es": {
            "mode": "AUTO",
            "prompt": "AUTO mejorar cobertura de tests",
            "reason": "Cobertura de tests es {coverage}%",
        },
    },
    "no_coverage_with_files": {
        "en": {
            "mode": "PLAN",
            "prompt": "PLAN add test coverage for the project",
            "reason": "{file_count} source files with no test coverage data",
        },
        "ko": {
            "mode": "PLAN",
            "prompt": "PLAN 프로젝트 테스트 커버리지 추가",
            "reason": "{file_count}개 소스 파일에 테스트 커버리지 데이터 없음",
        },
        "ja": {
            "mode": "PLAN",
            "prompt": "PLAN プロジェクトのテストカバレッジを追加",
            "reason": "{file_count}個のソースファイルにテストカバレッジデータなし",
        },
        "zh": {
            "mode": "PLAN",
            "prompt": "PLAN 添加项目测试覆盖率",
            "reason": "{file_count}个源文件没有测试覆盖率数据",
        },
        "es": {
            "mode": "PLAN",
            "prompt": "PLAN agregar cobertura de tests al proyecto",
            "reason": "{file_count} archivos fuente sin datos de cobertura",
        },
    },
    "api_endpoints": {
        "en": {
            "mode": "EVAL",
            "prompt": "EVAL review API security",
            "reason": "{api_endpoints} API endpoint(s) to review",
        },
        "ko": {
            "mode": "EVAL",
            "prompt": "EVAL API 보안 검토",
            "reason": "{api_endpoints}개 API 엔드포인트 검토 필요",
        },
        "ja": {
            "mode": "EVAL",
            "prompt": "EVAL APIセキュリティをレビュー",
            "reason": "{api_endpoints}個のAPIエンドポイントをレビュー",
        },
        "zh": {
            "mode": "EVAL",
            "prompt": "EVAL 审查API安全",
            "reason": "{api_endpoints}个API端点需要审查",
        },
        "es": {
            "mode": "EVAL",
            "prompt": "EVAL revisar seguridad de API",
            "reason": "{api_endpoints} endpoint(s) de API para revisar",
        },
    },
}

# Framework-specific suggestion templates
_FRAMEWORK_SUGGESTIONS: Dict[str, Dict[str, Dict[str, str]]] = {
    "Next.js": {
        "en": {
            "prompt": "PLAN add Server Components optimization",
            "reason": "Next.js project detected",
        },
        "ko": {
            "prompt": "PLAN Server Components 최적화 추가",
            "reason": "Next.js 프로젝트 감지됨",
        },
        "ja": {
            "prompt": "PLAN Server Components最適化を追加",
            "reason": "Next.jsプロジェクトを検出",
        },
        "zh": {
            "prompt": "PLAN 添加Server Components优化",
            "reason": "检测到Next.js项目",
        },
        "es": {
            "prompt": "PLAN agregar optimizacion de Server Components",
            "reason": "Proyecto Next.js detectado",
        },
    },
    "NestJS": {
        "en": {
            "prompt": "PLAN add API validation with class-validator",
            "reason": "NestJS project detected",
        },
        "ko": {
            "prompt": "PLAN class-validator로 API 유효성 검증 추가",
            "reason": "NestJS 프로젝트 감지됨",
        },
        "ja": {
            "prompt": "PLAN class-validatorでAPIバリデーションを追加",
            "reason": "NestJSプロジェクトを検出",
        },
        "zh": {
            "prompt": "PLAN 使用class-validator添加API验证",
            "reason": "检测到NestJS项目",
        },
        "es": {
            "prompt": "PLAN agregar validacion de API con class-validator",
            "reason": "Proyecto NestJS detectado",
        },
    },
    "Vue": {
        "en": {
            "prompt": "PLAN add Composition API refactoring",
            "reason": "Vue project detected",
        },
        "ko": {
            "prompt": "PLAN Composition API 리팩토링 추가",
            "reason": "Vue 프로젝트 감지됨",
        },
        "ja": {
            "prompt": "PLAN Composition APIリファクタリングを追加",
            "reason": "Vueプロジェクトを検出",
        },
        "zh": {
            "prompt": "PLAN 添加Composition API重构",
            "reason": "检测到Vue项目",
        },
        "es": {
            "prompt": "PLAN agregar refactorizacion de Composition API",
            "reason": "Proyecto Vue detectado",
        },
    },
    "React": {
        "en": {
            "prompt": "PLAN optimize React component performance",
            "reason": "React project detected",
        },
        "ko": {
            "prompt": "PLAN React 컴포넌트 성능 최적화",
            "reason": "React 프로젝트 감지됨",
        },
        "ja": {
            "prompt": "PLAN Reactコンポーネントパフォーマンスを最適化",
            "reason": "Reactプロジェクトを検出",
        },
        "zh": {
            "prompt": "PLAN 优化React组件性能",
            "reason": "检测到React项目",
        },
        "es": {
            "prompt": "PLAN optimizar rendimiento de componentes React",
            "reason": "Proyecto React detectado",
        },
    },
}

_GENERIC_FALLBACK: Dict[str, List[Dict[str, str]]] = {
    "en": [
        {"mode": "PLAN", "prompt": "PLAN add user authentication", "reason": "Common starting point for new projects"},
    ],
    "ko": [
        {"mode": "PLAN", "prompt": "PLAN 사용자 인증 추가", "reason": "새 프로젝트의 일반적인 시작점"},
    ],
    "ja": [
        {"mode": "PLAN", "prompt": "PLAN ユーザー認証を追加", "reason": "新規プロジェクトの一般的な出発点"},
    ],
    "zh": [
        {"mode": "PLAN", "prompt": "PLAN 添加用户认证", "reason": "新项目的常见起点"},
    ],
    "es": [
        {"mode": "PLAN", "prompt": "PLAN agregar autenticacion de usuario", "reason": "Punto de partida comun para nuevos proyectos"},
    ],
}


def generate_suggestions(
    scan_result: Dict[str, Any],
    language: str = "en",
) -> List[Dict[str, str]]:
    """Generate project-specific prompt suggestions from scan data.

    Maps scanner findings (coverage, framework, endpoints, file count)
    to mode-specific prompt templates. Falls back to generic suggestions
    when scan data is insufficient.

    Args:
        scan_result: Output from project_scanner.scan_project().
        language: Language code (en, ko, ja, zh, es).

    Returns:
        List of suggestion dicts, each with keys: mode, prompt, reason.
    """
    suggestions: List[Dict[str, str]] = []
    lang = language if language in ("en", "ko", "ja", "zh", "es") else "en"

    coverage = scan_result.get("coverage")
    framework = scan_result.get("framework", "")
    api_endpoints = scan_result.get("api_endpoints", 0)
    file_count = scan_result.get("file_count", 0)

    # Low coverage → AUTO improve
    if coverage is not None and coverage < 80:
        tpl = _SUGGESTION_TEMPLATES["low_coverage"].get(lang, _SUGGESTION_TEMPLATES["low_coverage"]["en"])
        suggestions.append({
            "mode": tpl["mode"],
            "prompt": tpl["prompt"],
            "reason": tpl["reason"].format(coverage=coverage),
        })

    # Files exist but no coverage data → suggest adding tests
    if coverage is None and file_count > 0:
        tpl = _SUGGESTION_TEMPLATES["no_coverage_with_files"].get(lang, _SUGGESTION_TEMPLATES["no_coverage_with_files"]["en"])
        suggestions.append({
            "mode": tpl["mode"],
            "prompt": tpl["prompt"],
            "reason": tpl["reason"].format(file_count=file_count),
        })

    # Framework detected → PLAN framework-specific feature
    if framework:
        for fw_key, fw_tpl in _FRAMEWORK_SUGGESTIONS.items():
            if fw_key in framework:
                tpl = fw_tpl.get(lang, fw_tpl["en"])
                suggestions.append({
                    "mode": "PLAN",
                    "prompt": tpl["prompt"],
                    "reason": tpl["reason"],
                })
                break

    # API endpoints → EVAL security review
    if api_endpoints > 0:
        tpl = _SUGGESTION_TEMPLATES["api_endpoints"].get(lang, _SUGGESTION_TEMPLATES["api_endpoints"]["en"])
        suggestions.append({
            "mode": tpl["mode"],
            "prompt": tpl["prompt"],
            "reason": tpl["reason"].format(api_endpoints=api_endpoints),
        })

    # Fallback to generic if no project-specific suggestions
    if not suggestions:
        fallback = _GENERIC_FALLBACK.get(lang, _GENERIC_FALLBACK["en"])
        suggestions.extend(fallback)

    return suggestions


def _get_text(mapping: Dict[str, str], language: str) -> str:
    """Get localized text with English fallback."""
    return mapping.get(language, mapping.get("en", ""))


def _get_step(step_num: int, language: str) -> Dict[str, str]:
    """Get localized step content with English fallback."""
    step = TOUR_STEPS.get(step_num, {})
    return step.get(language, step.get("en", {}))


def render_onboarding_tour(
    language: str = "en",
    buddy_config: Optional[Dict[str, str]] = None,
    scan_result: Optional[Dict[str, Any]] = None,
) -> str:
    """Render the complete onboarding tour output.

    When scan_result is provided, step examples are replaced with
    project-specific prompt suggestions from generate_suggestions().

    Args:
        language: Language code (en, ko, ja, zh, es).
        buddy_config: Optional buddy customization from get_buddy_config().
        scan_result: Optional project scan data for context-aware suggestions.

    Returns:
        Formatted onboarding tour string.
    """
    bc = buddy_config or DEFAULT_BUDDY_CONFIG
    face = bc.get("face", BUDDY_FACE)
    welcome = _get_text(TOUR_WELCOME, language)

    cyan = ANSI_COLORS["cyan"]
    yellow = ANSI_COLORS["yellow"]
    green = ANSI_COLORS["green"]
    magenta = ANSI_COLORS["magenta"]
    reset = ANSI_COLORS["reset"]

    # Generate project-specific suggestions if scan data available
    suggestions = generate_suggestions(scan_result, language) if scan_result else []

    lines = [
        *render_face_banner(face, f"{cyan}{welcome}{reset}"),
        "",
        render_section_header(_get_text(TOUR_HEADER, language), min_tail=6),
    ]

    for step_num in (1, 2, 3):
        step = _get_step(step_num, language)
        if not step:
            continue
        circled = _STEP_NUMBERS.get(step_num, str(step_num))
        title = step.get("title", "")
        body = step.get("body", "")
        example = step.get("example", "")

        # Replace example with project-specific suggestion if available
        suggestion_idx = step_num - 1
        if suggestions and suggestion_idx < len(suggestions):
            s = suggestions[suggestion_idx]
            example = s["prompt"]
            body_suffix = f" ({s['reason']})"
            body = body + body_suffix

        lines.append(f"")
        lines.append(f"  {yellow}{circled}{reset} {green}{title}{reset}")
        lines.append(f"     {body}")
        if example:
            lines.append(f"     {magenta}\U0001f4a1 {example}{reset}")

    lines.append("")
    lines.append(f"\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501")
    lines.append(f"\U0001f4ac {get_tour_skip_message(language)}")

    return "\n".join(lines)
