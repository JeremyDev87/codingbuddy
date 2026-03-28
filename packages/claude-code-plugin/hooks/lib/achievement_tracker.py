"""Achievement and badge system for coding habits (#1008).

Tracks coding habit milestones (TDD cycles, agent usage, quality scores,
commit velocity, streak days) and awards achievements when thresholds are met.
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
ACHIEVEMENTS_SUBDIR = "achievements"

# Achievement definitions
ACHIEVEMENT_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "id": "tdd_champion",
        "name": "TDD Champion",
        "description": "Complete 100 TDD cycles",
        "metric": "tdd_cycles",
        "threshold": 100,
        "icon": "\U0001f3c6",  # trophy
        "face": "\u2605\u203f\u2605",  # star eyes
    },
    {
        "id": "agent_master",
        "name": "Agent Master",
        "description": "Use 10 or more different agents",
        "metric": "unique_agents",
        "threshold": 10,
        "icon": "\U0001f916",  # robot
        "face": "\u25c8\u203f\u25c8",  # diamond eyes
    },
    {
        "id": "quality_guard",
        "name": "Quality Guard",
        "description": "Achieve EVAL score 90+",
        "metric": "max_eval_score",
        "threshold": 90,
        "icon": "\U0001f6e1\ufe0f",  # shield
        "face": "\u25b2\u203f\u25b2",  # triangle eyes
    },
    {
        "id": "speed_coder",
        "name": "Speed Coder",
        "description": "Make 5 commits within 1 hour",
        "metric": "max_commits_per_hour",
        "threshold": 5,
        "icon": "\u26a1",  # lightning
        "face": "\u25ba\u203f\u25ba",  # arrow eyes
    },
    {
        "id": "streak",
        "name": "Streak Master",
        "description": "Code for 5 consecutive days",
        "metric": "max_streak_days",
        "threshold": 5,
        "icon": "\U0001f525",  # fire
        "face": "\u2666\u203f\u2666",  # diamond eyes
    },
]

# Celebration messages by language
CELEBRATION_MESSAGES: Dict[str, Dict[str, str]] = {
    "en": {
        "unlocked": "Achievement Unlocked!",
        "congrats": "Congratulations!",
        "more_unlocked": "+{n} more achievements unlocked!",
    },
    "ko": {
        "unlocked": "업적 달성!",
        "congrats": "축하합니다!",
        "more_unlocked": "+{n}개의 업적을 추가 달성!",
    },
    "ja": {
        "unlocked": "実績解除!",
        "congrats": "おめでとうございます!",
        "more_unlocked": "+{n}件の実績を解除!",
    },
    "zh": {
        "unlocked": "成就解锁!",
        "congrats": "恭喜!",
        "more_unlocked": "+{n}个成就已解锁!",
    },
    "es": {
        "unlocked": "Logro desbloqueado!",
        "congrats": "Felicitaciones!",
        "more_unlocked": "+{n} logros más desbloqueados!",
    },
}

# Badge display headers by language
BADGE_HEADERS: Dict[str, str] = {
    "en": "Achievements",
    "ko": "업적",
    "ja": "実績",
    "zh": "成就",
    "es": "Logros",
}


def get_achievement_definitions() -> List[Dict[str, Any]]:
    """Return the list of all achievement definitions."""
    return list(ACHIEVEMENT_DEFINITIONS)


def get_achievement_by_id(achievement_id: str) -> Optional[Dict[str, Any]]:
    """Look up an achievement definition by its ID.

    Args:
        achievement_id: The achievement identifier string.

    Returns:
        Achievement definition dict, or None if not found.
    """
    for defn in ACHIEVEMENT_DEFINITIONS:
        if defn["id"] == achievement_id:
            return dict(defn)
    return None


class AchievementTracker:
    """Track and award coding habit achievements."""

    def __init__(self, data_dir: Optional[str] = None):
        """Initialize the achievement tracker.

        Args:
            data_dir: Base directory for data storage.
                      Uses CLAUDE_PLUGIN_DATA env or ~/.codingbuddy.
        """
        if data_dir is None:
            data_dir = os.environ.get("CLAUDE_PLUGIN_DATA", DEFAULT_DATA_DIR)

        self.achievements_dir = os.path.join(data_dir, ACHIEVEMENTS_SUBDIR)
        os.makedirs(self.achievements_dir, mode=0o700, exist_ok=True)

        self.progress_file = os.path.join(self.achievements_dir, "progress.json")
        self.unlocked_file = os.path.join(self.achievements_dir, "unlocked.json")

        # Initialize files if they don't exist
        if not os.path.exists(self.progress_file):
            self._locked_write(self.progress_file, self._default_progress())
        if not os.path.exists(self.unlocked_file):
            self._locked_write(self.unlocked_file, [])

    def _default_progress(self) -> Dict[str, Any]:
        """Return default progress structure."""
        return {
            "tdd_cycles": 0,
            "unique_agents": [],
            "max_eval_score": 0,
            "max_commits_per_hour": 0,
            "commit_timestamps": [],
            "session_dates": [],
            "max_streak_days": 0,
        }

    def get_progress(self) -> Dict[str, Any]:
        """Read current progress from disk.

        Returns:
            Progress dict with metric values.
        """
        return self._locked_read(self.progress_file, self._default_progress())

    def get_unlocked(self) -> List[Dict[str, Any]]:
        """Read list of unlocked achievements.

        Returns:
            List of unlocked achievement records.
        """
        return self._locked_read(self.unlocked_file, [])

    def record_tdd_cycle(self) -> None:
        """Record a completed TDD cycle."""
        progress = self.get_progress()
        progress["tdd_cycles"] = progress.get("tdd_cycles", 0) + 1
        self._locked_write(self.progress_file, progress)

    def record_agent_usage(self, agent_name: str) -> None:
        """Record usage of a specific agent.

        Args:
            agent_name: Name of the agent used.
        """
        progress = self.get_progress()
        agents = progress.get("unique_agents", [])
        if agent_name and agent_name not in agents:
            agents.append(agent_name)
        progress["unique_agents"] = agents
        self._locked_write(self.progress_file, progress)

    def record_eval_score(self, score: int) -> None:
        """Record an EVAL mode score.

        Args:
            score: The evaluation score (0-100).
        """
        progress = self.get_progress()
        if score > progress.get("max_eval_score", 0):
            progress["max_eval_score"] = score
        self._locked_write(self.progress_file, progress)

    def record_commit(self) -> None:
        """Record a commit timestamp for speed tracking."""
        progress = self.get_progress()
        now = time.time()
        timestamps = progress.get("commit_timestamps", [])
        timestamps.append(now)
        # Keep only last 24h of timestamps
        cutoff = now - 86400
        timestamps = [t for t in timestamps if t > cutoff]
        progress["commit_timestamps"] = timestamps

        # Calculate max commits in any 1-hour window
        max_in_hour = self._max_commits_in_window(timestamps, 3600)
        if max_in_hour > progress.get("max_commits_per_hour", 0):
            progress["max_commits_per_hour"] = max_in_hour

        self._locked_write(self.progress_file, progress)

    def record_session(self) -> None:
        """Record a coding session date for streak tracking."""
        progress = self.get_progress()
        today = time.strftime("%Y-%m-%d")
        dates = progress.get("session_dates", [])
        if today not in dates:
            dates.append(today)
        # Keep only last 30 days
        dates = sorted(dates)[-30:]
        progress["session_dates"] = dates

        # Calculate current streak
        streak = self._calculate_streak(dates)
        if streak > progress.get("max_streak_days", 0):
            progress["max_streak_days"] = streak

        self._locked_write(self.progress_file, progress)

    def check_achievements(self) -> List[Dict[str, Any]]:
        """Check all achievements and return newly unlocked ones.

        Returns:
            List of achievement dicts that were just unlocked.
        """
        progress = self.get_progress()
        unlocked = self.get_unlocked()
        unlocked_ids = {a["id"] for a in unlocked}

        newly_unlocked = []
        for defn in ACHIEVEMENT_DEFINITIONS:
            if defn["id"] in unlocked_ids:
                continue

            metric = defn["metric"]
            threshold = defn["threshold"]

            # Get the metric value
            if metric == "unique_agents":
                value = len(progress.get("unique_agents", []))
            else:
                value = progress.get(metric, 0)

            if value >= threshold:
                record = {
                    "id": defn["id"],
                    "name": defn["name"],
                    "unlocked_at": time.time(),
                    "value": value,
                }
                unlocked.append(record)
                newly_unlocked.append(defn)

        if newly_unlocked:
            self._locked_write(self.unlocked_file, unlocked)

        return newly_unlocked

    @staticmethod
    def _max_commits_in_window(timestamps: List[float], window_secs: int) -> int:
        """Find maximum number of commits in any sliding window.

        Args:
            timestamps: Sorted list of commit timestamps.
            window_secs: Window size in seconds.

        Returns:
            Maximum commit count in any window.
        """
        if not timestamps:
            return 0
        sorted_ts = sorted(timestamps)
        max_count = 0
        for i, start in enumerate(sorted_ts):
            count = 0
            for ts in sorted_ts[i:]:
                if ts - start <= window_secs:
                    count += 1
                else:
                    break
            max_count = max(max_count, count)
        return max_count

    @staticmethod
    def _calculate_streak(dates: List[str]) -> int:
        """Calculate the current consecutive day streak.

        Args:
            dates: Sorted list of date strings (YYYY-MM-DD).

        Returns:
            Current streak length in days.
        """
        if not dates:
            return 0

        from datetime import datetime, timedelta

        sorted_dates = sorted(set(dates))
        parsed = [datetime.strptime(d, "%Y-%m-%d") for d in sorted_dates]

        # Walk backwards from most recent date
        streak = 1
        for i in range(len(parsed) - 1, 0, -1):
            diff = (parsed[i] - parsed[i - 1]).days
            if diff == 1:
                streak += 1
            else:
                break
        return streak

    def _locked_read(self, filepath: str, default: Any) -> Any:
        """Read JSON file with file locking."""
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                if HAS_FCNTL:
                    fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return default

    def _locked_write(self, filepath: str, data: Any) -> None:
        """Write JSON file with file locking."""
        with open(filepath, "w", encoding="utf-8") as f:
            if HAS_FCNTL:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            json.dump(data, f, indent=2)


def render_achievement_celebration(
    achievement: Dict[str, Any],
    language: str = "en",
) -> str:
    """Render a celebration message for an unlocked achievement.

    Args:
        achievement: Achievement definition dict with id, name, icon, face.
        language: Language code.

    Returns:
        Formatted celebration string with special buddy face.
    """
    msgs = CELEBRATION_MESSAGES.get(language, CELEBRATION_MESSAGES["en"])
    icon = achievement.get("icon", "\U0001f3c6")
    name = achievement.get("name", "Achievement")
    face = achievement.get("face", "\u2605\u203f\u2605")
    desc = achievement.get("description", "")

    lines = [
        "",
        f"\u2501\u2501 {icon} {msgs['unlocked']} \u2501\u2501\u2501\u2501\u2501\u2501",
        f"\u256d\u2501\u2501\u2501\u256e",
        f"\u2503 {face} \u2503 {msgs['congrats']}",
        f"\u2570\u2501\u2501\u2501\u256f",
        f"  {icon} {name}",
        f"  {desc}",
        "",
    ]
    return "\n".join(lines)


def render_batch_celebration(
    newly_unlocked: List[Dict[str, Any]],
    language: str = "en",
) -> str:
    """Render a batch celebration for one or more newly unlocked achievements.

    When a single achievement is unlocked, delegates to render_achievement_celebration.
    When multiple are unlocked, shows the first in detail and summarises the rest.

    Args:
        newly_unlocked: List of achievement definition dicts just unlocked.
        language: Language code.

    Returns:
        Formatted celebration string, or empty string if list is empty.
    """
    if not newly_unlocked:
        return ""

    if len(newly_unlocked) == 1:
        return render_achievement_celebration(newly_unlocked[0], language)

    # Multiple: show first achievement in detail, summarise the rest
    top = newly_unlocked[0]
    detail = render_achievement_celebration(top, language)
    msgs = CELEBRATION_MESSAGES.get(language, CELEBRATION_MESSAGES["en"])
    remaining = len(newly_unlocked) - 1
    summary_line = f"  {msgs['more_unlocked'].format(n=remaining)}"
    return f"{detail}\n{summary_line}"


def render_achievement_badges(
    unlocked: List[Dict[str, Any]],
    language: str = "en",
) -> str:
    """Render badge display area for TUI.

    Args:
        unlocked: List of unlocked achievement records (from get_unlocked).
        language: Language code.

    Returns:
        Formatted badge display string, empty if no badges.
    """
    if not unlocked:
        return ""

    header = BADGE_HEADERS.get(language, BADGE_HEADERS["en"])
    lines = [f"\u2501\u2501 {header} \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501"]

    for record in unlocked:
        defn = get_achievement_by_id(record.get("id", ""))
        if defn:
            icon = defn["icon"]
            name = defn["name"]
            lines.append(f"  {icon} {name}")
        else:
            name = record.get("name", record.get("id", "?"))
            lines.append(f"  \U0001f3c6 {name}")

    return "\n".join(lines)
