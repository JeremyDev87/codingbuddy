"""Adaptive layout engine for CodingBuddy statusLine (#1326).

Wave 0 skeleton — reserved for **Wave 1-D**.

Planned contents (Wave 1-D owner fills):
    * ``SEGMENT_PRIORITY: list[tuple[str, int]]`` — drop order when
      width-constrained
    * ``_visible_len(s: str) -> int`` — ANSI-aware length
    * ``_shorten_model_label(name: str, *, compact: bool = False) -> str``
    * ``_fit_segments(segments: list[str], width: int, *, separator: str) -> str``

Wave 1-D will also migrate the segment-assembly logic currently inline
in ``codingbuddy-hud.format_status_line`` to these helpers. Until then,
this file is a reserved import target so Wave workers downstream
(Wave 2-E, Wave 3) can reference ``hud_layout`` without creating it.
"""
