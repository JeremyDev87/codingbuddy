"""Tests for hooks/lib/agent_status.py — Agent status message builder."""
import json
import os
import sys

import pytest

# Add hooks/lib to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hooks", "lib"))

from agent_status import build_status_message, clear_cache, _COLOR_EMOJI_MAP


@pytest.fixture(autouse=True)
def _clean_cache():
    """Clear caches before each test."""
    clear_cache()
    yield
    clear_cache()


@pytest.fixture
def agents_dir(tmp_path):
    """Create a temporary agents directory with sample agent JSON files."""
    agents = tmp_path / "agents"
    agents.mkdir()

    frontend = {
        "name": "Frontend Developer",
        "visual": {
            "eye": "\u2605",
            "eyeFallback": "O",
            "colorAnsi": "yellow",
            "group": "frontend",
        },
    }
    (agents / "frontend-developer.json").write_text(
        json.dumps(frontend), encoding="utf-8"
    )

    backend = {
        "name": "Backend Developer",
        "visual": {
            "eye": "\u25cf",
            "colorAnsi": "green",
        },
    }
    (agents / "backend-developer.json").write_text(
        json.dumps(backend), encoding="utf-8"
    )

    no_visual = {"name": "Plain Agent"}
    (agents / "plain-agent.json").write_text(
        json.dumps(no_visual), encoding="utf-8"
    )

    return agents


@pytest.fixture
def project_with_agents(tmp_path, agents_dir):
    """Create a project root with .ai-rules/agents structure."""
    ai_rules = tmp_path / ".ai-rules" / "agents"
    ai_rules.mkdir(parents=True)

    # Copy agent files into .ai-rules/agents
    for f in agents_dir.iterdir():
        (ai_rules / f.name).write_text(f.read_text(), encoding="utf-8")

    return str(tmp_path)


class TestBuildStatusMessageNoAgent:
    """Tests when no agent is active."""

    def test_returns_none_when_env_not_set(self, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        assert build_status_message() is None

    def test_returns_none_when_env_empty(self, monkeypatch):
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "")
        assert build_status_message() is None


class TestBuildStatusMessageWithAgent:
    """Tests when an agent is active."""

    def test_agent_with_visual_data(self, monkeypatch, project_with_agents):
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "frontend-developer")
        result = build_status_message(project_root=project_with_agents)
        # yellow -> 🟡, eye=★, face=★‿★
        assert "\U0001f7e1" in result  # 🟡
        assert "\u2605\u203f\u2605" in result  # ★‿★
        assert "frontend-developer" in result

    def test_agent_by_display_name(self, monkeypatch, project_with_agents):
        """Should find agent by display name via slow-path scan."""
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "Backend Developer")
        result = build_status_message(project_root=project_with_agents)
        assert "\U0001f7e2" in result  # 🟢
        assert "\u25cf\u203f\u25cf" in result  # ●‿●
        assert "Backend Developer" in result

    def test_agent_not_found_fallback(self, monkeypatch, project_with_agents):
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "nonexistent-agent")
        result = build_status_message(project_root=project_with_agents)
        assert "\U0001f916" in result  # 🤖
        assert "nonexistent-agent" in result

    def test_agent_without_visual_field(self, monkeypatch, project_with_agents):
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "plain-agent")
        result = build_status_message(project_root=project_with_agents)
        # No visual -> robot fallback
        assert "\U0001f916" in result  # 🤖
        assert "plain-agent" in result

    def test_no_agents_dir_fallback(self, monkeypatch, tmp_path):
        """When agents dir doesn't exist, returns robot fallback."""
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "some-agent")
        result = build_status_message(project_root=str(tmp_path))
        assert "\U0001f916" in result
        assert "some-agent" in result


class TestBuildStatusMessageProjectRoot:
    """Tests for project root resolution."""

    def test_uses_claude_project_dir_env(self, monkeypatch, project_with_agents):
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "frontend-developer")
        monkeypatch.setenv("CLAUDE_PROJECT_DIR", project_with_agents)
        result = build_status_message()  # No explicit project_root
        assert "\u2605\u203f\u2605" in result  # ★‿★

    def test_uses_claude_cwd_env_fallback(self, monkeypatch, project_with_agents):
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "frontend-developer")
        monkeypatch.delenv("CLAUDE_PROJECT_DIR", raising=False)
        monkeypatch.setenv("CLAUDE_CWD", project_with_agents)
        result = build_status_message()
        assert "\u2605\u203f\u2605" in result


class TestColorEmojiMap:
    """Tests for the color-to-emoji mapping completeness."""

    def test_all_known_colors_mapped(self):
        expected = {"red", "green", "blue", "yellow", "cyan", "magenta", "white", "bright"}
        assert set(_COLOR_EMOJI_MAP.keys()) == expected

    def test_unknown_color_returns_white(self, monkeypatch, project_with_agents):
        """Agent with unknown colorAnsi should get white circle."""
        # Create agent with unknown color
        agent_file = os.path.join(
            project_with_agents, ".ai-rules", "agents", "custom-agent.json"
        )
        with open(agent_file, "w") as f:
            json.dump(
                {"name": "Custom Agent", "visual": {"eye": "X", "colorAnsi": "pink"}},
                f,
            )

        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "custom-agent")
        result = build_status_message(project_root=project_with_agents)
        assert "\u26aa" in result  # ⚪ default


class TestCaching:
    """Tests for cache behavior."""

    def test_cache_reuses_result(self, monkeypatch, project_with_agents):
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "frontend-developer")
        r1 = build_status_message(project_root=project_with_agents)
        r2 = build_status_message(project_root=project_with_agents)
        assert r1 == r2

    def test_clear_cache_resets(self, monkeypatch, project_with_agents):
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "frontend-developer")
        r1 = build_status_message(project_root=project_with_agents)
        clear_cache()
        r2 = build_status_message(project_root=project_with_agents)
        assert r1 == r2  # Same result, but freshly loaded
