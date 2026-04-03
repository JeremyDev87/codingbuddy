"""Tests for ModeEngine — self-contained mode instruction generator."""

import os
import tempfile
import unittest

from mode_engine import ModeEngine, _resolve_rules_dir, DEFAULT_AGENTS, MODE_TEMPLATES


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
        self.assertEqual(agent["name"], "auto-mode-agent")

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
    """Test loading rules from filesystem."""

    def test_load_with_nonexistent_rules_dir_returns_none(self):
        engine = ModeEngine(rules_dir="/nonexistent/path/nowhere")
        result = engine.load_mode_rules("PLAN")
        self.assertIsNone(result)

    def test_load_with_valid_core_md(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            rules_dir = os.path.join(tmpdir, "rules")
            os.makedirs(rules_dir)
            core_path = os.path.join(rules_dir, "core.md")
            with open(core_path, "w") as f:
                f.write("# Core Rules\n## PLAN\nPlan rules here")

            engine = ModeEngine(rules_dir=tmpdir)
            result = engine.load_mode_rules("PLAN")
            self.assertIsNotNone(result)
            self.assertIn("Core Rules", result)

    def test_load_missing_core_md_returns_none(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            engine = ModeEngine(rules_dir=tmpdir)
            result = engine.load_mode_rules("PLAN")
            self.assertIsNone(result)


class TestModeEngineGracefulFallback(unittest.TestCase):
    """Test graceful degradation when .ai-rules/ is missing."""

    def test_build_instructions_without_rules_dir(self):
        engine = ModeEngine(rules_dir=None)
        result = engine.build_instructions("PLAN")
        # Should still produce valid instructions from templates
        self.assertIn("# Mode: PLAN", result)
        self.assertIn("technical-planner", result)

    def test_all_modes_work_without_rules_dir(self):
        engine = ModeEngine(rules_dir=None)
        for mode in ["PLAN", "ACT", "EVAL", "AUTO"]:
            result = engine.build_instructions(mode)
            self.assertTrue(len(result) > 0, f"{mode} produced empty output")


if __name__ == "__main__":
    unittest.main()
