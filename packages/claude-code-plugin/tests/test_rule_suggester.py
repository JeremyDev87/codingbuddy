"""Tests for RuleSuggester — generates rule suggestions from detected patterns."""
import pytest

from hooks.lib.rule_suggester import RuleSuggester


@pytest.fixture
def suggester():
    return RuleSuggester()


SAMPLE_PATTERN = {
    "tool_name": "Bash",
    "input_summary": "npm test",
    "failure_count": 5,
    "session_count": 4,
    "first_seen": 1711000000.0,
    "last_seen": 1711300000.0,
}

SAMPLE_PATTERN_READ = {
    "tool_name": "Read",
    "input_summary": "/etc/missing-config.json",
    "failure_count": 3,
    "session_count": 3,
    "first_seen": 1711000000.0,
    "last_seen": 1711200000.0,
}


class TestEmptyInput:
    def test_returns_empty_list_for_no_patterns(self, suggester):
        """No patterns should produce no suggestions."""
        suggestions = suggester.suggest_rules([])
        assert suggestions == []


class TestRuleSuggestionContent:
    def test_suggestion_has_required_keys(self, suggester):
        """Each suggestion must have title, description, rule_content, pattern."""
        suggestions = suggester.suggest_rules([SAMPLE_PATTERN])
        assert len(suggestions) == 1
        s = suggestions[0]
        assert "title" in s
        assert "description" in s
        assert "rule_content" in s
        assert "pattern" in s

    def test_title_includes_tool_name(self, suggester):
        """Title should reference the failing tool."""
        suggestions = suggester.suggest_rules([SAMPLE_PATTERN])
        assert "Bash" in suggestions[0]["title"]

    def test_description_includes_failure_count(self, suggester):
        """Description should mention how often the failure occurred."""
        suggestions = suggester.suggest_rules([SAMPLE_PATTERN])
        assert "5" in suggestions[0]["description"]

    def test_rule_content_is_valid_markdown(self, suggester):
        """rule_content should be valid markdown with a heading."""
        suggestions = suggester.suggest_rules([SAMPLE_PATTERN])
        content = suggestions[0]["rule_content"]
        assert content.startswith("#")
        assert "Bash" in content
        assert "npm test" in content

    def test_pattern_reference_preserved(self, suggester):
        """The original pattern dict should be included."""
        suggestions = suggester.suggest_rules([SAMPLE_PATTERN])
        assert suggestions[0]["pattern"] == SAMPLE_PATTERN


class TestMultiplePatterns:
    def test_generates_one_suggestion_per_pattern(self, suggester):
        """Each pattern should produce exactly one suggestion."""
        suggestions = suggester.suggest_rules([SAMPLE_PATTERN, SAMPLE_PATTERN_READ])
        assert len(suggestions) == 2

    def test_suggestions_have_unique_titles(self, suggester):
        """Each suggestion should have a distinct title."""
        suggestions = suggester.suggest_rules([SAMPLE_PATTERN, SAMPLE_PATTERN_READ])
        titles = [s["title"] for s in suggestions]
        assert len(set(titles)) == 2


class TestRuleContentFormat:
    def test_rule_content_has_metadata_section(self, suggester):
        """Rule content should include auto-generated metadata."""
        suggestions = suggester.suggest_rules([SAMPLE_PATTERN])
        content = suggestions[0]["rule_content"]
        assert "Auto-detected" in content or "auto-detected" in content

    def test_rule_content_includes_session_count(self, suggester):
        """Rule content should mention affected sessions."""
        suggestions = suggester.suggest_rules([SAMPLE_PATTERN])
        content = suggestions[0]["rule_content"]
        assert "4" in content  # session_count

    def test_rule_content_includes_suggestion_action(self, suggester):
        """Rule content should include a suggested action or guideline."""
        suggestions = suggester.suggest_rules([SAMPLE_PATTERN])
        content = suggestions[0]["rule_content"]
        # Should have some actionable guidance
        assert any(
            keyword in content.lower()
            for keyword in ["before", "ensure", "check", "verify", "avoid", "consider"]
        )
