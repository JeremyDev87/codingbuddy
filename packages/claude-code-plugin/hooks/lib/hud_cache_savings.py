"""Cache-savings badge for CodingBuddy statusLine (#1326).

Wave 0 skeleton — reserved for **Wave 2-C**.

Planned contents (Wave 2-C owner fills):
    * ``compute_cache_savings(cost_breakdown: dict) -> float`` — USD
      avoided by cache hits
    * ``format_cache_savings_badge(savings_usd: float) -> str``

Source of truth for the computation is the stdin ``cost`` payload
(cached-input vs non-cached-input token counts combined with
``MODEL_PRICING`` — both already available in ``codingbuddy-hud``).
This module will be the single import target for Wave 3 assembly.
"""
