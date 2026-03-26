"""Tests for AgentMemory — per-agent persistent knowledge across sessions (#947)."""
import json
import os
import sys
import pytest

# Ensure hooks/lib is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from agent_memory import AgentMemory


@pytest.fixture
def memory_dir(tmp_path):
    """Temp directory for agent memory files."""
    d = tmp_path / "agent_memory"
    d.mkdir()
    return str(d)


@pytest.fixture
def mem(memory_dir):
    return AgentMemory(memory_dir=memory_dir)


class TestLoad:
    def test_load_returns_empty_structure_for_new_agent(self, mem):
        """Loading a non-existent agent should return empty findings/patterns/preferences."""
        result = mem.load("security-specialist")
        assert result == {"findings": [], "patterns": [], "preferences": []}

    def test_load_returns_saved_data(self, mem):
        """Loading an existing agent should return its saved data."""
        data = {
            "findings": [{"issue": "SQL injection in login"}],
            "patterns": [],
            "preferences": [],
        }
        mem.save("security-specialist", data)
        result = mem.load("security-specialist")
        assert result == data

    def test_load_recovers_from_invalid_json(self, mem, memory_dir):
        """Loading a corrupted JSON file should return empty structure."""
        filepath = os.path.join(memory_dir, "broken-agent.json")
        with open(filepath, "w") as f:
            f.write("{invalid json content")
        result = mem.load("broken-agent")
        assert result == {"findings": [], "patterns": [], "preferences": []}


class TestSave:
    def test_save_creates_directory_if_missing(self, tmp_path):
        """Save should create the memory directory if it doesn't exist."""
        new_dir = str(tmp_path / "nonexistent" / "agent_memory")
        mem = AgentMemory(memory_dir=new_dir)
        mem.save("test-agent", {"findings": [], "patterns": [], "preferences": []})
        assert os.path.isdir(new_dir)

    def test_save_writes_valid_json(self, mem, memory_dir):
        """Saved file should contain valid JSON matching the input data."""
        data = {
            "findings": [{"issue": "XSS"}],
            "patterns": [{"name": "unsanitized input"}],
            "preferences": [{"style": "strict CSP"}],
        }
        mem.save("web-specialist", data)
        filepath = os.path.join(memory_dir, "web-specialist.json")
        with open(filepath) as f:
            loaded = json.load(f)
        assert loaded == data


class TestAddFinding:
    def test_add_finding_appends_to_list(self, mem):
        """Adding a finding should append it to the agent's findings list."""
        mem.add_finding("sec-agent", {"issue": "hardcoded secret"})
        mem.add_finding("sec-agent", {"issue": "open redirect"})
        data = mem.load("sec-agent")
        assert len(data["findings"]) == 2
        assert data["findings"][0]["issue"] == "hardcoded secret"
        assert data["findings"][1]["issue"] == "open redirect"

    def test_add_finding_fifo_eviction(self, tmp_path):
        """When findings exceed max_items, oldest should be evicted (FIFO)."""
        mem = AgentMemory(memory_dir=str(tmp_path / "mem"), max_items=3)
        for i in range(5):
            mem.add_finding("agent", {"id": i})
        data = mem.load("agent")
        assert len(data["findings"]) == 3
        assert data["findings"][0]["id"] == 2
        assert data["findings"][2]["id"] == 4


class TestAddPattern:
    def test_add_pattern_appends(self, mem):
        """Adding a pattern should append it to the agent's patterns list."""
        mem.add_pattern("qa-agent", {"name": "flaky retry"})
        data = mem.load("qa-agent")
        assert len(data["patterns"]) == 1
        assert data["patterns"][0]["name"] == "flaky retry"

    def test_add_pattern_fifo_eviction(self, tmp_path):
        """When patterns exceed max_items, oldest should be evicted (FIFO)."""
        mem = AgentMemory(memory_dir=str(tmp_path / "mem"), max_items=2)
        for i in range(4):
            mem.add_pattern("agent", {"id": i})
        data = mem.load("agent")
        assert len(data["patterns"]) == 2
        assert data["patterns"][0]["id"] == 2


class TestAddPreference:
    def test_add_preference_appends(self, mem):
        """Adding a preference should append it to the agent's preferences list."""
        mem.add_preference("code-reviewer", {"style": "verbose comments"})
        data = mem.load("code-reviewer")
        assert len(data["preferences"]) == 1

    def test_add_preference_fifo_eviction(self, tmp_path):
        """When preferences exceed max_items, oldest should be evicted (FIFO)."""
        mem = AgentMemory(memory_dir=str(tmp_path / "mem"), max_items=2)
        for i in range(3):
            mem.add_preference("agent", {"id": i})
        data = mem.load("agent")
        assert len(data["preferences"]) == 2
        assert data["preferences"][0]["id"] == 1


class TestGetContextPrompt:
    def test_returns_empty_string_for_new_agent(self, mem):
        """Context prompt for agent with no memory should be empty string."""
        result = mem.get_context_prompt("unknown-agent")
        assert result == ""

    def test_returns_formatted_context(self, mem):
        """Context prompt should include findings, patterns, and preferences."""
        mem.add_finding("sec", {"issue": "SQL injection"})
        mem.add_pattern("sec", {"name": "unsanitized input"})
        mem.add_preference("sec", {"style": "parameterized queries"})
        result = mem.get_context_prompt("sec")
        assert "SQL injection" in result
        assert "unsanitized input" in result
        assert "parameterized queries" in result


class TestClear:
    def test_clear_removes_agent_memory(self, mem):
        """Clear should remove all memory for an agent."""
        mem.add_finding("agent", {"issue": "test"})
        mem.clear("agent")
        data = mem.load("agent")
        assert data == {"findings": [], "patterns": [], "preferences": []}

    def test_clear_nonexistent_agent_no_error(self, mem):
        """Clearing a non-existent agent should not raise."""
        mem.clear("ghost-agent")  # Should not raise


class TestListAgents:
    def test_list_agents_empty(self, mem):
        """List agents should return empty list when no memories exist."""
        assert mem.list_agents() == []

    def test_list_agents_returns_saved_agents(self, mem):
        """List agents should return names of all agents with saved memory."""
        mem.save("agent-a", {"findings": [], "patterns": [], "preferences": []})
        mem.save("agent-b", {"findings": [], "patterns": [], "preferences": []})
        agents = mem.list_agents()
        assert sorted(agents) == ["agent-a", "agent-b"]
