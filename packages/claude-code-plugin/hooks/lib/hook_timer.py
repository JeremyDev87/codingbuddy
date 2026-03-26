"""Adaptive hook timeout tracking (#945).

Tracks hook execution time and provides statistics and warnings
for hooks approaching their timeout threshold.
"""
import time
from typing import Dict, List


class HookTimer:
    """Track hook execution times and provide performance statistics."""

    def __init__(self) -> None:
        self._active: Dict[str, float] = {}
        self._timings: Dict[str, List[float]] = {}

    def start(self, hook_name: str) -> None:
        """Start timing a hook execution.

        Args:
            hook_name: Name of the hook being timed.
        """
        self._active[hook_name] = time.monotonic()

    def stop(self, hook_name: str) -> float:
        """Stop timing a hook and record the duration.

        Args:
            hook_name: Name of the hook to stop timing.

        Returns:
            Elapsed time in milliseconds.

        Raises:
            ValueError: If no active timer exists for the hook.
        """
        if hook_name not in self._active:
            raise ValueError(f"No active timer for hook: {hook_name}")
        elapsed_ms = (time.monotonic() - self._active.pop(hook_name)) * 1000
        if hook_name not in self._timings:
            self._timings[hook_name] = []
        self._timings[hook_name].append(elapsed_ms)
        return elapsed_ms

    def get_stats(self) -> Dict[str, Dict[str, float]]:
        """Compute statistics for all tracked hooks.

        Returns:
            Dict mapping hook_name to {count, avg_ms, p95_ms, max_ms}.
        """
        result: Dict[str, Dict[str, float]] = {}
        for hook_name, timings in self._timings.items():
            sorted_t = sorted(timings)
            count = len(sorted_t)
            avg_ms = sum(sorted_t) / count
            p95_idx = int(count * 0.95)
            if p95_idx >= count:
                p95_idx = count - 1
            result[hook_name] = {
                "count": count,
                "avg_ms": round(avg_ms, 2),
                "p95_ms": round(sorted_t[p95_idx], 2),
                "max_ms": round(sorted_t[-1], 2),
            }
        return result

    def get_warnings(self, timeout_ms: int = 10000) -> List[str]:
        """Return warnings for hooks using >=80% of their timeout.

        Args:
            timeout_ms: Hook timeout in milliseconds (default 10000).

        Returns:
            List of warning strings for slow hooks.
        """
        threshold = timeout_ms * 0.8
        warnings: List[str] = []
        for hook_name, timings in self._timings.items():
            max_time = max(timings)
            if max_time >= threshold:
                pct = max_time / timeout_ms * 100
                warnings.append(
                    f"Hook '{hook_name}' used {max_time:.0f}ms "
                    f"of {timeout_ms}ms timeout ({pct:.0f}%)"
                )
        return warnings
