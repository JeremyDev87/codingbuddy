"""Cost velocity indicator for CodingBuddy statusLine (#1326).

Wave 0 skeleton — reserved for **Wave 2-B**.

Planned contents (Wave 2-B owner fills):
    * ``record_cost_sample(state_file: str, cost_usd: float, *, now=None) -> None``
    * ``compute_velocity(history: list[dict]) -> float`` — $/hour
    * ``format_velocity_badge(velocity_usd_per_hour: float) -> str``
    * ``MAX_COST_HISTORY_ENTRIES`` constant

Wave 2-B will ALSO extend ``lib/hud_state.py`` with a
``"costHistory": []`` entry in both ``_EXTENDED_DEFAULTS`` and
``init_hud_state()`` (this is deliberately NOT done in Wave 0 — schema
design belongs with the feature owner).
"""
