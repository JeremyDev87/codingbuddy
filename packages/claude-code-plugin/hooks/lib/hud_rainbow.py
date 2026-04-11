"""Mode rainbow ANSI colouring for CodingBuddy statusLine (#1326).

Wave 0 skeleton — reserved for **Wave 2-D**.

Planned contents (Wave 2-D owner fills):
    * ``MODE_PALETTE: dict[str, tuple[int, int, int]]`` — per-mode RGB
      gradient anchors (PLAN/ACT/EVAL/AUTO)
    * ``gradient_ansi(text: str, palette: tuple) -> str``
    * ``render_mode_rainbow(mode: str, text: str) -> str``

Wave 2-D will wire the rainbow into ``format_status_line`` (or its
``hud_layout`` successor) in place of the plain text mode label.
"""
