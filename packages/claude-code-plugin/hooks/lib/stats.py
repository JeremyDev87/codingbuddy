"""Operational statistics tracker for CodingBuddy plugin (#825).

Tracks tool call count, tool names, errors, and session duration.
Uses fcntl.flock() for file-level locking on every IO operation.
"""
import json
import os
import time
from typing import Any, Dict, List, Optional

try:
    import fcntl
    HAS_FCNTL = True
except ImportError:
    HAS_FCNTL = False

DEFAULT_DATA_DIR = os.path.join(os.path.expanduser("~"), ".codingbuddy")


class SessionStats:
    """Track operational metrics for a Claude Code session."""

    def __init__(self, session_id: str, data_dir: Optional[str] = None, flush_interval: int = 10):
        """Initialize stats tracker.

        Args:
            session_id: Unique session identifier.
            data_dir: Directory for stats files.
                      Uses CLAUDE_PLUGIN_DATA env or ~/.codingbuddy.
            flush_interval: Number of record_tool_call() invocations between
                           automatic disk flushes. Default 10.
        """
        self.session_id = session_id
        self._flush_interval = flush_interval
        self._pending_count = 0

        if data_dir is None:
            data_dir = os.environ.get("CLAUDE_PLUGIN_DATA", DEFAULT_DATA_DIR)

        self.data_dir = data_dir
        os.makedirs(self.data_dir, mode=0o700, exist_ok=True)
        # Fix permissions if dir already existed
        os.chmod(self.data_dir, 0o700)

        self.stats_file = os.path.join(self.data_dir, f"{session_id}.json")

        # Initialize file if it doesn't exist
        if not os.path.exists(self.stats_file):
            self._locked_write({
                "session_id": session_id,
                "started_at": time.time(),
                "tool_count": 0,
                "error_count": 0,
                "tool_names": {},
                "hook_timings": {},
            })

        # In-memory accumulator — deltas since last flush
        self._mem_tool_count = 0
        self._mem_error_count = 0
        self._mem_tool_names: Dict[str, int] = {}
        self._mem_hook_timings: Dict[str, List[float]] = {}

    def record_hook_timing(self, hook_name: str, elapsed_ms: float) -> None:
        """Record a hook execution timing in memory.

        Args:
            hook_name: Name of the hook (e.g. 'PreToolUse').
            elapsed_ms: Elapsed time in milliseconds.
        """
        if hook_name not in self._mem_hook_timings:
            self._mem_hook_timings[hook_name] = []
        self._mem_hook_timings[hook_name].append(elapsed_ms)
        self._pending_count += 1

    def record_tool_call(self, tool_name: str, success: bool = True) -> None:
        """Record a tool call in memory. Flushes to disk every flush_interval calls.

        Args:
            tool_name: Name of the tool called.
            success: Whether the tool call succeeded.
        """
        self._mem_tool_count += 1
        if not success:
            self._mem_error_count += 1
        self._mem_tool_names[tool_name] = self._mem_tool_names.get(tool_name, 0) + 1

        self._pending_count += 1
        if self._pending_count >= self._flush_interval:
            self.flush()

    def flush(self) -> None:
        """Flush accumulated in-memory stats to disk."""
        if self._pending_count == 0:
            return
        data = self._locked_read()
        data["tool_count"] = data.get("tool_count", 0) + self._mem_tool_count
        data["error_count"] = data.get("error_count", 0) + self._mem_error_count
        tool_names = data.get("tool_names", {})
        for name, count in self._mem_tool_names.items():
            tool_names[name] = tool_names.get(name, 0) + count
        data["tool_names"] = tool_names
        # Merge hook timings
        hook_timings = data.get("hook_timings", {})
        for name, times in self._mem_hook_timings.items():
            if name not in hook_timings:
                hook_timings[name] = []
            hook_timings[name].extend(times)
        data["hook_timings"] = hook_timings
        self._locked_write(data)
        # Reset in-memory accumulators
        self._mem_tool_count = 0
        self._mem_error_count = 0
        self._mem_tool_names = {}
        self._mem_hook_timings = {}
        self._pending_count = 0

    def _merged_data(self) -> Dict[str, Any]:
        """Return disk data merged with in-memory deltas (read-only)."""
        data = self._locked_read()
        data["tool_count"] = data.get("tool_count", 0) + self._mem_tool_count
        data["error_count"] = data.get("error_count", 0) + self._mem_error_count
        tool_names = dict(data.get("tool_names", {}))
        for name, count in self._mem_tool_names.items():
            tool_names[name] = tool_names.get(name, 0) + count
        data["tool_names"] = tool_names
        # Merge hook timings
        hook_timings = dict(data.get("hook_timings", {}))
        for name, times in self._mem_hook_timings.items():
            if name not in hook_timings:
                hook_timings[name] = []
            hook_timings[name] = hook_timings[name] + times
        data["hook_timings"] = hook_timings
        return data

    def format_summary(self) -> str:
        """Format a human-readable summary.

        Returns:
            String like '[CB] Xm | Y tools | Z errors | Bash:N Edit:M'
        """
        data = self._merged_data()
        duration = time.time() - data.get("started_at", time.time())
        minutes = int(duration // 60)
        tool_count = data.get("tool_count", 0)
        error_count = data.get("error_count", 0)
        tool_names = data.get("tool_names", {})

        error_word = "error" if error_count == 1 else "errors"

        # Top tools sorted by count descending
        sorted_tools = sorted(tool_names.items(), key=lambda x: x[1], reverse=True)
        tools_str = " ".join(f"{name}:{count}" for name, count in sorted_tools[:5])

        summary = f"[CB] {minutes}m | {tool_count} tools | {error_count} {error_word} | {tools_str}"

        # Append hook timing report if any timings exist
        hook_timings = data.get("hook_timings", {})
        if hook_timings:
            timing_parts = []
            for name, timings in sorted(hook_timings.items()):
                avg = sum(timings) / len(timings)
                timing_parts.append(f"{name}:{avg:.0f}ms")
            summary += f" | \u23f1 {' '.join(timing_parts)}"

        return summary

    def finalize(self) -> Dict[str, Any]:
        """Finalize session stats, return data, and cleanup file.

        Returns:
            Dict with session stats.
        """
        self.flush()
        data = self._locked_read()
        duration = time.time() - data.get("started_at", time.time())
        data["duration_seconds"] = duration

        # Compute hook timing statistics
        hook_timings = data.get("hook_timings", {})
        if hook_timings:
            hook_timing_stats: Dict[str, Any] = {}
            for name, timings in hook_timings.items():
                sorted_t = sorted(timings)
                count = len(sorted_t)
                avg_ms = sum(sorted_t) / count
                p95_idx = min(int(count * 0.95), count - 1)
                hook_timing_stats[name] = {
                    "count": count,
                    "avg_ms": round(avg_ms, 2),
                    "p95_ms": round(sorted_t[p95_idx], 2),
                    "max_ms": round(sorted_t[-1], 2),
                }
            data["hook_timing_stats"] = hook_timing_stats

        # Cleanup stats file
        try:
            os.remove(self.stats_file)
        except OSError:
            pass

        return data

    @staticmethod
    def cleanup_stale(data_dir: str, max_age_hours: int = 24) -> None:
        """Remove stale stats files older than max_age_hours.

        Args:
            data_dir: Directory containing stats files.
            max_age_hours: Maximum age in hours before cleanup.
        """
        if not os.path.isdir(data_dir):
            return

        cutoff = time.time() - (max_age_hours * 3600)

        for filename in os.listdir(data_dir):
            if not filename.endswith(".json"):
                continue
            filepath = os.path.join(data_dir, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    if HAS_FCNTL:
                        fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                    data = json.load(f)
                started_at = data.get("started_at", 0)
                if started_at < cutoff:
                    os.remove(filepath)
            except (json.JSONDecodeError, OSError, KeyError):
                # Corrupted or inaccessible — try to remove
                try:
                    os.remove(filepath)
                except OSError:
                    pass

    def _locked_read(self) -> Dict[str, Any]:
        """Read stats file with file locking."""
        try:
            with open(self.stats_file, "r", encoding="utf-8") as f:
                if HAS_FCNTL:
                    fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {
                "session_id": self.session_id,
                "started_at": time.time(),
                "tool_count": 0,
                "error_count": 0,
                "tool_names": {},
                "hook_timings": {},
            }

    def _locked_write(self, data: Dict[str, Any]) -> None:
        """Write stats file with file locking."""
        with open(self.stats_file, "w", encoding="utf-8") as f:
            if HAS_FCNTL:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            json.dump(data, f)
