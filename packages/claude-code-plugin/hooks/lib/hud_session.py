"""Session self-heal and stale state detection (#1326).

Wave 0 skeleton — reserved for **Wave 1-B**.

Planned contents (Wave 1-B owner fills):
    * ``detect_stale_session(state: dict, *, now: datetime | None = None) -> bool``
    * ``reset_stale_session(state_file: str) -> None``
    * ``SESSION_STALE_SECONDS`` constant

The current monolith embeds no session self-heal logic; Wave 1-B will
introduce both the helpers and their call site in
``codingbuddy-hud.format_status_line`` (or its Wave 1-D successor in
``hud_layout``).  This module exists as a placeholder so Wave 1-B can
commit to its own sub-branch without racing other Wave workers to
create the file.
"""
