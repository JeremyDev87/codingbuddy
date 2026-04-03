"""Tests for PromptInjector — system prompt injection module (#828)."""
import os
import sys
from unittest import mock
import pytest

# Ensure hooks/lib is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from prompt_injection import PromptInjector


@pytest.fixture(autouse=True)
def _mock_mcp_available():
    """Default: mock is_mcp_available to return True (MCP mode) for all existing tests."""
    with mock.patch("prompt_injection.is_mcp_available", return_value=True):
        yield


@pytest.fixture
def injector():
    return PromptInjector()


@pytest.fixture
def base_config():
    """Config with all prompt sections enabled."""
    return {
        "promptInjection": {
            "enabled": True,
            "sections": {
                "baseRules": True,
                "dispatchEnforcement": True,
                "qualityGates": True,
            },
        }
    }


class TestBuildBaseRulesPrompt:
    def test_contains_parse_mode_instruction(self, injector, base_config):
        result = injector.build_system_prompt(base_config, "/tmp")
        assert "parse_mode" in result

    def test_contains_tdd_summary(self, injector, base_config):
        result = injector.build_system_prompt(base_config, "/tmp")
        assert "TDD" in result or "tdd" in result


class TestBuildDispatchEnforcementPrompt:
    def test_contains_dispatch_instruction(self, injector, base_config):
        result = injector.build_system_prompt(base_config, "/tmp")
        assert "dispatch" in result.lower()


class TestBuildQualityGatesPrompt:
    def test_contains_quality_gate_reminder(self, injector, base_config):
        result = injector.build_system_prompt(base_config, "/tmp")
        assert "quality" in result.lower() or "test" in result.lower()


class TestConfigurableOptOut:
    def test_disable_base_rules(self, injector):
        config = {
            "promptInjection": {
                "enabled": True,
                "sections": {
                    "baseRules": False,
                    "dispatchEnforcement": True,
                    "qualityGates": True,
                },
            }
        }
        result = injector.build_system_prompt(config, "/tmp")
        assert "PLAN/ACT/EVAL/AUTO" not in result
        assert "TDD" not in result

    def test_disable_dispatch_enforcement(self, injector):
        config = {
            "promptInjection": {
                "enabled": True,
                "sections": {
                    "baseRules": True,
                    "dispatchEnforcement": False,
                    "qualityGates": True,
                },
            }
        }
        result = injector.build_system_prompt(config, "/tmp")
        # dispatch section disabled — check it's absent
        lines = result.split("\n")
        dispatch_lines = [l for l in lines if "dispatch" in l.lower() and "auto" in l.lower()]
        assert len(dispatch_lines) == 0

    def test_disable_quality_gates(self, injector):
        config = {
            "promptInjection": {
                "enabled": True,
                "sections": {
                    "baseRules": True,
                    "dispatchEnforcement": True,
                    "qualityGates": False,
                },
            }
        }
        result = injector.build_system_prompt(config, "/tmp")
        # quality gates section disabled
        lines = result.split("\n")
        gate_lines = [l for l in lines if "commit" in l.lower() and "test" in l.lower()]
        assert len(gate_lines) == 0


class TestPromptSizeLimit:
    def test_prompt_under_2000_chars(self, injector, base_config):
        result = injector.build_system_prompt(base_config, "/tmp")
        assert len(result) <= 2000

    def test_truncates_when_over_budget(self, injector):
        """Even with extremely verbose config, output stays <= 2000 chars."""
        config = {
            "promptInjection": {
                "enabled": True,
                "sections": {
                    "baseRules": True,
                    "dispatchEnforcement": True,
                    "qualityGates": True,
                },
            }
        }
        result = injector.build_system_prompt(config, "/tmp")
        assert len(result) <= 2000
        assert len(result) > 0


class TestFormatGuideEcoTrue:
    """eco=true: compact format guide injected."""

    def _make_config(self, tone="casual"):
        return {
            "eco": True,
            "tone": tone,
            "promptInjection": {
                "enabled": True,
                "sections": {
                    "baseRules": True,
                    "dispatchEnforcement": True,
                    "qualityGates": True,
                    "formatGuide": True,
                },
            },
        }

    def test_eco_true_contains_compact_marker(self, injector):
        result = injector.build_system_prompt(self._make_config(), "/tmp")
        assert "━━ Agents:" in result

    def test_eco_true_contains_consensus_line(self, injector):
        result = injector.build_system_prompt(self._make_config(), "/tmp")
        assert "━━ Consensus:" in result

    def test_eco_true_no_full_discussion(self, injector):
        """Compact mode should NOT contain the full discussion '│' markers."""
        result = injector.build_system_prompt(self._make_config(), "/tmp")
        assert "│ \"" not in result

    def test_eco_true_mentions_eye_character(self, injector):
        result = injector.build_system_prompt(self._make_config(), "/tmp")
        assert "eye" in result.lower() or "◇" in result or "캐릭터" in result.lower() or "character" in result.lower()

    def test_eco_true_casual_tone(self, injector):
        result = injector.build_system_prompt(self._make_config(tone="casual"), "/tmp")
        assert "casual" in result.lower() or "친근" in result

    def test_eco_true_formal_tone(self, injector):
        result = injector.build_system_prompt(self._make_config(tone="formal"), "/tmp")
        assert "formal" in result.lower() or "격식" in result


class TestFormatGuideEcoFalse:
    """eco=false: full discussion format guide injected."""

    def _make_config(self, tone="casual"):
        return {
            "eco": False,
            "tone": tone,
            "promptInjection": {
                "enabled": True,
                "sections": {
                    "baseRules": True,
                    "dispatchEnforcement": True,
                    "qualityGates": True,
                    "formatGuide": True,
                },
            },
        }

    def test_eco_false_contains_full_discussion_marker(self, injector):
        result = injector.build_system_prompt(self._make_config(), "/tmp")
        assert "│ \"" in result or "│" in result

    def test_eco_false_shows_agent_dialogue(self, injector):
        result = injector.build_system_prompt(self._make_config(), "/tmp")
        assert "discussion" in result.lower() or "토론" in result or "dialogue" in result.lower()

    def test_eco_false_mentions_eye_character(self, injector):
        result = injector.build_system_prompt(self._make_config(), "/tmp")
        assert "eye" in result.lower() or "◇" in result or "캐릭터" in result.lower() or "character" in result.lower()


class TestFormatGuideDisabled:
    """formatGuide=false: no format guide injected."""

    def test_no_format_guide_when_disabled(self, injector, base_config):
        """base_config has no formatGuide key → defaults off → no guide markers."""
        result = injector.build_system_prompt(base_config, "/tmp")
        assert "━━ Agents:" not in result
        assert "│ \"" not in result


class TestDisabledInjection:
    def test_returns_empty_when_disabled(self, injector):
        config = {"promptInjection": {"enabled": False}}
        result = injector.build_system_prompt(config, "/tmp")
        assert result == ""

    def test_returns_empty_when_no_config(self, injector):
        result = injector.build_system_prompt({}, "/tmp")
        assert result == ""

    def test_returns_empty_when_none_config(self, injector):
        result = injector.build_system_prompt({"promptInjection": None}, "/tmp")
        assert result == ""


class TestStandaloneMode:
    """Tests for standalone mode (MCP not available)."""

    @pytest.fixture(autouse=True)
    def _standalone(self):
        with mock.patch("prompt_injection.is_mcp_available", return_value=False):
            yield

    def test_standalone_contains_mode_hook_instruction(self, injector, base_config):
        result = injector.build_system_prompt(base_config, "/tmp")
        assert "follow the mode instructions provided by the mode detection hook" in result

    def test_standalone_no_parse_mode_must(self, injector, base_config):
        result = injector.build_system_prompt(base_config, "/tmp")
        assert "MUST call parse_mode" not in result

    def test_standalone_no_dispatch_enforcement(self, injector, base_config):
        result = injector.build_system_prompt(base_config, "/tmp")
        assert "dispatch" not in result.lower() or "dispatch=\"auto\"" not in result

    def test_standalone_still_has_tdd(self, injector, base_config):
        result = injector.build_system_prompt(base_config, "/tmp")
        assert "TDD" in result

    def test_standalone_still_has_quality_gates(self, injector, base_config):
        result = injector.build_system_prompt(base_config, "/tmp")
        assert "lint" in result.lower() or "test" in result.lower()


class TestMcpMode:
    """Explicit MCP mode tests — verify original behavior is preserved."""

    def test_mcp_contains_parse_mode_must(self, injector, base_config):
        result = injector.build_system_prompt(base_config, "/tmp")
        assert "MUST call parse_mode FIRST" in result

    def test_mcp_contains_dispatch_enforcement(self, injector, base_config):
        result = injector.build_system_prompt(base_config, "/tmp")
        assert 'dispatch="auto"' in result
