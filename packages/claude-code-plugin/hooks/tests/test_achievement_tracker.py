"""Tests for achievement_tracker module (#1008)."""
import json
import os
import sys
import tempfile
import time

import pytest

# Add lib to path
_hooks_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_lib_dir = os.path.join(_hooks_dir, "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from achievement_tracker import (
    ACHIEVEMENT_DEFINITIONS,
    AchievementTracker,
    get_achievement_by_id,
    get_achievement_definitions,
    render_achievement_badges,
    render_achievement_celebration,
    render_batch_celebration,
)


@pytest.fixture
def tmp_data_dir(tmp_path):
    """Provide a temporary data directory for tests."""
    return str(tmp_path)


@pytest.fixture
def tracker(tmp_data_dir):
    """Provide an AchievementTracker with temp directory."""
    return AchievementTracker(data_dir=tmp_data_dir)


class TestAchievementDefinitions:
    """Test achievement definition helpers."""

    def test_get_all_definitions(self):
        defs = get_achievement_definitions()
        assert len(defs) == 5
        ids = {d["id"] for d in defs}
        assert ids == {
            "tdd_champion",
            "agent_master",
            "quality_guard",
            "speed_coder",
            "streak",
        }

    def test_get_by_id_found(self):
        defn = get_achievement_by_id("tdd_champion")
        assert defn is not None
        assert defn["name"] == "TDD Champion"
        assert defn["threshold"] == 100

    def test_get_by_id_not_found(self):
        assert get_achievement_by_id("nonexistent") is None

    def test_definitions_have_required_fields(self):
        for defn in ACHIEVEMENT_DEFINITIONS:
            assert "id" in defn
            assert "name" in defn
            assert "description" in defn
            assert "metric" in defn
            assert "threshold" in defn
            assert "icon" in defn
            assert "face" in defn


class TestAchievementTracker:
    """Test AchievementTracker class."""

    def test_init_creates_directories(self, tmp_data_dir):
        tracker = AchievementTracker(data_dir=tmp_data_dir)
        assert os.path.isdir(os.path.join(tmp_data_dir, "achievements"))

    def test_init_creates_progress_file(self, tracker, tmp_data_dir):
        progress_file = os.path.join(tmp_data_dir, "achievements", "progress.json")
        assert os.path.exists(progress_file)

    def test_init_creates_unlocked_file(self, tracker, tmp_data_dir):
        unlocked_file = os.path.join(tmp_data_dir, "achievements", "unlocked.json")
        assert os.path.exists(unlocked_file)

    def test_default_progress(self, tracker):
        progress = tracker.get_progress()
        assert progress["tdd_cycles"] == 0
        assert progress["unique_agents"] == []
        assert progress["max_eval_score"] == 0
        assert progress["max_commits_per_hour"] == 0

    def test_default_unlocked_empty(self, tracker):
        assert tracker.get_unlocked() == []


class TestRecordTddCycle:
    """Test TDD cycle recording."""

    def test_record_increments(self, tracker):
        tracker.record_tdd_cycle()
        assert tracker.get_progress()["tdd_cycles"] == 1

    def test_record_multiple(self, tracker):
        for _ in range(5):
            tracker.record_tdd_cycle()
        assert tracker.get_progress()["tdd_cycles"] == 5


class TestRecordAgentUsage:
    """Test agent usage recording."""

    def test_record_new_agent(self, tracker):
        tracker.record_agent_usage("security-specialist")
        agents = tracker.get_progress()["unique_agents"]
        assert "security-specialist" in agents

    def test_record_duplicate_agent(self, tracker):
        tracker.record_agent_usage("test-engineer")
        tracker.record_agent_usage("test-engineer")
        agents = tracker.get_progress()["unique_agents"]
        assert agents.count("test-engineer") == 1

    def test_record_multiple_agents(self, tracker):
        for name in ["agent-a", "agent-b", "agent-c"]:
            tracker.record_agent_usage(name)
        agents = tracker.get_progress()["unique_agents"]
        assert len(agents) == 3

    def test_record_empty_name_ignored(self, tracker):
        tracker.record_agent_usage("")
        assert tracker.get_progress()["unique_agents"] == []


class TestRecordEvalScore:
    """Test eval score recording."""

    def test_record_score(self, tracker):
        tracker.record_eval_score(85)
        assert tracker.get_progress()["max_eval_score"] == 85

    def test_keeps_max_score(self, tracker):
        tracker.record_eval_score(85)
        tracker.record_eval_score(92)
        tracker.record_eval_score(80)
        assert tracker.get_progress()["max_eval_score"] == 92


class TestRecordCommit:
    """Test commit recording."""

    def test_record_commit(self, tracker):
        tracker.record_commit()
        progress = tracker.get_progress()
        assert len(progress["commit_timestamps"]) == 1
        assert progress["max_commits_per_hour"] == 1

    def test_multiple_commits_in_hour(self, tracker):
        # Manually set timestamps within 1 hour
        progress = tracker.get_progress()
        now = time.time()
        progress["commit_timestamps"] = [now - 600 * i for i in range(5)]
        tracker._locked_write(tracker.progress_file, progress)
        tracker.record_commit()
        progress = tracker.get_progress()
        assert progress["max_commits_per_hour"] >= 5


class TestRecordSession:
    """Test session date recording."""

    def test_record_session_adds_today(self, tracker):
        tracker.record_session()
        dates = tracker.get_progress()["session_dates"]
        today = time.strftime("%Y-%m-%d")
        assert today in dates

    def test_record_session_no_duplicates(self, tracker):
        tracker.record_session()
        tracker.record_session()
        dates = tracker.get_progress()["session_dates"]
        today = time.strftime("%Y-%m-%d")
        assert dates.count(today) == 1


class TestCheckAchievements:
    """Test achievement unlock detection."""

    def test_no_achievements_at_start(self, tracker):
        newly = tracker.check_achievements()
        assert newly == []

    def test_tdd_champion_unlock(self, tracker):
        progress = tracker.get_progress()
        progress["tdd_cycles"] = 100
        tracker._locked_write(tracker.progress_file, progress)

        newly = tracker.check_achievements()
        assert len(newly) == 1
        assert newly[0]["id"] == "tdd_champion"

    def test_agent_master_unlock(self, tracker):
        progress = tracker.get_progress()
        progress["unique_agents"] = [f"agent-{i}" for i in range(10)]
        tracker._locked_write(tracker.progress_file, progress)

        newly = tracker.check_achievements()
        assert any(a["id"] == "agent_master" for a in newly)

    def test_quality_guard_unlock(self, tracker):
        progress = tracker.get_progress()
        progress["max_eval_score"] = 95
        tracker._locked_write(tracker.progress_file, progress)

        newly = tracker.check_achievements()
        assert any(a["id"] == "quality_guard" for a in newly)

    def test_speed_coder_unlock(self, tracker):
        progress = tracker.get_progress()
        progress["max_commits_per_hour"] = 6
        tracker._locked_write(tracker.progress_file, progress)

        newly = tracker.check_achievements()
        assert any(a["id"] == "speed_coder" for a in newly)

    def test_streak_unlock(self, tracker):
        progress = tracker.get_progress()
        progress["max_streak_days"] = 5
        tracker._locked_write(tracker.progress_file, progress)

        newly = tracker.check_achievements()
        assert any(a["id"] == "streak" for a in newly)

    def test_already_unlocked_not_repeated(self, tracker):
        progress = tracker.get_progress()
        progress["tdd_cycles"] = 200
        tracker._locked_write(tracker.progress_file, progress)

        first = tracker.check_achievements()
        assert len(first) == 1

        second = tracker.check_achievements()
        assert second == []

    def test_unlocked_persisted(self, tracker, tmp_data_dir):
        progress = tracker.get_progress()
        progress["tdd_cycles"] = 100
        tracker._locked_write(tracker.progress_file, progress)
        tracker.check_achievements()

        # New tracker instance reads persisted data
        tracker2 = AchievementTracker(data_dir=tmp_data_dir)
        unlocked = tracker2.get_unlocked()
        assert len(unlocked) == 1
        assert unlocked[0]["id"] == "tdd_champion"


class TestStreakCalculation:
    """Test streak calculation logic."""

    def test_empty_dates(self):
        assert AchievementTracker._calculate_streak([]) == 0

    def test_single_date(self):
        assert AchievementTracker._calculate_streak(["2026-03-28"]) == 1

    def test_consecutive_days(self):
        dates = ["2026-03-24", "2026-03-25", "2026-03-26", "2026-03-27", "2026-03-28"]
        assert AchievementTracker._calculate_streak(dates) == 5

    def test_broken_streak(self):
        dates = ["2026-03-24", "2026-03-25", "2026-03-27", "2026-03-28"]
        assert AchievementTracker._calculate_streak(dates) == 2

    def test_duplicate_dates(self):
        dates = ["2026-03-27", "2026-03-27", "2026-03-28"]
        assert AchievementTracker._calculate_streak(dates) == 2


class TestMaxCommitsInWindow:
    """Test sliding window commit calculation."""

    def test_empty(self):
        assert AchievementTracker._max_commits_in_window([], 3600) == 0

    def test_single(self):
        assert AchievementTracker._max_commits_in_window([100.0], 3600) == 1

    def test_all_in_window(self):
        now = time.time()
        ts = [now - 60 * i for i in range(5)]
        assert AchievementTracker._max_commits_in_window(ts, 3600) == 5

    def test_some_outside_window(self):
        now = time.time()
        ts = [now, now - 1800, now - 3601, now - 7200]
        assert AchievementTracker._max_commits_in_window(ts, 3600) == 2


class TestRenderCelebration:
    """Test celebration rendering."""

    def test_render_english(self):
        defn = get_achievement_by_id("tdd_champion")
        result = render_achievement_celebration(defn, "en")
        assert "Achievement Unlocked!" in result
        assert "TDD Champion" in result
        assert "\u2605\u203f\u2605" in result

    def test_render_korean(self):
        defn = get_achievement_by_id("agent_master")
        result = render_achievement_celebration(defn, "ko")
        assert "업적 달성!" in result
        assert "Agent Master" in result

    def test_render_with_defaults(self):
        result = render_achievement_celebration({"name": "Test"})
        assert "Test" in result


class TestRenderBadges:
    """Test badge display rendering."""

    def test_empty_unlocked(self):
        assert render_achievement_badges([]) == ""

    def test_render_single_badge(self):
        unlocked = [{"id": "tdd_champion", "name": "TDD Champion"}]
        result = render_achievement_badges(unlocked, "en")
        assert "Achievements" in result
        assert "TDD Champion" in result

    def test_render_multiple_badges(self):
        unlocked = [
            {"id": "tdd_champion", "name": "TDD Champion"},
            {"id": "streak", "name": "Streak Master"},
        ]
        result = render_achievement_badges(unlocked, "en")
        assert "TDD Champion" in result
        assert "Streak Master" in result

    def test_render_korean_header(self):
        unlocked = [{"id": "tdd_champion", "name": "TDD Champion"}]
        result = render_achievement_badges(unlocked, "ko")
        assert "업적" in result

    def test_render_unknown_id(self):
        unlocked = [{"id": "unknown_xyz", "name": "Mystery"}]
        result = render_achievement_badges(unlocked, "en")
        assert "Mystery" in result


class TestRenderBatchCelebration:
    """Test batch celebration rendering (#1042)."""

    def test_empty_list(self):
        result = render_batch_celebration([], "en")
        assert result == ""

    def test_single_achievement(self):
        defn = get_achievement_by_id("tdd_champion")
        result = render_batch_celebration([defn], "en")
        expected = render_achievement_celebration(defn, "en")
        assert result == expected

    def test_three_achievements(self):
        ids = ["tdd_champion", "agent_master", "streak"]
        achievements = []
        for aid in ids:
            defn = get_achievement_by_id(aid)
            if defn:
                achievements.append(defn)
        # Pad with fallback dicts if not enough real definitions
        while len(achievements) < 3:
            achievements.append({"name": f"Test{len(achievements)}", "icon": "\U0001f3c6"})

        result = render_batch_celebration(achievements, "en")
        # First achievement should be detailed
        assert achievements[0]["name"] in result
        assert "Achievement Unlocked!" in result
        # Summary line for remaining
        assert "+2 more achievements unlocked!" in result

    def test_three_achievements_korean(self):
        achievements = [
            {"name": "First", "icon": "\U0001f3c6", "face": "\u2605\u203f\u2605"},
            {"name": "Second", "icon": "\U0001f3c6"},
            {"name": "Third", "icon": "\U0001f3c6"},
        ]
        result = render_batch_celebration(achievements, "ko")
        assert "업적 달성!" in result
        assert "+2개의 업적을 추가 달성!" in result

    def test_two_achievements(self):
        achievements = [
            {"name": "Alpha", "icon": "\U0001f3c6", "face": "\u2605\u203f\u2605"},
            {"name": "Beta", "icon": "\U0001f3c6"},
        ]
        result = render_batch_celebration(achievements, "en")
        assert "Alpha" in result
        assert "+1 more achievements unlocked!" in result
