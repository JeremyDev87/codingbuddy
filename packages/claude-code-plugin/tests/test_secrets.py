"""Tests for hooks/lib/secrets.py — secure credential loading."""
import json
import os
import stat
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hooks", "lib"))

from secrets_store import load_secrets, get_webhook_url


@pytest.fixture
def secrets_dir(tmp_path):
    """Create a temp .codingbuddy directory with proper permissions."""
    d = tmp_path / ".codingbuddy"
    d.mkdir()
    return d


@pytest.fixture
def secrets_file(secrets_dir):
    """Create a valid secrets.json with correct permissions (0o600)."""
    data = {
        "webhooks": {
            "slack": "https://hooks.slack.com/services/T00/B00/xxx",
            "discord": "https://discord.com/api/webhooks/123/abc",
            "telegram_bot_token": "123456:ABC-DEF",
            "telegram_chat_id": "-100123456",
        }
    }
    f = secrets_dir / "secrets.json"
    f.write_text(json.dumps(data))
    os.chmod(str(f), 0o600)
    return f


class TestLoadSecrets:
    """Tests for load_secrets — read and validate secrets.json."""

    def test_loads_valid_secrets(self, secrets_file, secrets_dir):
        """Should load secrets from a valid file with correct permissions."""
        result = load_secrets(str(secrets_dir))
        assert result["webhooks"]["slack"] == "https://hooks.slack.com/services/T00/B00/xxx"

    def test_returns_empty_when_file_missing(self, tmp_path):
        """Should return empty dict when secrets.json does not exist."""
        d = tmp_path / ".codingbuddy"
        d.mkdir()
        result = load_secrets(str(d))
        assert result == {}

    def test_returns_empty_when_dir_missing(self, tmp_path):
        """Should return empty dict when .codingbuddy dir does not exist."""
        result = load_secrets(str(tmp_path / "nonexistent"))
        assert result == {}

    def test_returns_empty_on_invalid_json(self, secrets_dir):
        """Should return empty dict when secrets.json has invalid JSON."""
        f = secrets_dir / "secrets.json"
        f.write_text("not valid json{")
        os.chmod(str(f), 0o600)
        result = load_secrets(str(secrets_dir))
        assert result == {}

    def test_warns_on_loose_permissions(self, secrets_dir, capsys):
        """Should return empty dict and warn when file permissions are too open."""
        data = {"webhooks": {"slack": "https://hooks.slack.com/services/T00/B00/xxx"}}
        f = secrets_dir / "secrets.json"
        f.write_text(json.dumps(data))
        os.chmod(str(f), 0o644)  # Too permissive
        result = load_secrets(str(secrets_dir))
        assert result == {}
        assert "insecure permissions" in capsys.readouterr().err

    def test_rejects_owner_execute_permissions(self, secrets_dir):
        """Should reject 0o700 (owner-execute) even though group/other are zero."""
        data = {"webhooks": {"slack": "https://hooks.slack.com/services/T00/B00/xxx"}}
        f = secrets_dir / "secrets.json"
        f.write_text(json.dumps(data))
        os.chmod(str(f), 0o700)
        result = load_secrets(str(secrets_dir))
        assert result == {}


class TestGetWebhookUrl:
    """Tests for get_webhook_url — extract platform-specific webhook URLs."""

    def test_returns_slack_url(self, secrets_file, secrets_dir):
        """Should return Slack webhook URL."""
        secrets = load_secrets(str(secrets_dir))
        url = get_webhook_url(secrets, "slack")
        assert url == "https://hooks.slack.com/services/T00/B00/xxx"

    def test_returns_discord_url(self, secrets_file, secrets_dir):
        """Should return Discord webhook URL."""
        secrets = load_secrets(str(secrets_dir))
        url = get_webhook_url(secrets, "discord")
        assert url == "https://discord.com/api/webhooks/123/abc"

    def test_returns_none_for_unknown_platform(self, secrets_file, secrets_dir):
        """Should return None for an unrecognized platform."""
        secrets = load_secrets(str(secrets_dir))
        url = get_webhook_url(secrets, "unknown_platform")
        assert url is None

    def test_returns_none_when_no_webhooks(self):
        """Should return None when secrets have no webhooks key."""
        url = get_webhook_url({}, "slack")
        assert url is None

    def test_returns_telegram_bot_token(self, secrets_file, secrets_dir):
        """Should return Telegram bot token."""
        secrets = load_secrets(str(secrets_dir))
        url = get_webhook_url(secrets, "telegram")
        assert "123456:ABC-DEF" in url
