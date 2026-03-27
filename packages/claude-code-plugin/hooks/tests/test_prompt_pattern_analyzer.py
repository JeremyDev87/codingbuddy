"""Tests for PromptPatternAnalyzer module.

Run with: python3 -m pytest tests/test_prompt_pattern_analyzer.py -v
"""

import json
import os
import tempfile
from pathlib import Path

import pytest

from hooks.lib.prompt_pattern_analyzer import (
    PromptPatternAnalyzer,
    classify_prompt,
    CATEGORY_KEYWORDS,
)


@pytest.fixture
def tmp_data_dir(tmp_path):
    """Provide a temporary data directory for pattern storage."""
    return str(tmp_path / "prompt_patterns")


@pytest.fixture
def analyzer(tmp_data_dir):
    """Create an enabled analyzer with a temp data dir."""
    return PromptPatternAnalyzer(data_dir=tmp_data_dir, enabled=True)


@pytest.fixture
def disabled_analyzer(tmp_data_dir):
    """Create a disabled analyzer."""
    return PromptPatternAnalyzer(data_dir=tmp_data_dir, enabled=False)


# --- classify_prompt tests ---


class TestClassifyPrompt:
    """Tests for the classify_prompt function."""

    def test_classifies_test_prompt(self):
        assert classify_prompt("run the tests") == "test"

    def test_classifies_test_prompt_korean(self):
        assert classify_prompt("테스트 돌려줘") == "test"

    def test_classifies_refactor_prompt(self):
        assert classify_prompt("refactor this function") == "refactor"

    def test_classifies_refactor_korean(self):
        assert classify_prompt("이거 리팩토링해줘") == "refactor"

    def test_classifies_debug_prompt(self):
        assert classify_prompt("fix this bug please") == "debug"

    def test_classifies_debug_error(self):
        assert classify_prompt("there is an error in login") == "debug"

    def test_classifies_build_prompt(self):
        assert classify_prompt("build the project") == "build"

    def test_classifies_deploy_prompt(self):
        assert classify_prompt("deploy to production") == "deploy"

    def test_classifies_review_prompt(self):
        assert classify_prompt("review my code") == "review"

    def test_classifies_docs_prompt(self):
        assert classify_prompt("write documentation for this") == "docs"

    def test_classifies_create_prompt(self):
        assert classify_prompt("create a new component") == "create"

    def test_classifies_git_prompt(self):
        assert classify_prompt("commit these changes") == "git"

    def test_classifies_security_prompt(self):
        assert classify_prompt("scan for vulnerabilities") == "security"

    def test_classifies_performance_prompt(self):
        assert classify_prompt("optimize this query") == "performance"

    def test_returns_other_for_unrecognized(self):
        assert classify_prompt("hello world") == "other"

    def test_returns_other_for_empty(self):
        assert classify_prompt("") == "other"

    def test_case_insensitive(self):
        assert classify_prompt("RUN THE TESTS") == "test"

    def test_first_matching_category_wins(self):
        # "fix" matches debug, "test" matches test - first match wins
        result = classify_prompt("fix the test")
        assert result in ("debug", "test")


# --- PromptPatternAnalyzer init tests ---


class TestAnalyzerInit:
    """Tests for PromptPatternAnalyzer initialization."""

    def test_creates_data_dir_on_init(self, analyzer, tmp_data_dir):
        assert os.path.isdir(tmp_data_dir)

    def test_disabled_analyzer_does_not_create_dir(self, disabled_analyzer, tmp_data_dir):
        assert not os.path.exists(tmp_data_dir)

    def test_loads_existing_data(self, tmp_data_dir):
        os.makedirs(tmp_data_dir, exist_ok=True)
        data = {"categories": {"test": 5, "debug": 3}, "total": 8}
        with open(os.path.join(tmp_data_dir, "patterns.json"), "w") as f:
            json.dump(data, f)

        analyzer = PromptPatternAnalyzer(data_dir=tmp_data_dir, enabled=True)
        patterns = analyzer.analyze_patterns(top_n=10)
        assert patterns[0]["category"] == "test"
        assert patterns[0]["count"] == 5


# --- record_prompt tests ---


class TestRecordPrompt:
    """Tests for recording prompts."""

    def test_records_prompt_category(self, analyzer):
        analyzer.record_prompt("run the tests")
        patterns = analyzer.analyze_patterns(top_n=10)
        found = [p for p in patterns if p["category"] == "test"]
        assert len(found) == 1
        assert found[0]["count"] == 1

    def test_increments_count_on_repeated_category(self, analyzer):
        analyzer.record_prompt("run tests")
        analyzer.record_prompt("execute tests")
        analyzer.record_prompt("pytest run")
        patterns = analyzer.analyze_patterns(top_n=10)
        found = [p for p in patterns if p["category"] == "test"]
        assert found[0]["count"] == 3

    def test_records_multiple_categories(self, analyzer):
        analyzer.record_prompt("run tests")
        analyzer.record_prompt("fix this bug")
        analyzer.record_prompt("deploy now")
        patterns = analyzer.analyze_patterns(top_n=10)
        categories = {p["category"] for p in patterns}
        assert "test" in categories
        assert "debug" in categories
        assert "deploy" in categories

    def test_disabled_analyzer_does_not_record(self, disabled_analyzer):
        disabled_analyzer.record_prompt("run tests")
        patterns = disabled_analyzer.analyze_patterns(top_n=10)
        assert patterns == []

    def test_persists_to_disk(self, analyzer, tmp_data_dir):
        analyzer.record_prompt("run tests")
        patterns_file = os.path.join(tmp_data_dir, "patterns.json")
        assert os.path.isfile(patterns_file)
        with open(patterns_file) as f:
            data = json.load(f)
        assert data["categories"]["test"] == 1
        assert data["total"] == 1

    def test_increments_total(self, analyzer):
        analyzer.record_prompt("run tests")
        analyzer.record_prompt("fix bug")
        analyzer.record_prompt("run tests again")
        # Check total via disk
        patterns = analyzer.analyze_patterns(top_n=10)
        total = sum(p["count"] for p in patterns)
        assert total == 3

    def test_does_not_store_raw_prompt(self, analyzer, tmp_data_dir):
        analyzer.record_prompt("run the tests with my secret password")
        patterns_file = os.path.join(tmp_data_dir, "patterns.json")
        with open(patterns_file) as f:
            content = f.read()
        assert "secret password" not in content
        assert "run the tests" not in content


# --- analyze_patterns tests ---


class TestAnalyzePatterns:
    """Tests for pattern analysis."""

    def test_returns_sorted_by_count_descending(self, analyzer):
        for _ in range(5):
            analyzer.record_prompt("run tests")
        for _ in range(3):
            analyzer.record_prompt("fix bug")
        for _ in range(1):
            analyzer.record_prompt("deploy app")

        patterns = analyzer.analyze_patterns(top_n=10)
        counts = [p["count"] for p in patterns]
        assert counts == sorted(counts, reverse=True)

    def test_respects_top_n(self, analyzer):
        for _ in range(5):
            analyzer.record_prompt("run tests")
        for _ in range(3):
            analyzer.record_prompt("fix bug")
        for _ in range(1):
            analyzer.record_prompt("deploy app")

        patterns = analyzer.analyze_patterns(top_n=2)
        assert len(patterns) == 2

    def test_returns_empty_when_no_data(self, analyzer):
        patterns = analyzer.analyze_patterns(top_n=5)
        assert patterns == []

    def test_pattern_has_required_keys(self, analyzer):
        analyzer.record_prompt("run tests")
        patterns = analyzer.analyze_patterns(top_n=1)
        assert "category" in patterns[0]
        assert "count" in patterns[0]
        assert "percentage" in patterns[0]

    def test_percentage_calculation(self, analyzer):
        for _ in range(3):
            analyzer.record_prompt("run tests")
        for _ in range(7):
            analyzer.record_prompt("fix bug")

        patterns = analyzer.analyze_patterns(top_n=10)
        debug_p = [p for p in patterns if p["category"] == "debug"][0]
        assert debug_p["percentage"] == 70.0

    def test_disabled_returns_empty(self, disabled_analyzer):
        assert disabled_analyzer.analyze_patterns(top_n=5) == []


# --- suggest_shortcuts tests ---


class TestSuggestShortcuts:
    """Tests for shortcut suggestion."""

    def test_suggests_for_frequent_test_pattern(self, analyzer):
        for _ in range(5):
            analyzer.record_prompt("run tests")
        suggestions = analyzer.suggest_shortcuts(min_count=3)
        assert len(suggestions) >= 1
        assert suggestions[0]["category"] == "test"
        assert "shortcut" in suggestions[0]
        assert "skill" in suggestions[0]

    def test_respects_min_count(self, analyzer):
        analyzer.record_prompt("run tests")
        suggestions = analyzer.suggest_shortcuts(min_count=3)
        assert suggestions == []

    def test_suggests_debug_shortcut(self, analyzer):
        for _ in range(5):
            analyzer.record_prompt("fix this bug")
        suggestions = analyzer.suggest_shortcuts(min_count=3)
        found = [s for s in suggestions if s["category"] == "debug"]
        assert len(found) == 1

    def test_suggests_review_shortcut(self, analyzer):
        for _ in range(5):
            analyzer.record_prompt("review the code")
        suggestions = analyzer.suggest_shortcuts(min_count=3)
        found = [s for s in suggestions if s["category"] == "review"]
        assert len(found) == 1

    def test_disabled_returns_empty(self, disabled_analyzer):
        assert disabled_analyzer.suggest_shortcuts(min_count=1) == []

    def test_suggestion_has_required_keys(self, analyzer):
        for _ in range(5):
            analyzer.record_prompt("build project")
        suggestions = analyzer.suggest_shortcuts(min_count=3)
        assert len(suggestions) >= 1
        s = suggestions[0]
        assert "category" in s
        assert "count" in s
        assert "shortcut" in s
        assert "skill" in s
        assert "description" in s


# --- config integration tests ---


class TestConfigIntegration:
    """Tests for opt-in config behavior."""

    def test_from_config_disabled_by_default(self, tmp_data_dir):
        config = {}
        analyzer = PromptPatternAnalyzer.from_config(
            config=config, data_dir=tmp_data_dir
        )
        assert not analyzer.enabled

    def test_from_config_enabled_when_set(self, tmp_data_dir):
        config = {"promptPatternAnalysis": {"enabled": True}}
        analyzer = PromptPatternAnalyzer.from_config(
            config=config, data_dir=tmp_data_dir
        )
        assert analyzer.enabled

    def test_from_config_disabled_when_false(self, tmp_data_dir):
        config = {"promptPatternAnalysis": {"enabled": False}}
        analyzer = PromptPatternAnalyzer.from_config(
            config=config, data_dir=tmp_data_dir
        )
        assert not analyzer.enabled

    def test_from_config_custom_data_dir(self, tmp_path):
        custom_dir = str(tmp_path / "custom")
        config = {
            "promptPatternAnalysis": {
                "enabled": True,
                "dataDir": custom_dir,
            }
        }
        analyzer = PromptPatternAnalyzer.from_config(
            config=config, data_dir=str(tmp_path / "default")
        )
        analyzer.record_prompt("test something")
        assert os.path.isdir(custom_dir)
