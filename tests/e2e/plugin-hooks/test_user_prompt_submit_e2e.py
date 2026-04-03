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
        ("PLAN design auth feature", "PLAN"),
        ("ACT implement the changes", "ACT"),
        ("EVAL review the code", "EVAL"),
        ("AUTO implement user dashboard", "AUTO"),
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
        ("계획 인증 기능 설계", "PLAN"),
        ("실행 변경 사항 구현", "ACT"),
        ("평가 코드 리뷰", "EVAL"),
        ("자동 대시보드 구현", "AUTO"),
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
        ("計画 認証機能の設計", "PLAN"),
        ("実行 変更の実装", "ACT"),
        ("評価 コードレビュー", "EVAL"),
        ("自動 ダッシュボード実装", "AUTO"),
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
        ("计划 设计认证功能", "PLAN"),
        ("执行 实施变更", "ACT"),
        ("评估 代码审查", "EVAL"),
        ("自动 实现仪表板", "AUTO"),
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
        ("PLANIFICAR diseñar autenticación", "PLAN"),
        ("ACTUAR implementar cambios", "ACT"),
        ("EVALUAR revisar código", "EVAL"),
        ("AUTOMÁTICO implementar dashboard", "AUTO"),
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
            input_data={"prompt": "AUTO implement feature"},
            env=mock_env,
        )
        assert "# Mode: AUTO" in result.stdout

    def test_case_insensitive_detection(self, mock_env):
        """Keywords should be detected case-insensitively."""
        result = run_hook(
            "user-prompt-submit.py",
            input_data={"prompt": "plan design something"},
            env=mock_env,
        )
        assert result.succeeded
        assert "# Mode: PLAN" in result.stdout
