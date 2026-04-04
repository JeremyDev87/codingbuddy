"""Tests for hooks/lib/tiny_actor_presets.py — Tiny Actor cast presets."""
import os
import re
import sys

import pytest

# Add hooks/lib to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hooks", "lib"))

from tiny_actor_presets import (
    BUDDY_FACE,
    CAST_PRESETS,
    DEFAULT_MODERATOR_COPY,
    get_cast_preset,
    get_moderator_copy,
)

VALID_MODES = ["PLAN", "EVAL", "AUTO", "SHIP"]
KEBAB_CASE_RE = re.compile(r"^[a-z]+(-[a-z]+)*$")
MAX_MODERATOR_COPY_LEN = 40


# ---------------------------------------------------------------------------
# Agents directory for cross-referencing agent IDs
# ---------------------------------------------------------------------------

def _find_agents_dir():
    """Locate .ai-rules/agents relative to project root."""
    project_root = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..")
    )
    candidates = [
        os.path.join(project_root, "packages", "rules", ".ai-rules", "agents"),
        os.path.join(project_root, ".ai-rules", "agents"),
    ]
    for c in candidates:
        if os.path.isdir(c):
            return c
    return None


AGENTS_DIR = _find_agents_dir()


# ---------------------------------------------------------------------------
# Basic preset tests
# ---------------------------------------------------------------------------


class TestGetCastPreset:
    @pytest.mark.parametrize("mode", VALID_MODES)
    def test_valid_mode_returns_dict(self, mode: str):
        result = get_cast_preset(mode)
        assert isinstance(result, dict)

    @pytest.mark.parametrize("mode", ["UNKNOWN", "debug", "", "plan"])
    def test_unknown_mode_returns_none(self, mode: str):
        assert get_cast_preset(mode) is None

    @pytest.mark.parametrize("mode", VALID_MODES)
    def test_preset_has_required_keys(self, mode: str):
        preset = get_cast_preset(mode)
        assert "primary" in preset
        assert "specialists" in preset
        assert "moderator_copy" in preset

    @pytest.mark.parametrize("mode", VALID_MODES)
    def test_primary_is_string(self, mode: str):
        preset = get_cast_preset(mode)
        assert isinstance(preset["primary"], str)
        assert len(preset["primary"]) > 0

    @pytest.mark.parametrize("mode", VALID_MODES)
    def test_specialists_is_nonempty_list(self, mode: str):
        preset = get_cast_preset(mode)
        assert isinstance(preset["specialists"], list)
        assert len(preset["specialists"]) >= 2

    @pytest.mark.parametrize("mode", VALID_MODES)
    def test_moderator_copy_is_nonempty_string(self, mode: str):
        preset = get_cast_preset(mode)
        assert isinstance(preset["moderator_copy"], str)
        assert len(preset["moderator_copy"]) > 0


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------


class TestDeterminism:
    @pytest.mark.parametrize("mode", VALID_MODES)
    def test_same_input_same_output(self, mode: str):
        first = get_cast_preset(mode)
        second = get_cast_preset(mode)
        assert first == second


# ---------------------------------------------------------------------------
# Agent ID format (kebab-case)
# ---------------------------------------------------------------------------


class TestAgentIdFormat:
    @pytest.mark.parametrize("mode", VALID_MODES)
    def test_primary_is_kebab_case(self, mode: str):
        preset = get_cast_preset(mode)
        assert KEBAB_CASE_RE.match(preset["primary"]), (
            f"primary '{preset['primary']}' is not kebab-case"
        )

    @pytest.mark.parametrize("mode", VALID_MODES)
    def test_specialists_are_kebab_case(self, mode: str):
        preset = get_cast_preset(mode)
        for agent_id in preset["specialists"]:
            assert KEBAB_CASE_RE.match(agent_id), (
                f"specialist '{agent_id}' is not kebab-case"
            )


# ---------------------------------------------------------------------------
# Agent IDs reference existing agent JSON files
# ---------------------------------------------------------------------------


@pytest.mark.skipif(AGENTS_DIR is None, reason="agents directory not found")
class TestAgentReferences:
    def _all_agent_ids(self):
        ids = set()
        for mode in VALID_MODES:
            preset = get_cast_preset(mode)
            ids.add(preset["primary"])
            ids.update(preset["specialists"])
        return ids

    def test_all_agent_ids_have_json_files(self):
        for agent_id in self._all_agent_ids():
            path = os.path.join(AGENTS_DIR, f"{agent_id}.json")
            assert os.path.isfile(path), (
                f"Agent '{agent_id}' has no JSON at {path}"
            )


# ---------------------------------------------------------------------------
# Display budget — moderator copy length
# ---------------------------------------------------------------------------


class TestDisplayBudget:
    @pytest.mark.parametrize("mode", VALID_MODES)
    def test_moderator_copy_within_budget(self, mode: str):
        preset = get_cast_preset(mode)
        assert len(preset["moderator_copy"]) <= MAX_MODERATOR_COPY_LEN, (
            f"moderator_copy too long ({len(preset['moderator_copy'])} chars)"
        )

    def test_default_moderator_copy_within_budget(self):
        assert len(DEFAULT_MODERATOR_COPY) <= MAX_MODERATOR_COPY_LEN


# ---------------------------------------------------------------------------
# get_moderator_copy function
# ---------------------------------------------------------------------------


class TestGetModeratorCopy:
    @pytest.mark.parametrize("mode", VALID_MODES)
    def test_returns_mode_specific_copy(self, mode: str):
        copy = get_moderator_copy(mode)
        preset = get_cast_preset(mode)
        assert copy == preset["moderator_copy"]

    def test_unknown_mode_returns_default(self):
        assert get_moderator_copy("UNKNOWN") == DEFAULT_MODERATOR_COPY

    def test_returns_string(self):
        assert isinstance(get_moderator_copy("PLAN"), str)


# ---------------------------------------------------------------------------
# Buddy identity
# ---------------------------------------------------------------------------


class TestBuddyIdentity:
    def test_buddy_face_is_defined(self):
        assert isinstance(BUDDY_FACE, str)
        assert len(BUDDY_FACE) > 0

    def test_buddy_face_value(self):
        assert BUDDY_FACE == "\u25d5\u203f\u25d5"


# ---------------------------------------------------------------------------
# CAST_PRESETS dict integrity
# ---------------------------------------------------------------------------


class TestCastPresetsDict:
    def test_has_all_valid_modes(self):
        for mode in VALID_MODES:
            assert mode in CAST_PRESETS

    def test_no_extra_modes(self):
        assert set(CAST_PRESETS.keys()) == set(VALID_MODES)
