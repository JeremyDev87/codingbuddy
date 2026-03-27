"""Tests for _read_pending_context from session-start.py (#975)."""
import os
import sys
import tempfile
import unittest

# Import the function from session-start (note: hyphen in filename)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import importlib

session_start = importlib.import_module("session-start")
_read_pending_context = session_start._read_pending_context


class TestReadPendingContext(unittest.TestCase):
    """Test context.md parsing for pending work detection."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.ctx_dir = os.path.join(self.tmpdir, "docs", "codingbuddy")
        os.makedirs(self.ctx_dir)
        self.ctx_path = os.path.join(self.ctx_dir, "context.md")

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _write_context(self, content: str):
        with open(self.ctx_path, "w", encoding="utf-8") as f:
            f.write(content)

    def test_no_context_file_returns_none(self):
        os.remove(self.ctx_path) if os.path.exists(self.ctx_path) else None
        result = _read_pending_context(self.tmpdir)
        self.assertIsNone(result)

    def test_empty_context_returns_none(self):
        self._write_context("")
        result = _read_pending_context(self.tmpdir)
        self.assertIsNone(result)

    def test_parses_plan_in_progress(self):
        self._write_context("""---
title: auth-middleware
currentMode: PLAN
status: in_progress
---

## PLAN — 21:41
task: auth middleware design
""")
        result = _read_pending_context(self.tmpdir)
        self.assertIsNotNone(result)
        self.assertEqual(result["mode"], "PLAN")
        self.assertEqual(result["status"], "in_progress")
        self.assertIn("auth middleware", result["task"])

    def test_parses_act_completed(self):
        self._write_context("""---
title: feature-x
currentMode: ACT
status: completed
---

## ACT — 22:00
task: implement feature X
""")
        result = _read_pending_context(self.tmpdir)
        self.assertIsNotNone(result)
        self.assertEqual(result["mode"], "ACT")
        self.assertEqual(result["status"], "completed")

    def test_no_frontmatter_returns_none(self):
        self._write_context("Just some random content without frontmatter")
        result = _read_pending_context(self.tmpdir)
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
