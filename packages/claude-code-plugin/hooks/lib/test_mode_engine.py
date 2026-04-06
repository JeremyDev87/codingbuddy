"""Tests for ModeEngine — self-contained mode instruction generator."""

import json
import os
import tempfile
import unittest

from mode_engine import (
    ModeEngine,
    _resolve_rules_dir,
    DEFAULT_AGENTS,
    MODE_TEMPLATES,
    CHAR_LIMIT,
    COUNCIL_PRESETS,
    MODERATOR_COPY,
)


class TestResolveRulesDir(unittest.TestCase):
    """Test rules directory resolution order."""

    def test_env_var_takes_priority(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            os.environ["CODINGBUDDY_RULES_DIR"] = tmpdir
            try:
                result = _resolve_rules_dir(cwd="/nonexistent")
                self.assertEqual(result, tmpdir)
            finally:
                del os.environ["CODINGBUDDY_RULES_DIR"]

    def test_env_var_ignored_if_not_exists(self):
        os.environ["CODINGBUDDY_RULES_DIR"] = "/nonexistent/path"
        try:
            result = _resolve_rules_dir(cwd="/also/nonexistent")
            # Should not return the env var path since it doesn't exist
            self.assertNotEqual(result, "/nonexistent/path")
        finally:
            del os.environ["CODINGBUDDY_RULES_DIR"]

    def test_project_local_ai_rules(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            ai_rules = os.path.join(tmpdir, ".ai-rules")
            os.makedirs(ai_rules)
            result = _resolve_rules_dir(cwd=tmpdir)
            self.assertEqual(result, ai_rules)

    def test_returns_none_when_nothing_found(self):
        result = _resolve_rules_dir(cwd="/nonexistent/path/nowhere")
        # May return None or find bundled dir depending on repo layout
        # The key is it doesn't crash
        self.assertIsInstance(result, (str, type(None)))


class TestModeEngineGetDefaultAgent(unittest.TestCase):
    """Test default agent assignment per mode."""

    def test_plan_agent(self):
        engine = ModeEngine(rules_dir=None)
        agent = engine.get_default_agent("PLAN")
        self.assertEqual(agent["name"], "technical-planner")

    def test_act_agent(self):
        engine = ModeEngine(rules_dir=None)
        agent = engine.get_default_agent("ACT")
        self.assertEqual(agent["name"], "software-engineer")

    def test_eval_agent(self):
        engine = ModeEngine(rules_dir=None)
        agent = engine.get_default_agent("EVAL")
        self.assertEqual(agent["name"], "code-reviewer")

    def test_auto_agent(self):
        engine = ModeEngine(rules_dir=None)
        agent = engine.get_default_agent("AUTO")
        self.assertEqual(agent["name"], "auto-mode")

    def test_case_insensitive(self):
        engine = ModeEngine(rules_dir=None)
        agent = engine.get_default_agent("plan")
        self.assertEqual(agent["name"], "technical-planner")

    def test_unknown_mode_falls_back_to_act(self):
        engine = ModeEngine(rules_dir=None)
        agent = engine.get_default_agent("UNKNOWN")
        self.assertEqual(agent["name"], "software-engineer")


class TestModeEngineBuildInstructions(unittest.TestCase):
    """Test instruction generation for each mode."""

    def setUp(self):
        self.engine = ModeEngine(rules_dir=None)

    def test_plan_instructions_contain_mode_header(self):
        result = self.engine.build_instructions("PLAN")
        self.assertIn("# Mode: PLAN", result)
        self.assertIn("## Agent: technical-planner", result)

    def test_act_instructions_contain_tdd(self):
        result = self.engine.build_instructions("ACT")
        self.assertIn("# Mode: ACT", result)
        self.assertIn("Red -> Green -> Refactor", result)

    def test_eval_instructions_contain_quality(self):
        result = self.engine.build_instructions("EVAL")
        self.assertIn("# Mode: EVAL", result)
        self.assertIn("SOLID, DRY", result)

    def test_auto_instructions_contain_cycle(self):
        result = self.engine.build_instructions("AUTO")
        self.assertIn("# Mode: AUTO", result)
        self.assertIn("PLAN -> ACT -> EVAL", result)

    def test_mcp_hint_always_present(self):
        for mode in ["PLAN", "ACT", "EVAL", "AUTO"]:
            result = self.engine.build_instructions(mode)
            self.assertIn("mcp__codingbuddy__parse_mode", result)

    def test_output_within_char_limit(self):
        for mode in ["PLAN", "ACT", "EVAL", "AUTO"]:
            result = self.engine.build_instructions(mode)
            self.assertLessEqual(len(result), 2000, f"{mode} exceeds 2000 char limit")

    def test_case_insensitive_mode(self):
        result = self.engine.build_instructions("plan")
        self.assertIn("# Mode: PLAN", result)


class TestModeEngineLoadRules(unittest.TestCase):
    """Test loading rules from filesystem — section extraction."""

    SAMPLE_CORE = (
        "# Core Rules\n"
        "### Plan Mode\n"
        "**Important:** PLAN is the default\n"
        "- Create actionable plans\n"
        "### API Assumption Verification (PLAN mode)\n"
        "Check assumptions\n"
        "### Act Mode\n"
        "**Important:** ACT executes the plan\n"
        "- Red -> Green -> Refactor\n"
        "### Branch Discipline\n"
        "Safety rules here\n"
        "### Eval Mode\n"
        "**Important:** EVAL reviews\n"
        "- Check code quality\n"
        "### Auto Mode\n"
        "**Important:** AUTO is autonomous\n"
        "- PLAN -> ACT -> EVAL cycle\n"
        "### Communication Rules\n"
        "General stuff\n"
    )

    def _make_rules_dir(self, tmpdir, core_content=None):
        rules_dir = os.path.join(tmpdir, "rules")
        os.makedirs(rules_dir)
        with open(os.path.join(rules_dir, "core.md"), "w") as f:
            f.write(core_content or self.SAMPLE_CORE)
        return tmpdir

    def test_load_with_nonexistent_rules_dir_returns_none(self):
        engine = ModeEngine(rules_dir="/nonexistent/path/nowhere")
        result = engine.load_mode_rules("PLAN")
        self.assertIsNone(result)

    def test_load_missing_core_md_returns_none(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            engine = ModeEngine(rules_dir=tmpdir)
            result = engine.load_mode_rules("PLAN")
            self.assertIsNone(result)

    def test_extracts_plan_section(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            rd = self._make_rules_dir(tmpdir)
            engine = ModeEngine(rules_dir=rd)
            result = engine.load_mode_rules("PLAN")
            self.assertIsNotNone(result)
            self.assertIn("### Plan Mode", result)
            self.assertIn("Create actionable plans", result)
            # Should include PLAN-related sub-section
            self.assertIn("API Assumption Verification", result)
            # Should NOT include Act Mode content
            self.assertNotIn("### Act Mode", result)

    def test_extracts_act_section(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            rd = self._make_rules_dir(tmpdir)
            engine = ModeEngine(rules_dir=rd)
            result = engine.load_mode_rules("ACT")
            self.assertIsNotNone(result)
            self.assertIn("### Act Mode", result)
            self.assertIn("Red -> Green -> Refactor", result)
            self.assertNotIn("### Eval Mode", result)

    def test_extracts_eval_section(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            rd = self._make_rules_dir(tmpdir)
            engine = ModeEngine(rules_dir=rd)
            result = engine.load_mode_rules("EVAL")
            self.assertIsNotNone(result)
            self.assertIn("### Eval Mode", result)
            self.assertIn("Check code quality", result)
            self.assertNotIn("### Auto Mode", result)

    def test_extracts_auto_section(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            rd = self._make_rules_dir(tmpdir)
            engine = ModeEngine(rules_dir=rd)
            result = engine.load_mode_rules("AUTO")
            self.assertIsNotNone(result)
            self.assertIn("### Auto Mode", result)
            self.assertIn("PLAN -> ACT -> EVAL cycle", result)

    def test_unknown_mode_returns_none(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            rd = self._make_rules_dir(tmpdir)
            engine = ModeEngine(rules_dir=rd)
            result = engine.load_mode_rules("UNKNOWN")
            self.assertIsNone(result)

    def test_no_rules_dir_returns_none(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # Empty dir has no rules/core.md → returns None
            engine = ModeEngine(rules_dir=tmpdir)
            result = engine.load_mode_rules("PLAN")
            self.assertIsNone(result)


class TestLoadAgentDetails(unittest.TestCase):
    """Test _load_agent_details from agent JSON files."""

    SAMPLE_AGENT = {
        "name": "Technical Planner",
        "description": "Low-level implementation planning",
        "role": {
            "title": "Technical Planner",
            "expertise": ["Planning", "TDD Strategy", "Task Decomposition"],
        },
    }

    def _make_agent(self, tmpdir, agent_name, data=None):
        agents_dir = os.path.join(tmpdir, "agents")
        os.makedirs(agents_dir, exist_ok=True)
        with open(os.path.join(agents_dir, f"{agent_name}.json"), "w") as f:
            json.dump(data or self.SAMPLE_AGENT, f)
        return tmpdir

    def test_loads_agent_details(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            rd = self._make_agent(tmpdir, "technical-planner")
            engine = ModeEngine(rules_dir=rd)
            result = engine._load_agent_details("technical-planner")
            self.assertIsNotNone(result)
            self.assertEqual(result["name"], "Technical Planner")
            self.assertEqual(result["description"], "Low-level implementation planning")
            self.assertIn("TDD Strategy", result["expertise"])

    def test_returns_none_for_missing_agent(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, "agents"))
            engine = ModeEngine(rules_dir=tmpdir)
            result = engine._load_agent_details("nonexistent-agent")
            self.assertIsNone(result)

    def test_returns_none_without_agents_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # Empty dir has no agents/ → returns None
            engine = ModeEngine(rules_dir=tmpdir)
            result = engine._load_agent_details("technical-planner")
            self.assertIsNone(result)

    def test_handles_malformed_json(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            agents_dir = os.path.join(tmpdir, "agents")
            os.makedirs(agents_dir)
            with open(os.path.join(agents_dir, "bad.json"), "w") as f:
                f.write("{invalid json")
            engine = ModeEngine(rules_dir=tmpdir)
            result = engine._load_agent_details("bad")
            self.assertIsNone(result)

    def test_handles_missing_role_key(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            rd = self._make_agent(tmpdir, "minimal", {"name": "Minimal"})
            engine = ModeEngine(rules_dir=rd)
            result = engine._load_agent_details("minimal")
            self.assertIsNotNone(result)
            self.assertEqual(result["expertise"], [])


class TestBuildInstructionsEnriched(unittest.TestCase):
    """Test build_instructions with .ai-rules data present."""

    SAMPLE_CORE = (
        "### Plan Mode\n"
        "**Important:** PLAN is the default\n"
        "- Create actionable plans\n"
        "- Define test cases first\n"
        "### Act Mode\n"
        "**Important:** ACT executes\n"
        "- Red -> Green -> Refactor\n"
        "### Eval Mode\n"
        "**Important:** EVAL reviews\n"
        "- Check quality\n"
        "### Auto Mode\n"
        "**Important:** AUTO is autonomous\n"
        "- Cycle until done\n"
    )

    SAMPLE_AGENT = {
        "name": "Technical Planner",
        "description": "Planning specialist",
        "role": {"expertise": ["Planning", "TDD", "Decomposition"]},
    }

    def _setup_rules_dir(self, tmpdir):
        rules_dir = os.path.join(tmpdir, "rules")
        os.makedirs(rules_dir)
        with open(os.path.join(rules_dir, "core.md"), "w") as f:
            f.write(self.SAMPLE_CORE)
        agents_dir = os.path.join(tmpdir, "agents")
        os.makedirs(agents_dir)
        with open(os.path.join(agents_dir, "technical-planner.json"), "w") as f:
            json.dump(self.SAMPLE_AGENT, f)
        return tmpdir

    def test_includes_rules_content_when_present(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            rd = self._setup_rules_dir(tmpdir)
            engine = ModeEngine(rules_dir=rd)
            result = engine.build_instructions("PLAN")
            self.assertIn("From .ai-rules:", result)

    def test_includes_agent_expertise(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            rd = self._setup_rules_dir(tmpdir)
            engine = ModeEngine(rules_dir=rd)
            result = engine.build_instructions("PLAN")
            self.assertIn("Agent expertise:", result)
            self.assertIn("Planning", result)

    def test_falls_back_without_rules_data(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # Empty dir → no enrichment data available
            engine = ModeEngine(rules_dir=tmpdir)
            result = engine.build_instructions("PLAN")
            self.assertIn("# Mode: PLAN", result)
            self.assertNotIn("From .ai-rules:", result)

    def test_output_never_exceeds_char_limit(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create oversized core.md to stress the limit
            rules_dir = os.path.join(tmpdir, "rules")
            os.makedirs(rules_dir)
            big_content = "### Plan Mode\n" + ("- Rule line\n" * 500)
            big_content += "### Act Mode\n" + ("- Rule line\n" * 500)
            big_content += "### Eval Mode\n" + ("- Rule line\n" * 500)
            big_content += "### Auto Mode\n" + ("- Rule line\n" * 500)
            with open(os.path.join(rules_dir, "core.md"), "w") as f:
                f.write(big_content)
            engine = ModeEngine(rules_dir=tmpdir)
            for mode in ["PLAN", "ACT", "EVAL", "AUTO"]:
                result = engine.build_instructions(mode)
                self.assertLessEqual(
                    len(result), CHAR_LIMIT, f"{mode} exceeds {CHAR_LIMIT} chars"
                )

    def test_all_modes_within_limit_with_real_rules(self):
        """Even with full .ai-rules data, every mode stays within limit."""
        with tempfile.TemporaryDirectory() as tmpdir:
            rd = self._setup_rules_dir(tmpdir)
            engine = ModeEngine(rules_dir=rd)
            for mode in ["PLAN", "ACT", "EVAL", "AUTO"]:
                result = engine.build_instructions(mode)
                self.assertLessEqual(len(result), CHAR_LIMIT)


class TestCouncilScene(unittest.TestCase):
    """Test council scene contract generation (#1366)."""

    def setUp(self):
        self.engine = ModeEngine(rules_dir=None)

    def test_plan_returns_council_scene(self):
        scene = self.engine.build_council_scene("PLAN")
        self.assertIsNotNone(scene)
        self.assertTrue(scene["enabled"])
        self.assertEqual(scene["format"], "tiny-actor-grid")
        self.assertIn("design this together", scene["moderatorCopy"])

    def test_eval_returns_council_scene(self):
        scene = self.engine.build_council_scene("EVAL")
        self.assertIsNotNone(scene)
        self.assertTrue(scene["enabled"])
        self.assertIn("Review council", scene["moderatorCopy"])

    def test_auto_returns_council_scene(self):
        scene = self.engine.build_council_scene("AUTO")
        self.assertIsNotNone(scene)
        self.assertTrue(scene["enabled"])
        self.assertIn("Autonomous council", scene["moderatorCopy"])

    def test_act_returns_none(self):
        scene = self.engine.build_council_scene("ACT")
        self.assertIsNone(scene)

    def test_cast_has_one_primary(self):
        scene = self.engine.build_council_scene("PLAN")
        primaries = [m for m in scene["cast"] if m["role"] == "primary"]
        self.assertEqual(len(primaries), 1)

    def test_cast_members_have_required_fields(self):
        scene = self.engine.build_council_scene("PLAN")
        for member in scene["cast"]:
            self.assertIn("name", member)
            self.assertIn("role", member)
            self.assertIn("face", member)
            self.assertIn(member["role"], ("primary", "specialist"))

    def test_plan_cast_matches_preset(self):
        scene = self.engine.build_council_scene("PLAN")
        preset = COUNCIL_PRESETS["PLAN"]
        self.assertEqual(scene["cast"][0]["name"], preset["primary"])
        specialist_names = [m["name"] for m in scene["cast"][1:]]
        self.assertEqual(specialist_names, preset["specialists"])

    def test_case_insensitive(self):
        scene = self.engine.build_council_scene("plan")
        self.assertIsNotNone(scene)

    def test_council_scene_in_build_instructions(self):
        result = self.engine.build_instructions("PLAN")
        self.assertIn("Council Scene:", result)
        self.assertIn("technical-planner", result)

    def test_no_council_scene_in_act_instructions(self):
        result = self.engine.build_instructions("ACT")
        self.assertNotIn("Council Scene:", result)

    def test_serializable_json(self):
        scene = self.engine.build_council_scene("PLAN")
        roundtripped = json.loads(json.dumps(scene))
        self.assertEqual(roundtripped, scene)


class TestModeEngineGracefulFallback(unittest.TestCase):
    """Test graceful degradation when .ai-rules/ is missing."""

    def test_build_instructions_without_rules_data(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            engine = ModeEngine(rules_dir=tmpdir)
            result = engine.build_instructions("PLAN")
            # Should still produce valid instructions from templates
            self.assertIn("# Mode: PLAN", result)
            self.assertIn("technical-planner", result)

    def test_all_modes_work_without_rules_data(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            engine = ModeEngine(rules_dir=tmpdir)
            for mode in ["PLAN", "ACT", "EVAL", "AUTO"]:
                result = engine.build_instructions(mode)
                self.assertTrue(len(result) > 0, f"{mode} produced empty output")


if __name__ == "__main__":
    unittest.main()
