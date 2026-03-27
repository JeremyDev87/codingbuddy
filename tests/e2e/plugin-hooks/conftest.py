"""Shared fixtures for plugin hook E2E tests."""
import os
import tempfile
from pathlib import Path

import pytest

from cli_mock import MockEnvironment, LifecycleRunner


@pytest.fixture()
def isolated_home(tmp_path):
    """Create an isolated HOME directory with minimal .claude structure."""
    home = tmp_path / "home"
    home.mkdir()
    claude_dir = home / ".claude"
    claude_dir.mkdir()
    hooks_dir = claude_dir / "hooks"
    hooks_dir.mkdir()
    return str(home)


@pytest.fixture()
def project_dir(tmp_path):
    """Create a temporary project directory with git init."""
    project = tmp_path / "project"
    project.mkdir()
    # Initialize git repo (needed for git-related hooks)
    os.system(f"git init {project} --quiet")
    return str(project)


@pytest.fixture()
def mock_env(isolated_home, project_dir):
    """Create a MockEnvironment with isolated home and project dirs."""
    return MockEnvironment(
        home_dir=isolated_home,
        project_dir=project_dir,
    )


@pytest.fixture()
def lifecycle(mock_env):
    """Create a LifecycleRunner with isolated environment."""
    return LifecycleRunner(env=mock_env)
