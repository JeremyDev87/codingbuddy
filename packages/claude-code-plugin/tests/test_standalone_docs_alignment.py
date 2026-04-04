"""Tests that slash-command docs match mode_engine.py DEFAULT_AGENTS.

Prevents drift between standalone runtime defaults and command documentation.
See: https://github.com/JeremyDev87/codingbuddy/issues/1261
"""
import os
import re

import pytest

# Path helpers (relative to repo root)
_PLUGIN_DIR = os.path.join(
    os.path.dirname(__file__), os.pardir
)
_COMMANDS_DIR = os.path.join(_PLUGIN_DIR, "commands")
_MODE_ENGINE = os.path.join(_PLUGIN_DIR, "hooks", "lib", "mode_engine.py")


def _parse_default_agents():
    """Parse DEFAULT_AGENTS dict from mode_engine.py source."""
    with open(_MODE_ENGINE, encoding="utf-8") as f:
        source = f.read()

    # Match the DEFAULT_AGENTS block (greedy to capture all nested braces)
    match = re.search(
        r"DEFAULT_AGENTS\s*=\s*\{(.+?)\n\}", source, re.DOTALL
    )
    assert match, "Could not find DEFAULT_AGENTS in mode_engine.py"

    agents = {}
    for entry in re.finditer(
        r'"(\w+)":\s*\{[^}]*"title":\s*"([^"]+)"', match.group(1)
    ):
        agents[entry.group(1)] = entry.group(2)
    return agents


def _read_command_md(mode):
    """Read the command markdown for a given mode."""
    path = os.path.join(_COMMANDS_DIR, f"{mode.lower()}.md")
    if not os.path.isfile(path):
        pytest.skip(f"{mode.lower()}.md not found")
    with open(path, encoding="utf-8") as f:
        return f.read()


class TestStandaloneDocsAlignment:
    """Ensure commands/*.md reference the correct default agents from mode_engine.py."""

    @pytest.fixture(autouse=True)
    def _load_defaults(self):
        self.defaults = _parse_default_agents()

    def test_default_agents_parsed(self):
        """Sanity: we can parse all four modes from mode_engine.py."""
        assert set(self.defaults.keys()) == {"PLAN", "ACT", "EVAL", "AUTO"}

    def test_plan_md_references_technical_planner(self):
        """plan.md standalone section must reference Technical Planner."""
        content = _read_command_md("PLAN")
        expected = self.defaults["PLAN"]  # "Technical Planner"
        assert expected in content, (
            f"plan.md must mention standalone default '{expected}'"
        )
        # The agent activation line should name the default
        assert re.search(
            rf"{re.escape(expected)}.*standalone", content
        ), f"plan.md agent activation should reference '{expected}' for standalone"

    def test_act_md_references_software_engineer(self):
        """act.md standalone section must reference Software Engineer."""
        content = _read_command_md("ACT")
        expected = self.defaults["ACT"]  # "Software Engineer"
        assert expected in content, (
            f"act.md must mention standalone default '{expected}'"
        )
        assert re.search(
            rf"{re.escape(expected)}.*standalone", content
        ), f"act.md agent activation should reference '{expected}' for standalone"

    def test_eval_md_references_code_reviewer(self):
        """eval.md must reference Code Reviewer."""
        content = _read_command_md("EVAL")
        expected = self.defaults["EVAL"]  # "Code Reviewer"
        assert expected in content, (
            f"eval.md must mention standalone default '{expected}'"
        )

    def test_no_primary_developer_agent_in_plan(self):
        """plan.md must not use the ambiguous 'Primary Developer Agent' term."""
        content = _read_command_md("PLAN")
        assert "Primary Developer Agent" not in content, (
            "plan.md should use 'Technical Planner' instead of "
            "'Primary Developer Agent'"
        )

    def test_no_primary_developer_agent_in_act(self):
        """act.md must not use the ambiguous 'Primary Developer Agent' term."""
        content = _read_command_md("ACT")
        assert "Primary Developer Agent" not in content, (
            "act.md should use 'Software Engineer' instead of "
            "'Primary Developer Agent'"
        )

    def test_no_primary_developer_agent_in_auto(self):
        """auto.md must not use the ambiguous 'Primary Developer Agent' term."""
        content = _read_command_md("AUTO")
        assert "Primary Developer Agent" not in content, (
            "auto.md should use specific agent names instead of "
            "'Primary Developer Agent'"
        )

    def test_auto_md_references_both_agents(self):
        """auto.md must reference both Technical Planner and Software Engineer."""
        content = _read_command_md("AUTO")
        plan_agent = self.defaults["PLAN"]
        act_agent = self.defaults["ACT"]
        assert plan_agent in content, (
            f"auto.md must mention PLAN default '{plan_agent}'"
        )
        assert act_agent in content, (
            f"auto.md must mention ACT default '{act_agent}'"
        )

    def test_output_format_uses_concrete_agent_names(self):
        """Output format templates must use concrete agent names, not placeholders."""
        for mode in ("PLAN", "ACT"):
            content = _read_command_md(mode)
            assert "[Primary Developer Agent Name]" not in content, (
                f"{mode.lower()}.md output format should use concrete agent name"
            )
