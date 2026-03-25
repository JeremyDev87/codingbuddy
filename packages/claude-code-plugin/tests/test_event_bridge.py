"""Tests for EventBridge — file-based event emission for Plugin→MCP communication."""
import json
import os
import stat
import tempfile

import pytest

from hooks.lib.event_bridge import EventBridge, EVENT_TYPES


@pytest.fixture
def events_dir():
    """Create a temporary directory for event files."""
    d = tempfile.mkdtemp()
    yield d
    # Cleanup
    for f in os.listdir(d):
        os.remove(os.path.join(d, f))
    os.rmdir(d)


@pytest.fixture
def bridge(events_dir):
    """Create an EventBridge instance with a temp events directory."""
    return EventBridge(session_id="test-session-1", events_dir=events_dir)


class TestEventTypes:
    def test_event_types_contains_required_types(self):
        """EVENT_TYPES must include all five required event types."""
        required = {"tool_call", "session_start", "session_end", "pattern_detected", "rule_suggested"}
        assert required.issubset(set(EVENT_TYPES))

    def test_emit_rejects_unknown_event_type(self, bridge):
        """emit() should raise ValueError for unknown event types."""
        with pytest.raises(ValueError, match="Unknown event type"):
            bridge.emit("unknown_type", {"data": 1})


class TestEmit:
    def test_emit_creates_session_file(self, bridge, events_dir):
        """First emit should create the session JSONL file."""
        bridge.emit("session_start", {})
        path = os.path.join(events_dir, "test-session-1.jsonl")
        assert os.path.exists(path)

    def test_emit_appends_json_line(self, bridge, events_dir):
        """Each emit should append exactly one JSON line."""
        bridge.emit("tool_call", {"tool_name": "Bash", "success": True})
        bridge.emit("tool_call", {"tool_name": "Read", "success": True})

        path = os.path.join(events_dir, "test-session-1.jsonl")
        with open(path, "r") as f:
            lines = f.readlines()
        assert len(lines) == 2

    def test_emit_writes_valid_json_with_schema(self, bridge, events_dir):
        """Each line must be valid JSON with ts, type, session_id, payload."""
        bridge.emit("tool_call", {"tool_name": "Bash", "success": True})

        path = os.path.join(events_dir, "test-session-1.jsonl")
        with open(path, "r") as f:
            event = json.loads(f.readline())

        assert "ts" in event
        assert event["type"] == "tool_call"
        assert event["session_id"] == "test-session-1"
        assert event["payload"] == {"tool_name": "Bash", "success": True}

    def test_emit_timestamp_is_iso8601(self, bridge, events_dir):
        """Timestamp must be ISO 8601 format."""
        bridge.emit("session_start", {})

        path = os.path.join(events_dir, "test-session-1.jsonl")
        with open(path, "r") as f:
            event = json.loads(f.readline())

        # ISO 8601 should contain 'T' and end with timezone info or 'Z'
        from datetime import datetime
        ts = event["ts"]
        # Should parse without error
        datetime.fromisoformat(ts.replace("Z", "+00:00"))


class TestFilePermissions:
    def test_file_created_with_0600_permissions(self, bridge, events_dir):
        """Event file must be created with 0o600 permissions."""
        bridge.emit("session_start", {})

        path = os.path.join(events_dir, "test-session-1.jsonl")
        file_stat = os.stat(path)
        mode = stat.S_IMODE(file_stat.st_mode)
        assert mode == 0o600


class TestDirectoryCreation:
    def test_auto_creates_events_directory(self):
        """EventBridge should create events directory if it doesn't exist."""
        with tempfile.TemporaryDirectory() as tmp:
            nested = os.path.join(tmp, "nested", "events")
            bridge = EventBridge(session_id="s1", events_dir=nested)
            bridge.emit("session_start", {})
            assert os.path.isdir(nested)
            # Cleanup
            os.remove(os.path.join(nested, "s1.jsonl"))


class TestCleanup:
    def test_cleanup_removes_session_file(self, bridge, events_dir):
        """cleanup() should remove the session's JSONL file."""
        bridge.emit("session_start", {})
        path = os.path.join(events_dir, "test-session-1.jsonl")
        assert os.path.exists(path)

        bridge.cleanup()
        assert not os.path.exists(path)

    def test_cleanup_noop_when_no_file(self, bridge):
        """cleanup() should not raise when no file exists."""
        bridge.cleanup()  # Should not raise


class TestDefaultEventsDir:
    def test_default_events_dir_uses_home(self):
        """Default events_dir should be ~/.codingbuddy/events/."""
        bridge = EventBridge(session_id="s1")
        expected = os.path.join(os.path.expanduser("~"), ".codingbuddy", "events")
        assert bridge.events_dir == expected
