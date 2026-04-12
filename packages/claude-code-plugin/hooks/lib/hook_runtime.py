"""Hook execution timing context manager (#1494).

Records hook elapsed time via SessionStats.record_hook_timing(), flushing
to disk so the Stop hook summary can surface the ⏱ timing report.
"""
import time
from contextlib import contextmanager
from typing import Optional


@contextmanager
def time_hook(
    hook_name: str,
    *,
    session_id: Optional[str] = None,
    data_dir: Optional[str] = None,
):
    """Context manager that records hook execution time.

    Wraps hook logic with monotonic clock measurements and persists the
    elapsed milliseconds to disk via SessionStats.  Recording failures
    are silently swallowed so hook execution is never blocked.

    Args:
        hook_name: Claude Code event name (e.g. 'PostToolUse').
        session_id: Explicit session ID.  If None, resolved via
                    session_utils.get_session_id().
        data_dir: Stats directory override (mainly for tests).

    Usage::

        with time_hook("PostToolUse"):
            # ... hook logic ...
    """
    start = time.monotonic()
    try:
        yield
    finally:
        try:
            elapsed_ms = (time.monotonic() - start) * 1000
            if session_id is None:
                from session_utils import get_session_id
                session_id = get_session_id()
            from stats import SessionStats
            kwargs = {"session_id": session_id}
            if data_dir is not None:
                kwargs["data_dir"] = data_dir
            stats = SessionStats(**kwargs)
            stats.record_hook_timing(hook_name, elapsed_ms)
            stats.flush()
        except Exception:
            pass  # Never block tool execution
