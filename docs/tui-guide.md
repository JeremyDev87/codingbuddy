# TUI Agent Monitor User Guide

The TUI (Terminal User Interface) Agent Monitor provides a real-time, interactive dashboard for monitoring MCP server operations across different transport modes.

## Quick Start

Run the MCP server with the `--tui` flag to enable the agent monitor:

```bash
# From root directory
yarn workspace codingbuddy start:dev -- --tui

# Or from apps/mcp-server/
cd apps/mcp-server
yarn start:dev -- --tui
```

The TUI will render automatically when the server starts. Use `--tui` with either stdio or SSE transport modes.

## Transport Mode Behavior

The TUI rendering behavior depends on your configured transport mode:

| Transport Mode | TUI Output | MCP Output | Use Case |
|---|---|---|---|
| **stdio** (default) | Stderr | Stdout | Protects MCP JSON-RPC communication on stdout; TUI visible in terminal |
| **SSE** | Stdout | HTTP | MCP uses HTTP protocol; TUI renders to stdout |

**Key Point**: In stdio mode, the TUI dashboard renders to stderr while MCP protocol messages flow through stdout. This separation prevents TUI rendering from interfering with MCP JSON-RPC communication.

## Environment Variables

Configure TUI behavior using these environment variables:

| Variable | Type | Default | Description |
|---|---|---|---|
| `MCP_TRANSPORT` | string | `stdio` | Transport mode: `stdio` or `sse` |
| `TERM_NERD_FONT` | string | `false` | Enable Nerd Font icons: `1` or `true` |
| `NO_COLOR` | flag | Unset | Disable all colors in TUI output |
| `COLORTERM` | string | Auto-detect | Color depth hint for chalk (set to `truecolor` for 24-bit color) |
| `MCP_DEBUG` | flag | Unset | Enable debug logging (helpful with TUI) |
| `PORT` | number | `3000` | HTTP port for SSE mode |
| `CORS_ORIGIN` | string | Unset | CORS origin(s): single URL, comma-separated list, or `*` |

### Environment Variable Examples

```bash
# Enable Nerd Font icons
export TERM_NERD_FONT=true
yarn workspace codingbuddy start:dev -- --tui

# Disable colors (useful for CI/CD)
export NO_COLOR=1
yarn workspace codingbuddy start:dev -- --tui

# Enable 24-bit color support
export COLORTERM=truecolor
yarn workspace codingbuddy start:dev -- --tui

# SSE mode with TUI on custom port
export MCP_TRANSPORT=sse
export PORT=4000
yarn workspace codingbuddy start:dev -- --tui
```

## Usage Examples

### Example 1: Run with Default Settings

```bash
yarn workspace codingbuddy start:dev -- --tui
```

The TUI renders to stderr with auto-detected terminal dimensions and native Unicode characters.

### Example 2: Run with Nerd Font Icons

```bash
export TERM_NERD_FONT=true
yarn workspace codingbuddy start:dev -- --tui
```

Replaces standard Unicode characters with Nerd Font icons for enhanced visual presentation.

### Example 3: SSE Mode with TUI

```bash
export MCP_TRANSPORT=sse
export PORT=4000
yarn workspace codingbuddy start:dev -- --tui
```

Runs the server in SSE mode with TUI rendering to stdout. Connect via HTTP clients to `http://localhost:4000`.

### Example 4: CI/CD Environment

```bash
export NO_COLOR=1
yarn workspace codingbuddy start:dev -- --tui
```

Suitable for CI/CD pipelines: disables colors and ensures predictable output formatting.

### Example 5: Full Featured Setup

```bash
export MCP_TRANSPORT=stdio
export TERM_NERD_FONT=true
export COLORTERM=truecolor
export MCP_DEBUG=1
yarn workspace codingbuddy start:dev -- --tui
```

Enables all features: Nerd Font icons, 24-bit color, debug logging, and stdio transport.

## Supported Terminals

The TUI Agent Monitor is optimized for various terminal environments:

### Recommended

These terminals provide the best experience with full feature support:

- **iTerm2** (macOS) - Full 24-bit color, Nerd Font support, unicode rendering
- **WezTerm** (Cross-platform) - Excellent TUI rendering, 24-bit color, ligatures
- **Alacritty** (Cross-platform) - High-performance, 24-bit color, GPU-accelerated rendering
- **Kitty** (Linux/macOS) - Modern rendering engine, advanced color support
- **Terminal.app** (macOS) - Native macOS terminal with good unicode support

### Compatible

These terminals work well but may have minor limitations:

- **GNOME Terminal** (Linux) - Good color support, full unicode, slightly slower rendering
- **Konsole** (Linux KDE) - Full features, good color depth, stable
- **Windows Terminal** (Windows) - Modern terminal with 24-bit color, good unicode
- **VS Code Integrated Terminal** - Delegates to host terminal, inherits limitations
- **tmux/screen** - Supported with color passthrough (may reduce color depth)

### Minimal

These terminals support basic TUI rendering but lack advanced features:

- **xterm** (Linux/Unix) - 256-color support, basic unicode, limited rendering
- **cmd.exe** (Windows) - Basic color support, slower rendering
- **Terminal.app Legacy** (macOS 10.8 and earlier) - Limited unicode, monochrome

### Not Supported

The TUI will not render correctly in these environments:

- **SSH sessions without TERM passthrough** - Set `TERM=xterm-256color` on remote
- **CI/CD pipes without TTY** - Omit the `--tui` flag or pipe output
- **Serial console** - Use text-only output instead
- **Dumb terminals** - Not suitable for interactive TUI

## Nerd Font Installation

Nerd Fonts enhance the TUI with beautiful icons and symbols. Install Nerd Font for your platform:

### macOS (Homebrew)

```bash
# Install a Nerd Font (choose one)
brew install --cask font-jetbrains-mono-nerd-font    # JetBrains Mono
brew install --cask font-fira-code-nerd-font         # Fira Code
brew install --cask font-meslo-lg-nerd-font          # Meslo LG
brew install --cask font-roboto-mono-nerd-font       # Roboto Mono

# Verify installation (quick check)
ls ~/Library/Fonts/*JetBrains* /Library/Fonts/*JetBrains* 2>/dev/null
```

After installation, configure your terminal to use the Nerd Font:

- **iTerm2**: Preferences → Profiles → Text → Font → Select installed Nerd Font
- **Terminal.app**: Preferences → Profiles → Font → Select installed Nerd Font

Then enable Nerd Font in the TUI:

```bash
export TERM_NERD_FONT=true
yarn workspace codingbuddy start:dev -- --tui
```

### Linux

```bash
# Create fonts directory
mkdir -p ~/.local/share/fonts
cd ~/.local/share/fonts

# Download and install a Nerd Font (example: JetBrains Mono)
curl -fLo "JetBrainsMono.zip" \
  https://github.com/ryanoasis/nerd-fonts/releases/latest/download/JetBrainsMono.zip
unzip JetBrainsMono.zip -d JetBrainsMono
cp JetBrainsMono/*.ttf .
rm -rf JetBrainsMono JetBrainsMono.zip

# Refresh font cache
fc-cache -fv

# Verify installation
fc-list | grep -i "jetbrains"
```

Configure your terminal to use the font:

- **GNOME Terminal**: Preferences → Profiles → Text → Font → Select JetBrains Mono Nerd Font
- **Konsole**: Settings → Edit Current Profile → Appearance → Font
- **xterm**: Add to `~/.Xresources`: `xterm*font: -\*-JetBrainsMono-\*-\*-\*-\*-12-\*-\*-\*-\*-\*-\*`

Enable in the TUI:

```bash
export TERM_NERD_FONT=true
yarn workspace codingbuddy start:dev -- --tui
```

### Windows

```powershell
# Using Chocolatey
choco install nerd-fonts-jetbrainsmono

# Or manual installation:
# 1. Download from https://www.nerdfonts.com/font-downloads
# 2. Extract .ttf files
# 3. Right-click → Install for all users
```

Configure Windows Terminal:

1. Open Windows Terminal → Settings (Ctrl+,)
2. Select your profile
3. Go to Appearance
4. Set Font Face to "JetBrains Mono Nerd Font"

Enable in the TUI:

```powershell
$env:TERM_NERD_FONT = "true"
yarn workspace codingbuddy start:dev -- --tui
```

## UI Components Overview

The TUI Agent Monitor dashboard consists of four primary components arranged vertically:

```
┌──────────────────────────────────────────────────────────────────────┐
│  🤖 CODINGBUDDY              ● ACT                        14:23:45  │
├──────────────────────────────────────────────────────────────────────┤
│                    ┌──────────────────────┐                          │
│                    │ [AA] agent-architect │                          │
│                    │ ████████░░ running   │                          │
│                    └──────────────────────┘                          │
│                              │                                       │
│                    ┌─────────┴─────────┐                            │
│          ┌─────────────────┐ ┌─────────────────┐                    │
│          │ [Se] security   │ │ [CQ] code-qual  │                    │
│          │ ██████░░ running│ │ ████████ done    │                    │
│          └─────────────────┘ └─────────────────┘                    │
├──────────────────────────────────────────────────────────────────────┤
│  Specialists: [Ac] [Ar] [CQ] [CR] [Do] [Ev] [In] [Mi] ...         │
│  Developers:  [Fe] [Be] [Mo] [Da] [AI] [Pl] [To] [Dv] [Ux] ...    │
├──────────────────────────────────────────────────────────────────────┤
│  🤖 2 active  🎹 tdd, debugging  ████████░░ 80%  ⚡ Parallel       │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Descriptions

**Header**: Displays "CODINGBUDDY" branding, current workflow mode (PLAN/ACT/EVAL/AUTO) with mode-specific color, and a real-time clock.

**AgentTree**: Shows the primary agent as a card with a progress bar and status label. When parallel agents are active, displays branching connectors to child agent cards below.

**AgentGrid**: Groups all available agents by category (Specialists, Developers, Modes) using `CategoryRow` components. Each agent is shown as an `AgentMiniCard` with its icon or fallback abbreviation. Active agents are highlighted.

**StatusBar**: Displays active agent count, recommended skills, an overall progress bar with percentage, and the current execution phase (Parallel/Sequential/Waiting).

**Color Coding** (when enabled):

Agent status colors:
- Gray: Idle (not running)
- Cyan: Running (actively executing)
- Green: Completed successfully
- Red: Failed (error occurred)

Mode colors:
- Blue: PLAN mode
- Green: ACT mode
- Yellow: EVAL mode
- Magenta: AUTO mode

Phase colors:
- Cyan: Parallel execution
- Green: Sequential execution
- Gray: Waiting

## Related Documentation

- [TUI Architecture](./tui-architecture.md) - Internal component structure and event flow
- [TUI Troubleshooting](./tui-troubleshooting.md) - Common issues and solutions
- [Agent Definitions](../packages/rules/.ai-rules/agents/README.md) - Specialist agent specifications
- [MCP Protocol](https://spec.modelcontextprotocol.io/) - Model Context Protocol specification
