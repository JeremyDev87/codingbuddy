"""AgentMemory -- per-agent persistent knowledge across sessions (#947).

Stores findings, patterns, and preferences per agent in JSON files
under <data_dir>/agent_memory/.
"""
import json
import os
from typing import Optional

from data_dir import resolve_data_dir


class AgentMemory:
    MAX_ITEMS = 50

    def __init__(self, memory_dir: Optional[str] = None, max_items: int = MAX_ITEMS):
        self.memory_dir = memory_dir or os.path.join(resolve_data_dir(), "agent_memory")
        self.max_items = max_items

    def _filepath(self, agent_name: str) -> str:
        return os.path.join(self.memory_dir, f"{agent_name}.json")

    def _empty(self) -> dict:
        return {"findings": [], "patterns": [], "preferences": []}

    def load(self, agent_name: str) -> dict:
        filepath = self._filepath(agent_name)
        if not os.path.isfile(filepath):
            return self._empty()
        try:
            with open(filepath, "r") as f:
                data = json.load(f)
            if not isinstance(data, dict):
                return self._empty()
            for key in ("findings", "patterns", "preferences"):
                if key not in data or not isinstance(data[key], list):
                    data[key] = []
            return data
        except (json.JSONDecodeError, OSError):
            return self._empty()

    def save(self, agent_name: str, memory: dict) -> None:
        os.makedirs(self.memory_dir, exist_ok=True)
        filepath = self._filepath(agent_name)
        with open(filepath, "w") as f:
            json.dump(memory, f, indent=2, ensure_ascii=False)

    def _add_entry(self, agent_name: str, category: str, entry: dict) -> None:
        data = self.load(agent_name)
        data[category].append(entry)
        if len(data[category]) > self.max_items:
            data[category] = data[category][-self.max_items:]
        self.save(agent_name, data)

    def add_finding(self, agent_name: str, finding: dict) -> None:
        self._add_entry(agent_name, "findings", finding)

    def add_pattern(self, agent_name: str, pattern: dict) -> None:
        self._add_entry(agent_name, "patterns", pattern)

    def add_preference(self, agent_name: str, preference: dict) -> None:
        self._add_entry(agent_name, "preferences", preference)

    def get_context_prompt(self, agent_name: str) -> str:
        data = self.load(agent_name)
        if not any(data[k] for k in ("findings", "patterns", "preferences")):
            return ""
        parts = []
        if data["findings"]:
            parts.append("## Previous Findings")
            for f in data["findings"]:
                parts.append(f"- {json.dumps(f, ensure_ascii=False)}")
        if data["patterns"]:
            parts.append("## Recognized Patterns")
            for p in data["patterns"]:
                parts.append(f"- {json.dumps(p, ensure_ascii=False)}")
        if data["preferences"]:
            parts.append("## Agent Preferences")
            for p in data["preferences"]:
                parts.append(f"- {json.dumps(p, ensure_ascii=False)}")
        return "\n".join(parts)

    def get_council_context(self, agent_names: list) -> str:
        """Get combined context prompts for a list of specialists (#1435).

        Returns a formatted block suitable for hook output injection.
        Only includes agents that have prior findings.

        Args:
            agent_names: List of specialist agent names.

        Returns:
            Formatted markdown with memory context, or empty string.
        """
        sections = []
        returning = []
        for name in agent_names:
            prompt = self.get_context_prompt(name)
            if prompt:
                returning.append(name)
                sections.append(f"### {name} (returning)\n{prompt}")
        if not sections:
            return ""
        header = (
            f"# Agent Council Memory\n"
            f"The following {len(returning)} specialist(s) have prior findings "
            f"from previous sessions. Include this context when dispatching them.\n"
        )
        return header + "\n\n".join(sections)

    def clear(self, agent_name: str) -> None:
        filepath = self._filepath(agent_name)
        if os.path.isfile(filepath):
            os.remove(filepath)

    def list_agents(self) -> list:
        if not os.path.isdir(self.memory_dir):
            return []
        return sorted(
            os.path.splitext(f)[0]
            for f in os.listdir(self.memory_dir)
            if f.endswith(".json")
        )
