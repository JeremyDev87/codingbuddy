"""Tests for hooks/lib/notifications.py — webhook notification sender."""
import json
import os
import sys
from unittest.mock import patch, MagicMock
from urllib.error import URLError

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hooks", "lib"))

from notifications import (
    NotificationEvent,
    format_slack_payload,
    format_discord_payload,
    format_telegram_payload,
    send_webhook,
    notify,
    is_event_enabled,
)


class TestNotificationEvent:
    """Tests for NotificationEvent data structure."""

    def test_creates_event(self):
        """Should create an event with required fields."""
        event = NotificationEvent(
            event_type="pr_created",
            title="PR Created",
            message="PR #42 opened",
        )
        assert event.event_type == "pr_created"
        assert event.title == "PR Created"
        assert event.message == "PR #42 opened"

    def test_optional_url(self):
        """Should support optional URL field."""
        event = NotificationEvent(
            event_type="pr_created",
            title="PR Created",
            message="PR #42 opened",
            url="https://github.com/org/repo/pull/42",
        )
        assert event.url == "https://github.com/org/repo/pull/42"


class TestFormatSlackPayload:
    """Tests for Slack webhook payload formatting."""

    def test_basic_payload(self):
        """Should format a simple Slack payload."""
        event = NotificationEvent(
            event_type="pr_created",
            title="PR Created",
            message="PR #42: Add notifications",
        )
        payload = format_slack_payload(event)
        assert payload["text"] == "PR Created"
        assert any("PR #42" in str(block) for block in payload.get("blocks", [payload]))

    def test_payload_with_url(self):
        """Should include URL in Slack payload."""
        event = NotificationEvent(
            event_type="pr_created",
            title="PR Created",
            message="PR #42: Add notifications",
            url="https://github.com/org/repo/pull/42",
        )
        payload = format_slack_payload(event)
        body = json.dumps(payload)
        assert "https://github.com/org/repo/pull/42" in body


class TestFormatDiscordPayload:
    """Tests for Discord webhook payload formatting."""

    def test_basic_payload(self):
        """Should format a Discord embed payload."""
        event = NotificationEvent(
            event_type="session_end",
            title="Session Summary",
            message="10 tools called, 3 files changed",
        )
        payload = format_discord_payload(event)
        assert "embeds" in payload
        embed = payload["embeds"][0]
        assert embed["title"] == "Session Summary"
        assert "10 tools called" in embed["description"]

    def test_payload_with_url(self):
        """Should include URL in Discord embed."""
        event = NotificationEvent(
            event_type="pr_created",
            title="PR Created",
            message="PR #42",
            url="https://github.com/org/repo/pull/42",
        )
        payload = format_discord_payload(event)
        embed = payload["embeds"][0]
        assert embed.get("url") == "https://github.com/org/repo/pull/42"


class TestFormatTelegramPayload:
    """Tests for Telegram payload formatting."""

    def test_basic_payload(self):
        """Should format a Telegram sendMessage payload."""
        event = NotificationEvent(
            event_type="error",
            title="Error Alert",
            message="Build failed",
        )
        payload = format_telegram_payload(event)
        assert "text" in payload
        assert "Error Alert" in payload["text"]
        assert "Build failed" in payload["text"]

    def test_uses_html_parse_mode(self):
        """Should use HTML parse mode for Telegram."""
        event = NotificationEvent(
            event_type="error",
            title="Test",
            message="msg",
        )
        payload = format_telegram_payload(event)
        assert payload.get("parse_mode") == "HTML"


class TestSendWebhook:
    """Tests for send_webhook — HTTP POST to webhook URL."""

    @patch("notifications._opener.open")
    def test_sends_post_request(self, mock_urlopen):
        """Should send a POST request with JSON payload."""
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = b"ok"
        mock_response.__enter__ = lambda s: s
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        result = send_webhook("https://hooks.slack.com/test", {"text": "hello"})
        assert result is True
        mock_urlopen.assert_called_once()

    @patch("notifications._opener.open")
    def test_returns_false_on_network_error(self, mock_urlopen):
        """Should return False and not raise on network errors."""
        mock_urlopen.side_effect = URLError("Connection refused")

        result = send_webhook("https://hooks.slack.com/test", {"text": "hello"})
        assert result is False

    @patch("notifications._opener.open")
    def test_returns_false_on_timeout(self, mock_urlopen):
        """Should return False on timeout."""
        mock_urlopen.side_effect = TimeoutError("timed out")

        result = send_webhook("https://hooks.slack.com/test", {"text": "hello"})
        assert result is False


class TestIsEventEnabled:
    """Tests for is_event_enabled — config-driven event filtering."""

    def test_all_events_disabled_by_default(self):
        """Should disable events when no notification config exists."""
        config = {}
        assert is_event_enabled(config, "pr_created") is False

    def test_event_enabled_in_config(self):
        """Should enable event when configured."""
        config = {
            "notifications": {
                "events": {
                    "pr_created": True,
                    "session_end": True,
                }
            }
        }
        assert is_event_enabled(config, "pr_created") is True

    def test_event_disabled_in_config(self):
        """Should disable event when explicitly set to false."""
        config = {
            "notifications": {
                "events": {
                    "pr_created": False,
                }
            }
        }
        assert is_event_enabled(config, "pr_created") is False

    def test_unknown_event_disabled(self):
        """Should disable events not listed in config."""
        config = {
            "notifications": {
                "events": {
                    "pr_created": True,
                }
            }
        }
        assert is_event_enabled(config, "some_other_event") is False


class TestNotify:
    """Tests for notify — high-level send to all configured platforms."""

    @patch("notifications.send_webhook")
    @patch("notifications.load_secrets")
    def test_sends_to_configured_platforms(self, mock_load_secrets, mock_send):
        """Should send to all platforms with configured webhooks."""
        mock_load_secrets.return_value = {
            "webhooks": {
                "slack": "https://hooks.slack.com/services/T00/B00/xxx",
            }
        }
        mock_send.return_value = True

        config = {
            "notifications": {
                "events": {"pr_created": True},
                "platforms": ["slack"],
            }
        }
        event = NotificationEvent(
            event_type="pr_created",
            title="PR Created",
            message="PR #42",
        )
        results = notify(event, config)
        assert results["slack"] is True

    @patch("notifications.send_webhook")
    @patch("notifications.load_secrets")
    def test_skips_disabled_events(self, mock_load_secrets, mock_send):
        """Should not send when event is disabled in config."""
        mock_load_secrets.return_value = {
            "webhooks": {
                "slack": "https://hooks.slack.com/services/T00/B00/xxx",
            }
        }
        config = {
            "notifications": {
                "events": {"pr_created": False},
                "platforms": ["slack"],
            }
        }
        event = NotificationEvent(
            event_type="pr_created",
            title="PR Created",
            message="PR #42",
        )
        results = notify(event, config)
        assert results == {}
        mock_send.assert_not_called()

    @patch("notifications.send_webhook")
    @patch("notifications.load_secrets")
    def test_skips_platform_without_webhook(self, mock_load_secrets, mock_send):
        """Should skip platforms without configured webhooks."""
        mock_load_secrets.return_value = {"webhooks": {}}
        config = {
            "notifications": {
                "events": {"pr_created": True},
                "platforms": ["slack"],
            }
        }
        event = NotificationEvent(
            event_type="pr_created",
            title="PR Created",
            message="PR #42",
        )
        results = notify(event, config)
        assert "slack" not in results
        mock_send.assert_not_called()
