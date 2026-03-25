"""Secure credential loading for CodingBuddy notification webhooks.

Loads webhook secrets from ~/.codingbuddy/secrets.json.
Security: file MUST have mode 0o600 (owner read/write only).
Secrets are NEVER stored in codingbuddy.config.json.
"""
import json
import os
import stat
import sys
from typing import Any, Dict, Optional
from urllib.parse import quote

SECRETS_FILENAME = "secrets.json"
# Only allow owner read/write (0o600) or owner read-only (0o400)
ALLOWED_MODES = {0o600, 0o400}

TELEGRAM_API_BASE = "https://api.telegram.org/bot"


def load_secrets(secrets_dir: str) -> Dict[str, Any]:
    """Load secrets from secrets_dir/secrets.json.

    Args:
        secrets_dir: Path to directory containing secrets.json.

    Returns:
        Parsed secrets dict, or empty dict if file missing/invalid/insecure.
    """
    secrets_path = os.path.join(secrets_dir, SECRETS_FILENAME)

    if not os.path.isfile(secrets_path):
        return {}

    # Check permissions — only allow 0o600 and 0o400
    try:
        file_stat = os.stat(secrets_path)
        file_mode = stat.S_IMODE(file_stat.st_mode)
        if file_mode not in ALLOWED_MODES:
            print(
                f"WARNING: {secrets_path} has insecure permissions "
                f"(mode {oct(file_mode)}). "
                f"Expected 0o600 or 0o400. Refusing to load secrets.",
                file=sys.stderr,
            )
            return {}
    except OSError:
        return {}

    try:
        with open(secrets_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def get_webhook_url(secrets: Dict[str, Any], platform: str) -> Optional[str]:
    """Extract the webhook URL for the given platform from secrets.

    Args:
        secrets: Parsed secrets dict (from load_secrets).
        platform: One of "slack", "discord", "telegram".

    Returns:
        The webhook URL string, or None if not configured.
    """
    webhooks = secrets.get("webhooks")
    if not webhooks:
        return None

    if platform == "slack":
        return webhooks.get("slack")
    elif platform == "discord":
        return webhooks.get("discord")
    elif platform == "telegram":
        bot_token = webhooks.get("telegram_bot_token")
        chat_id = webhooks.get("telegram_chat_id")
        if bot_token and chat_id:
            return f"{TELEGRAM_API_BASE}{bot_token}/sendMessage?chat_id={quote(str(chat_id))}"
        return None
    else:
        return None
