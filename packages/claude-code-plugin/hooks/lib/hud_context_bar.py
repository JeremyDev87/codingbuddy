"""Smart context bar visualization for CodingBuddy statusLine (#1326).

Wave 0 skeleton — reserved for **Wave 2-E**.

Planned contents (Wave 2-E owner fills):
    * ``CONTEXT_BAR_WIDTH: int`` — segment count
    * ``CONTEXT_BAR_THRESHOLDS: tuple[float, float, float]`` — warning
      / danger / critical cut-offs
    * ``render_context_bar(used_tokens: int, total_tokens: int) -> str``

Wave 2-E will render the bar from the ``context`` payload already
parsed in ``codingbuddy-hud``. This file is a reserved import target
so Wave 3 integration can depend on ``hud_context_bar`` without
creating the module mid-merge.
"""
