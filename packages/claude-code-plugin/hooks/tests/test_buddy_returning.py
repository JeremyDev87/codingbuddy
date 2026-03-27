"""Tests for buddy_renderer returning session rendering (#975)."""
import os
import sys
import unittest

sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), "..", "lib")
)

from buddy_renderer import (
    render_returning_session,
    render_session_start,
    BUDDY_FACE,
)


class TestRenderReturningSession(unittest.TestCase):
    """Test render_returning_session for welcome-back display."""

    def _make_prev_session(self, **overrides):
        base = {
            "session_id": "sess-1",
            "started_at": 1711500000.0,
            "ended_at": 1711503600.0,
            "tool_call_count": 15,
            "error_count": 1,
            "outcome": "completed",
        }
        base.update(overrides)
        return base

    def test_renders_welcome_back_casual_en(self):
        prev = self._make_prev_session()
        result = render_returning_session(prev, None, "casual", "en")
        self.assertIn("back", result.lower())
        self.assertIn(BUDDY_FACE, result)

    def test_renders_welcome_back_casual_ko(self):
        prev = self._make_prev_session()
        result = render_returning_session(prev, None, "casual", "ko")
        self.assertIn("돌아오셨", result)

    def test_renders_welcome_back_formal_en(self):
        prev = self._make_prev_session()
        result = render_returning_session(prev, None, "formal", "en")
        self.assertIn("Welcome back", result)

    def test_shows_session_stats(self):
        prev = self._make_prev_session(tool_call_count=25, error_count=2)
        result = render_returning_session(prev, None, "casual", "en")
        self.assertIn("25", result)

    def test_shows_pending_context(self):
        prev = self._make_prev_session()
        context = {"mode": "PLAN", "task": "auth middleware design", "status": "in_progress"}
        result = render_returning_session(prev, context, "casual", "en")
        self.assertIn("PLAN", result)
        self.assertIn("auth middleware", result)

    def test_no_context_still_renders(self):
        prev = self._make_prev_session()
        result = render_returning_session(prev, None, "casual", "en")
        self.assertIsInstance(result, str)
        self.assertTrue(len(result) > 0)

    def test_tone_formal_ko(self):
        prev = self._make_prev_session()
        result = render_returning_session(prev, None, "formal", "ko")
        self.assertIn("다시 오셨", result)


class TestRenderSessionStartWithReturning(unittest.TestCase):
    """Test render_session_start accepts optional returning session data."""

    def test_without_returning_data_unchanged(self):
        scan = {"name": "my-app", "framework": "NestJS"}
        result = render_session_start(scan, [], "casual", "en")
        self.assertIn("my-app", result)
        self.assertIn(BUDDY_FACE, result)

    def test_with_returning_data_shows_welcome_back(self):
        scan = {"name": "my-app", "framework": "NestJS"}
        prev = {
            "session_id": "sess-1",
            "started_at": 1711500000.0,
            "ended_at": 1711503600.0,
            "tool_call_count": 10,
            "error_count": 0,
            "outcome": "completed",
        }
        result = render_session_start(
            scan, [], "casual", "en",
            previous_session=prev,
        )
        self.assertIn("back", result.lower())


if __name__ == "__main__":
    unittest.main()
