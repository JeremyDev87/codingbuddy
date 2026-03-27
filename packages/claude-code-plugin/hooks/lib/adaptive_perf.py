"""Adaptive performance mode for CodingBuddy hooks (#1002).

Monitors hook execution times and auto-switches to lightweight mode
when the threshold is exceeded. In lightweight mode, heavy analysis
(conflict prediction, full project scan) is skipped while core
functions (mode detection, basic validation) are preserved.
"""
import sys
import time
from typing import Any, Dict, List, Optional


# Default threshold in milliseconds
DEFAULT_TIMEOUT_MS = 10000

# Operations classified by weight
HEAVY_OPERATIONS = frozenset({
    "conflict_prediction",
    "full_project_scan",
    "agent_recommendations",
    "file_watcher",
})

CORE_OPERATIONS = frozenset({
    "mode_detection",
    "basic_validation",
    "stats_recording",
    "history_recording",
    "prompt_injection",
    "hook_install",
})


class AdaptivePerformanceMonitor:
    """Monitors hook performance and controls lightweight mode transitions.

    Tracks execution times per hook and switches to lightweight mode
    when recent execution times consistently exceed the configured
    threshold. The monitor uses a sliding window of recent timings
    to make decisions.
    """

    _instance: Optional["AdaptivePerformanceMonitor"] = None

    def __init__(self, timeout_ms: int = DEFAULT_TIMEOUT_MS) -> None:
        self._timeout_ms = timeout_ms
        self._lightweight_mode = False
        self._timings: Dict[str, List[float]] = {}
        self._active_timers: Dict[str, float] = {}
        self._switch_count = 0
        self._window_size = 5

    @classmethod
    def get_instance(
        cls, config: Optional[Dict[str, Any]] = None
    ) -> "AdaptivePerformanceMonitor":
        """Get or create the singleton monitor instance.

        Args:
            config: Optional config dict; reads hooks.timeoutMs if present.

        Returns:
            The singleton AdaptivePerformanceMonitor.
        """
        if cls._instance is None:
            timeout_ms = DEFAULT_TIMEOUT_MS
            if config:
                hooks_cfg = config.get("hooks", {})
                timeout_ms = hooks_cfg.get("timeoutMs", DEFAULT_TIMEOUT_MS)
            cls._instance = cls(timeout_ms=timeout_ms)
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """Reset the singleton (for testing)."""
        cls._instance = None

    @property
    def is_lightweight(self) -> bool:
        """Whether lightweight mode is currently active."""
        return self._lightweight_mode

    @property
    def timeout_ms(self) -> int:
        """Current timeout threshold in milliseconds."""
        return self._timeout_ms

    @property
    def switch_count(self) -> int:
        """Number of times mode has been switched."""
        return self._switch_count

    def start_timing(self, hook_name: str) -> None:
        """Start timing a hook execution.

        Args:
            hook_name: Identifier for the hook being timed.
        """
        self._active_timers[hook_name] = time.monotonic()

    def stop_timing(self, hook_name: str) -> float:
        """Stop timing and record the duration. Evaluates mode switch.

        Args:
            hook_name: Identifier for the hook to stop timing.

        Returns:
            Elapsed time in milliseconds.

        Raises:
            ValueError: If no active timer for the given hook.
        """
        if hook_name not in self._active_timers:
            raise ValueError(f"No active timer for: {hook_name}")

        elapsed_ms = (time.monotonic() - self._active_timers.pop(hook_name)) * 1000

        if hook_name not in self._timings:
            self._timings[hook_name] = []
        self._timings[hook_name].append(elapsed_ms)

        # Keep only the sliding window
        if len(self._timings[hook_name]) > self._window_size:
            self._timings[hook_name] = self._timings[hook_name][-self._window_size:]

        self._evaluate_mode()
        return elapsed_ms

    def record_timing(self, hook_name: str, elapsed_ms: float) -> None:
        """Record a timing directly (when start/stop is not used).

        Args:
            hook_name: Identifier for the hook.
            elapsed_ms: Elapsed time in milliseconds.
        """
        if hook_name not in self._timings:
            self._timings[hook_name] = []
        self._timings[hook_name].append(elapsed_ms)

        if len(self._timings[hook_name]) > self._window_size:
            self._timings[hook_name] = self._timings[hook_name][-self._window_size:]

        self._evaluate_mode()

    def should_skip(self, operation: str) -> bool:
        """Check if an operation should be skipped in current mode.

        Args:
            operation: Operation name to check.

        Returns:
            True if the operation should be skipped (lightweight mode
            active and operation is heavy).
        """
        if not self._lightweight_mode:
            return False
        return operation in HEAVY_OPERATIONS

    def get_status(self) -> Dict[str, Any]:
        """Get current performance monitor status.

        Returns:
            Dict with mode, threshold, timings summary, and switch count.
        """
        timing_summary: Dict[str, Dict[str, float]] = {}
        for hook_name, timings in self._timings.items():
            if timings:
                timing_summary[hook_name] = {
                    "count": len(timings),
                    "avg_ms": round(sum(timings) / len(timings), 2),
                    "max_ms": round(max(timings), 2),
                }
        return {
            "lightweight_mode": self._lightweight_mode,
            "timeout_ms": self._timeout_ms,
            "switch_count": self._switch_count,
            "timings": timing_summary,
        }

    def _evaluate_mode(self) -> None:
        """Evaluate whether to switch modes based on recent timings.

        Switches to lightweight mode if any hook's average recent
        execution time exceeds the threshold. Switches back to normal
        if all hooks are under 60% of the threshold.
        """
        any_over_threshold = False
        all_under_recovery = True
        recovery_threshold = self._timeout_ms * 0.6

        for timings in self._timings.values():
            if not timings:
                continue
            avg = sum(timings) / len(timings)
            if avg >= self._timeout_ms:
                any_over_threshold = True
            if avg >= recovery_threshold:
                all_under_recovery = False

        if not self._lightweight_mode and any_over_threshold:
            self._lightweight_mode = True
            self._switch_count += 1
        elif self._lightweight_mode and all_under_recovery and not any_over_threshold:
            self._lightweight_mode = False
            self._switch_count += 1


def get_monitor(config: Optional[Dict[str, Any]] = None) -> AdaptivePerformanceMonitor:
    """Convenience function to get the singleton monitor.

    Args:
        config: Optional codingbuddy config dict.

    Returns:
        The AdaptivePerformanceMonitor singleton.
    """
    return AdaptivePerformanceMonitor.get_instance(config)


def format_lightweight_notice(language: str = "en") -> str:
    """Format user-facing notice when switching to lightweight mode.

    Args:
        language: Language code (en, ko, ja, zh, es).

    Returns:
        Localized notice string.
    """
    notices = {
        "en": (
            "[CodingBuddy] Switched to lightweight mode — "
            "hooks were exceeding time threshold. "
            "Heavy analysis (conflict prediction, full project scan) "
            "will be skipped. Core functions remain active."
        ),
        "ko": (
            "[CodingBuddy] 경량 모드로 전환됨 — "
            "훅 실행 시간이 임계값을 초과했습니다. "
            "무거운 분석(충돌 예측, 전체 프로젝트 스캔)을 건너뜁니다. "
            "핵심 기능은 유지됩니다."
        ),
        "ja": (
            "[CodingBuddy] 軽量モードに切り替えました — "
            "フックの実行時間がしきい値を超えました。"
            "重い分析(コンフリクト予測、フルプロジェクトスキャン)は"
            "スキップされます。コア機能は維持されます。"
        ),
        "zh": (
            "[CodingBuddy] 已切换到轻量模式 — "
            "钩子执行时间超过阈值。"
            "将跳过重度分析(冲突预测、完整项目扫描)。"
            "核心功能保持活跃。"
        ),
        "es": (
            "[CodingBuddy] Cambiado a modo ligero — "
            "los hooks excedieron el umbral de tiempo. "
            "Se omitirá el análisis pesado (predicción de conflictos, "
            "escaneo completo del proyecto). Las funciones principales "
            "permanecen activas."
        ),
    }
    return notices.get(language, notices["en"])


def format_normal_notice(language: str = "en") -> str:
    """Format user-facing notice when returning to normal mode.

    Args:
        language: Language code (en, ko, ja, zh, es).

    Returns:
        Localized notice string.
    """
    notices = {
        "en": (
            "[CodingBuddy] Returned to normal mode — "
            "hook performance has recovered. "
            "Full analysis is now active."
        ),
        "ko": (
            "[CodingBuddy] 일반 모드로 복귀 — "
            "훅 성능이 회복되었습니다. "
            "전체 분석이 다시 활성화됩니다."
        ),
        "ja": (
            "[CodingBuddy] 通常モードに復帰 — "
            "フックのパフォーマンスが回復しました。"
            "完全な分析が再びアクティブです。"
        ),
        "zh": (
            "[CodingBuddy] 已返回正常模式 — "
            "钩子性能已恢复。"
            "完整分析已重新激活。"
        ),
        "es": (
            "[CodingBuddy] Vuelto al modo normal — "
            "el rendimiento de los hooks se ha recuperado. "
            "El análisis completo está activo nuevamente."
        ),
    }
    return notices.get(language, notices["en"])
