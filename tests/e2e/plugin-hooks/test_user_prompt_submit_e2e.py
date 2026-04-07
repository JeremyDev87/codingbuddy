"""E2E tests for the UserPromptSubmit (mode detection) hook.

Verifies:
- Mode keyword detection for all supported languages
- Context injection with correct mode name
- Non-mode prompts produce no output
- Hook always exits 0
"""
import json

import pytest

from cli_mock import run_hook, MockEnvironment


class TestModeDetectionNeverBlocks:
    """UserPromptSubmit must NEVER block Claude Code."""

    def test_exits_zero_with_normal_prompt(self, mock_env):
        result = run_hook(
            "user-prompt-submit.py",
            input_data={"prompt": "Help me fix a bug"},
            env=mock_env,
        )
        assert result.succeeded

    def test_exits_zero_with_empty_prompt(self, mock_env):
        result = run_hook(
            "user-prompt-submit.py",
            input_data={"prompt": ""},
            env=mock_env,
        )
        assert result.succeeded

    def test_exits_zero_with_missing_prompt(self, mock_env):
        result = run_hook(
            "user-prompt-submit.py",
            input_data={},
            env=mock_env,
        )
        assert result.succeeded


class TestEnglishModeKeywords:
    """Detect English mode keywords: PLAN, ACT, EVAL, AUTO."""

    @pytest.mark.parametrize("keyword,mode", [
        ("PLAN design auth feature for login.ts", "PLAN"),
        ("ACT implement the auth changes in login.ts", "ACT"),
        ("EVAL review the auth.ts implementation", "EVAL"),
        ("AUTO implement user dashboard in dashboard.tsx", "AUTO"),
    ])
    def test_detects_english_keyword(self, mock_env, keyword, mode):
        result = run_hook(
            "user-prompt-submit.py",
            input_data={"prompt": keyword},
            env=mock_env,
        )
        assert result.succeeded
        assert f"# Mode: {mode}" in result.stdout

    def test_no_detection_for_normal_prompt(self, mock_env):
        result = run_hook(
            "user-prompt-submit.py",
            input_data={"prompt": "Fix the login button"},
            env=mock_env,
        )
        assert result.succeeded
        assert "# Mode:" not in result.stdout


class TestKoreanModeKeywords:
    """Detect Korean mode keywords."""

    @pytest.mark.parametrize("keyword,mode", [
        ("계획 login.ts 인증 기능 설계", "PLAN"),
        ("실행 auth.ts 인증 변경 사항 구현", "ACT"),
        ("평가 login.ts 인증 코드 리뷰", "EVAL"),
        ("자동 dashboard.tsx 대시보드 구현", "AUTO"),
    ])
    def test_detects_korean_keyword(self, mock_env, keyword, mode):
        result = run_hook(
            "user-prompt-submit.py",
            input_data={"prompt": keyword},
            env=mock_env,
        )
        assert result.succeeded
        assert f"# Mode: {mode}" in result.stdout


class TestJapaneseModeKeywords:
    """Detect Japanese mode keywords."""

    @pytest.mark.parametrize("keyword,mode", [
        ("計画 auth.ts 認証機能の設計", "PLAN"),
        ("実行 auth.ts 変更の実装", "ACT"),
        ("評価 login.ts コードレビュー", "EVAL"),
        ("自動 dashboard.tsx ダッシュボード実装", "AUTO"),
    ])
    def test_detects_japanese_keyword(self, mock_env, keyword, mode):
        result = run_hook(
            "user-prompt-submit.py",
            input_data={"prompt": keyword},
            env=mock_env,
        )
        assert result.succeeded
        assert f"# Mode: {mode}" in result.stdout


class TestChineseModeKeywords:
    """Detect Chinese mode keywords."""

    @pytest.mark.parametrize("keyword,mode", [
        ("计划 auth.ts 设计认证功能", "PLAN"),
        ("执行 auth.ts 实施认证变更", "ACT"),
        ("评估 login.ts 代码审查", "EVAL"),
        ("自动 dashboard.tsx 实现仪表板", "AUTO"),
    ])
    def test_detects_chinese_keyword(self, mock_env, keyword, mode):
        result = run_hook(
            "user-prompt-submit.py",
            input_data={"prompt": keyword},
            env=mock_env,
        )
        assert result.succeeded
        assert f"# Mode: {mode}" in result.stdout


class TestSpanishModeKeywords:
    """Detect Spanish mode keywords."""

    @pytest.mark.parametrize("keyword,mode", [
        ("PLANIFICAR diseñar autenticación en auth.ts", "PLAN"),
        ("ACTUAR implementar cambios en login.ts", "ACT"),
        ("EVALUAR revisar código en auth.ts", "EVAL"),
        ("AUTOMÁTICO implementar dashboard en dashboard.tsx", "AUTO"),
    ])
    def test_detects_spanish_keyword(self, mock_env, keyword, mode):
        result = run_hook(
            "user-prompt-submit.py",
            input_data={"prompt": keyword},
            env=mock_env,
        )
        assert result.succeeded
        assert f"# Mode: {mode}" in result.stdout


class TestContextInjection:
    """Verify self-contained mode instructions are injected."""

    def test_context_contains_parse_mode_hint(self, mock_env):
        result = run_hook(
            "user-prompt-submit.py",
            input_data={"prompt": "PLAN design a new feature"},
            env=mock_env,
        )
        assert "# Mode: PLAN" in result.stdout
        assert "parse_mode" in result.stdout

    def test_context_contains_agent_name(self, mock_env):
        result = run_hook(
            "user-prompt-submit.py",
            input_data={"prompt": "AUTO implement feature in auth.ts"},
            env=mock_env,
        )
        assert "# Mode: AUTO" in result.stdout

    def test_case_insensitive_detection(self, mock_env):
        """Keywords should be detected case-insensitively."""
        result = run_hook(
            "user-prompt-submit.py",
            input_data={"prompt": "plan design something for auth.ts"},
            env=mock_env,
        )
        assert result.succeeded
        assert "# Mode: PLAN" in result.stdout
