"""TDD cycle mini progress bar for status display (#1035).

Builds a visual indicator showing current TDD phase progress:
  [RED ● GREEN ○ REFACTOR ○]

Reads phase from CODINGBUDDY_TDD_PHASE env var or explicit argument.
"""
import os
from typing import Optional

# TDD phases in sequential order
TDD_PHASES = ["RED", "GREEN", "REFACTOR"]

# Display symbols
ACTIVE = "\u25cf"    # ●
INACTIVE = "\u25cb"  # ○


def build_tdd_indicator(
    phase: Optional[str] = None,
    cycle_count: Optional[int] = None,
) -> Optional[str]:
    """Build a one-line TDD cycle progress indicator.

    Args:
        phase: Current TDD phase (RED, GREEN, REFACTOR).
               If None, reads from CODINGBUDDY_TDD_PHASE env var.
        cycle_count: Number of completed TDD cycles. Appended as '#N'
                     when > 0.

    Returns:
        Formatted string like '[RED ● GREEN ○ REFACTOR ○]' or None
        if no valid phase is active.
    """
    if phase is None:
        phase = os.environ.get("CODINGBUDDY_TDD_PHASE", "")

    if not phase:
        return None

    phase = phase.upper().strip()
    if phase not in TDD_PHASES:
        return None

    phase_index = TDD_PHASES.index(phase)
    parts = []
    for i, p in enumerate(TDD_PHASES):
        symbol = ACTIVE if i <= phase_index else INACTIVE
        parts.append(f"{p} {symbol}")

    indicator = f"[{' '.join(parts)}]"

    if cycle_count and cycle_count > 0:
        indicator = f"{indicator} #{cycle_count}"

    return indicator
