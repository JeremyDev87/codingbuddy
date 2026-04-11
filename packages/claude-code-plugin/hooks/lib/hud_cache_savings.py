"""Cache savings calculator for CodingBuddy statusLine (#1326, Wave 2-C).

Claude API's prompt caching charges ``cache_read_input_tokens`` at
10% of the base input price — a 90% discount. This module quantifies
that discount so the HUD can surface "how much you saved by caching"
as a badge like ``"💰$4.56 saved"`` appended to the cost segment.

Primary entry points:

- :func:`compute_cache_savings` — pure arithmetic helper (tokens +
  model_id → dollars saved).
- :func:`format_cache_savings` — end-to-end renderer that reads
  Claude Code stdin, extracts the relevant fields, and returns the
  formatted badge string (or ``""`` when there is nothing to show).
"""
from __future__ import annotations

from typing import Any, Dict

# Money glyph — U+1F4B0 money bag emoji
_MONEY_GLYPH: str = "\U0001f4b0"  # 💰

# cache_read tokens cost 10% of the input price, so the per-token
# savings equals 90% of the input price.
_CACHE_DISCOUNT: float = 0.90

# Minimum dollar savings required to show the badge. Hides noise
# below one cent so the status bar does not flicker on tiny reads.
_MIN_DISPLAY_USD: float = 0.01

# Baseline input prices in USD per million tokens. Mirrors the
# ``MODEL_PRICING`` table in ``codingbuddy-hud.py``.
_INPUT_PRICE_PER_M: Dict[str, float] = {
    "haiku": 0.80,
    "sonnet": 3.00,
    "opus": 15.00,
}

# Sonnet as the safe default when the model family cannot be
# identified. Avoids over-claiming savings on unknown tiers.
_DEFAULT_INPUT_PRICE_PER_M: float = 3.00


def _input_price_per_million(model_id: str) -> float:
    """Return the baseline input price (USD per million tokens).

    Case-insensitive substring match against the known family keys.
    Falls back to the sonnet tier when no key matches.
    """
    if not model_id:
        return _DEFAULT_INPUT_PRICE_PER_M
    lowered = model_id.lower()
    for key, price in _INPUT_PRICE_PER_M.items():
        if key in lowered:
            return price
    return _DEFAULT_INPUT_PRICE_PER_M


def compute_cache_savings(
    cache_read_tokens: Any,
    model_id: str,
) -> float:
    """Return the dollar amount saved by cache reads.

    Formula::

        savings = cache_read_tokens * (input_price / 1_000_000) * 0.90

    Defensive coercion: negative or non-numeric inputs return
    ``0.0`` so callers never render a "saved -$0.12" surprise when
    upstream payloads are malformed.
    """
    try:
        tokens = int(cache_read_tokens)
    except (TypeError, ValueError):
        return 0.0
    if tokens <= 0:
        return 0.0
    price = _input_price_per_million(model_id)
    return (tokens / 1_000_000.0) * price * _CACHE_DISCOUNT


def format_cache_savings(stdin_data: Dict[str, Any]) -> str:
    """Render the cache savings badge from a stdin payload.

    Output format:

        ``💰$4.56 saved``

    Returns an empty string when any of the following hold:

    * ``stdin_data`` is empty or has no ``context_window``
    * ``current_usage`` is missing
    * ``cache_read_input_tokens`` is zero, absent, or negative
    * Computed savings < ``$0.01`` (noise floor)

    Model identification is sourced from ``stdin_data.model.id``
    (or ``display_name`` fallback). Unknown models default to the
    sonnet-tier input price so the display still shows a
    conservative estimate.
    """
    if not stdin_data:
        return ""

    ctx = stdin_data.get("context_window") or {}
    usage = ctx.get("current_usage") or {}
    cache_read = usage.get("cache_read_input_tokens", 0) or 0

    if not cache_read or (isinstance(cache_read, (int, float)) and cache_read <= 0):
        return ""

    model_info = stdin_data.get("model") or {}
    model_id = model_info.get("id") or model_info.get("display_name") or ""

    savings = compute_cache_savings(cache_read, model_id)
    if savings < _MIN_DISPLAY_USD:
        return ""

    return f"{_MONEY_GLYPH}${savings:.2f} saved"
