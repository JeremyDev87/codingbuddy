"""Event-driven notification service for CodingBuddy.

Sends webhook notifications to Slack, Discord, and Telegram on key events.
Uses only stdlib (urllib.request) — no external dependencies.

Security: Webhook URLs are loaded from secrets_store (never from config).
Config only controls event toggles and platform selection.
"""
import json
import os
import sys
from dataclasses import dataclass, field
from typing import Any, Dict, Optional
from urllib.request import Request, urlopen, build_opener, HTTPRedirectHandler
from urllib.error import URLError


class _NoRedirectHandler(HTTPRedirectHandler):
    """Refuse all HTTP redirects to prevent secret leakage."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_opener = build_opener(_NoRedirectHandler)

# Ensure hooks/lib is on path for secrets_store import
_lib_dir = os.path.dirname(os.path.abspath(__file__))
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from secrets_store import load_secrets, get_webhook_url

WEBHOOK_TIMEOUT = 10  # seconds


@dataclass
class NotificationEvent:
    """Represents a notification event."""

    event_type: str  # e.g. "pr_created", "session_end", "error"
    title: str
    message: str
    url: Optional[str] = None


# --- Payload formatters ---


def format_slack_payload(event: NotificationEvent) -> Dict[str, Any]:
    """Format event as a Slack Block Kit payload."""
    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": event.title, "emoji": True},
        },
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": event.message},
        },
    ]
    if event.url:
        blocks.append(
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"<{event.url}|View>"},
            }
        )
    return {"text": event.title, "blocks": blocks}


def format_discord_payload(event: NotificationEvent) -> Dict[str, Any]:
    """Format event as a Discord embed payload."""
    embed: Dict[str, Any] = {
        "title": event.title,
        "description": event.message,
        "color": _discord_color(event.event_type),
    }
    if event.url:
        embed["url"] = event.url
    return {"embeds": [embed]}


def format_telegram_payload(event: NotificationEvent) -> Dict[str, Any]:
    """Format event as a Telegram sendMessage payload."""
    text = f"<b>{event.title}</b>\n{event.message}"
    if event.url:
        text += f'\n<a href="{event.url}">View</a>'
    return {"text": text, "parse_mode": "HTML"}


# --- Core send logic ---


def send_webhook(url: str, payload: Dict[str, Any]) -> bool:
    """Send JSON payload to webhook URL via POST.

    Returns True on success, False on any error. Never raises.
    """
    try:
        data = json.dumps(payload).encode("utf-8")
        req = Request(url, data=data, headers={"Content-Type": "application/json"})
        with _opener.open(req, timeout=WEBHOOK_TIMEOUT) as resp:
            return 200 <= resp.status < 300
    except (URLError, TimeoutError, OSError, ValueError):
        return False


def is_event_enabled(config: Dict[str, Any], event_type: str) -> bool:
    """Check if an event type is enabled in config.

    Config schema:
        notifications:
          events:
            pr_created: true
            session_end: true
    """
    notifications = config.get("notifications", {})
    events = notifications.get("events", {})
    return events.get(event_type, False) is True


# --- High-level API ---

_FORMATTERS = {
    "slack": format_slack_payload,
    "discord": format_discord_payload,
    "telegram": format_telegram_payload,
}


def notify(
    event: NotificationEvent,
    config: Dict[str, Any],
    secrets_dir: Optional[str] = None,
) -> Dict[str, bool]:
    """Send notification to all configured platforms.

    Args:
        event: The notification event to send.
        config: Parsed codingbuddy.config.json (event toggles + platform list).
        secrets_dir: Override secrets directory (default: ~/.codingbuddy).

    Returns:
        Dict mapping platform name -> success boolean.
        Empty dict if event is disabled.
    """
    if not is_event_enabled(config, event.event_type):
        return {}

    if secrets_dir is None:
        secrets_dir = os.path.join(os.path.expanduser("~"), ".codingbuddy")

    secrets = load_secrets(secrets_dir)
    notifications = config.get("notifications", {})
    platforms = notifications.get("platforms", [])

    results: Dict[str, bool] = {}
    for platform in platforms:
        url = get_webhook_url(secrets, platform)
        if url is None:
            continue

        formatter = _FORMATTERS.get(platform)
        if formatter is None:
            continue

        payload = formatter(event)
        results[platform] = send_webhook(url, payload)

    return results


# --- Helpers ---


def _discord_color(event_type: str) -> int:
    """Map event type to Discord embed color."""
    colors = {
        "pr_created": 0x2ECC71,  # green
        "session_end": 0x3498DB,  # blue
        "error": 0xE74C3C,  # red
    }
    return colors.get(event_type, 0x95A5A6)  # gray default
