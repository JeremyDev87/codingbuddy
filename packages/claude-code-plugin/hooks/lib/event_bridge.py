"""File-based event bridge for Plugin(Python) → MCP(TypeScript) communication.

Emits events as JSON lines to ~/.codingbuddy/events/<session_id>.jsonl.
"""
import json
import os
from datetime import datetime, timezone
from typing import Optional

EVENT_TYPES = (
    "tool_call",
    "session_start",
    "session_end",
    "pattern_detected",
    "rule_suggested",
)


class EventBridge:
    """Append-only JSON-lines event emitter for a single session."""

    def __init__(self, session_id: str, events_dir: Optional[str] = None):
        self.session_id = session_id
        self.events_dir = events_dir or os.path.join(
            os.path.expanduser("~"), ".codingbuddy", "events"
        )

    @property
    def _file_path(self) -> str:
        return os.path.join(self.events_dir, f"{self.session_id}.jsonl")

    def emit(self, event_type: str, payload: dict) -> None:
        """Append one JSON-line event to the session file.

        Args:
            event_type: One of EVENT_TYPES.
            payload: Arbitrary dict attached to the event.

        Raises:
            ValueError: If event_type is not in EVENT_TYPES.
        """
        if event_type not in EVENT_TYPES:
            raise ValueError(f"Unknown event type: {event_type}")

        os.makedirs(self.events_dir, exist_ok=True)

        event = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "type": event_type,
            "session_id": self.session_id,
            "payload": payload,
        }

        # Open with restricted permissions; create if needed
        fd = os.open(
            self._file_path,
            os.O_WRONLY | os.O_CREAT | os.O_APPEND,
            0o600,
        )
        try:
            os.write(fd, (json.dumps(event) + "\n").encode())
        finally:
            os.close(fd)

    def cleanup(self) -> None:
        """Remove the session event file if it exists."""
        try:
            os.remove(self._file_path)
        except FileNotFoundError:
            pass
