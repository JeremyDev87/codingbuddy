#!/usr/bin/env python3
"""
Unit tests for user-prompt-submit.py

Run with: python3 -m pytest test_user_prompt_submit.py -v
"""

import json
import subprocess
import sys
from pathlib import Path

# Import the module under test
import importlib.util
spec = importlib.util.spec_from_file_location("hook", Path(__file__).parent / "user-prompt-submit.py")
hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook)


class TestDetectMode:
    """Tests for detect_mode function."""

    # English keywords
    def test_detects_plan_english(self):
        assert hook.detect_mode("PLAN: test something") == "PLAN"

    def test_detects_plan_lowercase(self):
        assert hook.detect_mode("plan: test something") == "PLAN"

    def test_detects_act_english(self):
        assert hook.detect_mode("ACT: execute this") == "ACT"

    def test_detects_eval_english(self):
        assert hook.detect_mode("EVAL: review code") == "EVAL"

    def test_detects_auto_english(self):
        assert hook.detect_mode("AUTO: build feature") == "AUTO"

    # Korean keywords
    def test_detects_plan_korean(self):
        assert hook.detect_mode("계획: 한글 테스트") == "PLAN"

    def test_detects_act_korean(self):
        assert hook.detect_mode("실행: 구현하기") == "ACT"

    def test_detects_eval_korean(self):
        assert hook.detect_mode("평가: 코드 리뷰") == "EVAL"

    def test_detects_auto_korean(self):
        assert hook.detect_mode("자동: 자동 실행") == "AUTO"

    # Japanese keywords
    def test_detects_plan_japanese(self):
        assert hook.detect_mode("計画: 日本語テスト") == "PLAN"

    def test_detects_act_japanese(self):
        assert hook.detect_mode("実行: テスト") == "ACT"

    def test_detects_eval_japanese(self):
        assert hook.detect_mode("評価: レビュー") == "EVAL"

    def test_detects_auto_japanese(self):
        assert hook.detect_mode("自動: 自動実行") == "AUTO"

    # Chinese keywords
    def test_detects_plan_chinese(self):
        assert hook.detect_mode("计划: 中文测试") == "PLAN"

    def test_detects_act_chinese(self):
        assert hook.detect_mode("执行: 测试") == "ACT"

    def test_detects_eval_chinese(self):
        assert hook.detect_mode("评估: 评审") == "EVAL"

    def test_detects_auto_chinese(self):
        assert hook.detect_mode("自动: 自动执行") == "AUTO"

    # Spanish keywords
    def test_detects_plan_spanish(self):
        assert hook.detect_mode("PLANIFICAR: prueba") == "PLAN"

    def test_detects_act_spanish(self):
        assert hook.detect_mode("ACTUAR: ejecutar") == "ACT"

    def test_detects_eval_spanish(self):
        assert hook.detect_mode("EVALUAR: revisar") == "EVAL"

    def test_detects_auto_spanish(self):
        assert hook.detect_mode("AUTOMÁTICO: construir") == "AUTO"

    # No keyword cases
    def test_returns_none_for_regular_message(self):
        assert hook.detect_mode("Hello world") is None

    def test_returns_none_when_keyword_in_middle(self):
        assert hook.detect_mode("I want to PLAN something") is None

    def test_returns_none_for_question_about_plan(self):
        assert hook.detect_mode("What is the PLAN?") is None

    def test_returns_none_for_empty_string(self):
        assert hook.detect_mode("") is None

    # Edge cases
    def test_handles_whitespace_before_keyword(self):
        assert hook.detect_mode("  PLAN: with leading spaces") == "PLAN"

    def test_handles_space_instead_of_colon(self):
        assert hook.detect_mode("PLAN something without colon") == "PLAN"

    def test_handles_mixed_case(self):
        assert hook.detect_mode("Plan: mixed case") == "PLAN"


class TestMainFunction:
    """Integration tests for the main hook function."""

    def _run_hook(self, prompt, env_extra=None):
        """Helper to run hook subprocess with optional env overrides."""
        import os as _os

        hook_path = Path(__file__).parent / "user-prompt-submit.py"
        input_data = json.dumps({"prompt": prompt})
        env = _os.environ.copy()
        if env_extra:
            env.update(env_extra)
        return subprocess.run(
            [sys.executable, str(hook_path)],
            input=input_data,
            capture_output=True,
            text=True,
            env=env,
        )

    def test_outputs_context_when_plan_detected(self):
        """Test that mode instructions are output when PLAN keyword is detected."""
        result = self._run_hook("PLAN: test feature")

        assert result.returncode == 0
        assert "# Mode: PLAN" in result.stdout

    def test_no_output_when_no_keyword(self):
        """Test that no output when no keyword is detected."""
        result = self._run_hook("Hello, how are you?")

        assert result.returncode == 0
        assert result.stdout == ""

    def test_handles_invalid_json(self):
        """Test that invalid JSON is handled gracefully."""
        hook_path = Path(__file__).parent / "user-prompt-submit.py"
        result = subprocess.run(
            [sys.executable, str(hook_path)],
            input="not valid json",
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0

    def test_handles_missing_prompt_field(self):
        """Test that missing prompt field is handled gracefully."""
        result = self._run_hook("")
        assert result.returncode == 0


class TestMcpVsStandaloneOutput:
    """Tests for MCP vs standalone output branching (#1214)."""

    def _run_hook_with_home(self, prompt, home_dir):
        """Run hook with a custom HOME to control MCP detection."""
        import os as _os

        hook_path = Path(__file__).parent / "user-prompt-submit.py"
        input_data = json.dumps({"prompt": prompt})
        env = _os.environ.copy()
        env["HOME"] = str(home_dir)
        # Prevent env override from interfering
        env.pop("CODINGBUDDY_RULES_DIR", None)
        return subprocess.run(
            [sys.executable, str(hook_path)],
            input=input_data,
            capture_output=True,
            text=True,
            env=env,
        )

    def test_standalone_outputs_enriched_instructions(self):
        """Standalone mode: full ModeEngine output with agent info."""
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            # No .claude/mcp.json → standalone
            claude_dir = Path(tmpdir) / ".claude"
            claude_dir.mkdir()

            result = self._run_hook_with_home("PLAN: test", tmpdir)
            assert result.returncode == 0
            assert "# Mode: PLAN" in result.stdout
            # Standalone should include full template content
            assert "technical-planner" in result.stdout

    def test_mcp_outputs_minimal(self):
        """MCP mode: minimal output, delegate to parse_mode."""
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            # Create mcp.json with codingbuddy entry → MCP mode
            claude_dir = Path(tmpdir) / ".claude"
            claude_dir.mkdir()
            mcp_json = claude_dir / "mcp.json"
            mcp_json.write_text(json.dumps({
                "mcpServers": {
                    "codingbuddy": {"command": "codingbuddy", "args": ["mcp"]}
                }
            }))

            result = self._run_hook_with_home("PLAN: test", tmpdir)
            assert result.returncode == 0
            assert "# Mode: PLAN" in result.stdout
            assert "mcp__codingbuddy__parse_mode" in result.stdout
            # MCP mode should NOT have full template content
            assert "Checklist:" not in result.stdout

    def test_no_output_without_keyword(self):
        """No mode keyword → no output regardless of MCP status."""
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            claude_dir = Path(tmpdir) / ".claude"
            claude_dir.mkdir()

            result = self._run_hook_with_home("Hello world", tmpdir)
            assert result.returncode == 0
            assert result.stdout == ""

    def test_claude_project_dir_env_overrides_cwd(self):
        """CLAUDE_PROJECT_DIR env set to dir with mcp.json → MCP output even when cwd differs (#1236)."""
        import tempfile
        import os as _os

        with tempfile.TemporaryDirectory() as project_dir, \
             tempfile.TemporaryDirectory() as cwd_dir:
            # Set up MCP config in project_dir
            claude_dir = Path(project_dir) / ".claude"
            claude_dir.mkdir()
            mcp_json = claude_dir / "mcp.json"
            mcp_json.write_text(json.dumps({
                "mcpServers": {
                    "codingbuddy": {"command": "codingbuddy", "args": ["mcp"]}
                }
            }))

            hook_path = Path(__file__).parent / "user-prompt-submit.py"
            input_data = json.dumps({"prompt": "PLAN: test"})
            env = _os.environ.copy()
            env["HOME"] = cwd_dir  # HOME has no mcp.json
            env["CLAUDE_PROJECT_DIR"] = project_dir
            env.pop("CODINGBUDDY_RULES_DIR", None)

            result = subprocess.run(
                [sys.executable, str(hook_path)],
                input=input_data,
                capture_output=True,
                text=True,
                env=env,
                cwd=cwd_dir,  # cwd differs from project_dir
            )

            assert result.returncode == 0
            assert "# Mode: PLAN" in result.stdout
            assert "mcp__codingbuddy__parse_mode" in result.stdout

    def test_claude_project_dir_with_project_mcp_json(self):
        """CLAUDE_PROJECT_DIR with project-level .mcp.json → MCP detection (#1236)."""
        import tempfile
        import os as _os

        with tempfile.TemporaryDirectory() as project_dir, \
             tempfile.TemporaryDirectory() as cwd_dir:
            # Set up project-level .mcp.json (not ~/.claude/mcp.json)
            mcp_json = Path(project_dir) / ".mcp.json"
            mcp_json.write_text(json.dumps({
                "mcpServers": {
                    "codingbuddy": {"command": "codingbuddy", "args": ["mcp"]}
                }
            }))

            hook_path = Path(__file__).parent / "user-prompt-submit.py"
            input_data = json.dumps({"prompt": "ACT: test"})
            env = _os.environ.copy()
            env["HOME"] = cwd_dir
            env["CLAUDE_PROJECT_DIR"] = project_dir
            env.pop("CODINGBUDDY_RULES_DIR", None)

            result = subprocess.run(
                [sys.executable, str(hook_path)],
                input=input_data,
                capture_output=True,
                text=True,
                env=env,
                cwd=cwd_dir,
            )

            assert result.returncode == 0
            assert "# Mode: ACT" in result.stdout
            assert "mcp__codingbuddy__parse_mode" in result.stdout


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
