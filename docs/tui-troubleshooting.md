# TUI Agent Monitor Troubleshooting Guide

This guide helps resolve common issues when running the TUI Agent Monitor in the codingbuddy MCP server.

## Icons Display as Boxes or Question Marks

### Cause

Your terminal is not configured with a Nerd Font, but the TUI is attempting to render Nerd Font icons.

When Nerd Font icons cannot be displayed, you see:
- Box characters (▢, □, ▭)
- Question mark boxes (?)
- Garbled Unicode characters

### Solution

**Step 1: Install a Nerd Font**

Choose a Nerd Font and install it on your system.

macOS with Homebrew:
```bash
brew install --cask font-jetbrains-mono-nerd-font
```

Linux:
```bash
mkdir -p ~/.local/share/fonts
cd ~/.local/share/fonts
curl -fLo "JetBrainsMono.zip" \
  https://github.com/ryanoasis/nerd-fonts/releases/latest/download/JetBrainsMono.zip
unzip JetBrainsMono.zip -d JetBrainsMono
cp JetBrainsMono/*.ttf .
rm -rf JetBrainsMono JetBrainsMono.zip
fc-cache -fv
```

Windows (PowerShell):
```powershell
choco install nerd-fonts-jetbrainsmono
# Or manual: download from https://www.nerdfonts.com/font-downloads
```

**Step 2: Configure Your Terminal**

Set your terminal to use the installed Nerd Font:

- **iTerm2**: Preferences → Profiles → Text → Font → Select installed Nerd Font
- **Terminal.app**: Preferences → Profiles → Font → Select installed Nerd Font
- **GNOME Terminal**: Preferences → Profiles → Text → Font → Select Nerd Font
- **Windows Terminal**: Settings → Profile → Appearance → Font Face → Select Nerd Font

**Step 3: Enable Nerd Font in TUI**

```bash
export TERM_NERD_FONT=true
yarn workspace codingbuddy start:dev -- --tui
```

Or as a one-liner:
```bash
TERM_NERD_FONT=true yarn workspace codingbuddy start:dev -- --tui
```

### Fallback Behavior

If Nerd Font is unavailable and `TERM_NERD_FONT` is not set, the TUI automatically uses text abbreviations:

| Agent | Fallback | Category |
|-------|----------|----------|
| accessibility-specialist | [Ac] | Specialist |
| architecture-specialist | [Ar] | Specialist |
| code-quality-specialist | [CQ] | Specialist |
| code-reviewer | [CR] | Specialist |
| documentation-specialist | [Do] | Specialist |
| event-architecture-specialist | [Ev] | Specialist |
| integration-specialist | [In] | Specialist |
| migration-specialist | [Mi] | Specialist |
| observability-specialist | [Ob] | Specialist |
| performance-specialist | [Pf] | Specialist |
| security-specialist | [Se] | Specialist |
| seo-specialist | [SO] | Specialist |
| test-strategy-specialist | [Ts] | Specialist |
| i18n-specialist | [i8] | Specialist |
| frontend-developer | [Fe] | Developer |
| backend-developer | [Be] | Developer |
| mobile-developer | [Mo] | Developer |
| data-engineer | [Da] | Developer |
| ai-ml-engineer | [AI] | Developer |
| platform-engineer | [Pl] | Developer |
| tooling-engineer | [To] | Developer |
| devops-engineer | [Dv] | Developer |
| ui-ux-designer | [Ux] | Developer |
| solution-architect | [SA] | Developer |
| agent-architect | [AA] | Developer |
| plan-mode | [PM] | Mode |
| act-mode | [AM] | Mode |
| eval-mode | [EM] | Mode |
| technical-planner | [TP] | Mode |

This is a normal, supported fallback mode - no action required unless you prefer icons.

## Colors Don't Display Correctly

### Issue: No Colors (Monochrome Output)

**Cause:** `NO_COLOR` environment variable is set.

**Solution:** Unset the variable:

```bash
unset NO_COLOR
yarn workspace codingbuddy start:dev -- --tui
```

If you need to disable colors, use a different approach (e.g., pipe to `sed` for post-processing rather than using `NO_COLOR`).

### Issue: Limited Colors (Only 16 Basic Colors)

**Cause:** `COLORTERM` environment variable is not set or set to an unsupported value.

**Solution:** Set `COLORTERM` to enable higher color depth:

```bash
export COLORTERM=truecolor
yarn workspace codingbuddy start:dev -- --tui
```

Or one-liner:
```bash
COLORTERM=truecolor yarn workspace codingbuddy start:dev -- --tui
```

### Issue: Raw ANSI Codes Display as Text

**Cause:** Your terminal doesn't support ANSI escape sequences.

**Solution:**

1. Use a modern terminal that supports ANSI colors:
   - macOS: iTerm2, Terminal.app, WezTerm
   - Linux: GNOME Terminal, Konsole, Kitty, WezTerm
   - Windows: Windows Terminal (not cmd.exe)

2. If using SSH, ensure `TERM` passthrough:
   ```bash
   ssh -o "SetEnv TERM=xterm-256color" user@host
   ```

3. Check terminal supports colors:
   ```bash
   # Print color test
   for i in {0..7}; do echo -e "\033[3${i}m Color $i \033[0m"; done
   ```

### Color Depth Reference Table

The TUI detects your terminal's color capabilities automatically. These color depths are supported:

| Depth | Name | Colors | Detection |
|-------|------|--------|-----------|
| 0 | none | Monochrome | `NO_COLOR` env var set |
| 1 | basic | 16 ANSI colors | TTY detected, no enhanced support |
| 2 | 256 | 256 colors | Standard terminal support |
| 3 | truecolor | 16.7M (24-bit) | `COLORTERM=truecolor` or modern terminal |

**Verify detected color depth:**

```bash
MCP_DEBUG=1 yarn workspace codingbuddy start:dev -- --tui 2>&1 | grep -i color
```

## stdout Conflicts (stdio Mode)

### How stdout Protection Works

In **stdio mode** (default), the MCP server must keep stdout clean for JSON-RPC protocol messages. The TUI renders to stderr instead:

```
┌─────────────────┐
│  Your Terminal  │
├─────────────────┤
│  stderr         │ ← TUI Dashboard renders here (visible)
│  stdout         │ ← MCP JSON-RPC protocol (clean, not visible)
└─────────────────┘
```

This separation prevents TUI rendering from interfering with MCP protocol communication.

### Verify stdout Protection

**Check with debug logging:**

```bash
MCP_DEBUG=1 yarn workspace codingbuddy start:dev -- --tui 2>&1 | head -50
```

Expected debug output shows:
```
[codingbuddy] TUI Agent Monitor started (stderr)
```

**Verify stdout is clean:**

```bash
yarn workspace codingbuddy start:dev -- --tui 2>/dev/null | jq . | head -20
```

This pipes stderr away and shows stdout. You should see JSON-RPC messages, not TUI output.

### Detect console.log Pollution

If code elsewhere calls `console.log()`, it pollutes stdout:

```bash
MCP_DEBUG=1 yarn workspace codingbuddy start:dev -- --tui 2>&1 | grep -v "^\[codingbuddy\]"
```

Any non-TUI output here indicates code calling `console.log()` somewhere. Search the codebase:

```bash
grep -r "console.log" apps/mcp-server/src --exclude-dir=node_modules
```

### SSE Mode Has No Conflict

In **SSE mode**, the MCP server uses HTTP, not stdout:

```bash
export MCP_TRANSPORT=sse
yarn workspace codingbuddy start:dev -- --tui
```

SSE mode renders TUI to stdout with no conflicts. HTTP clients connect to `http://localhost:3000` (or configured `PORT`).

## TUI Not Rendering

### Issue: TUI Doesn't Appear (stdio mode)

**Cause 1: Missing `--tui` flag**

The TUI is disabled by default. Enable it with the flag:

```bash
# WRONG - TUI disabled
yarn workspace codingbuddy start:dev

# CORRECT - TUI enabled
yarn workspace codingbuddy start:dev -- --tui
```

Note the double dash `--` before `--tui`. This tells yarn to pass the flag to the app, not to yarn itself.

**Cause 2: stderr is not a TTY (piped or redirected)**

When stderr is piped or redirected, it's not interactive, so TUI is disabled:

```bash
# stderr is piped - TUI won't render
yarn workspace codingbuddy start:dev -- --tui 2>/tmp/tui.log

# stderr is redirected - TUI won't render
yarn workspace codingbuddy start:dev -- --tui 2>&1 | cat

# stderr is normal terminal - TUI renders
yarn workspace codingbuddy start:dev -- --tui
```

**Solution:** Keep stderr connected to the terminal:

```bash
# Correct: TUI visible, stdout/stderr both to terminal
yarn workspace codingbuddy start:dev -- --tui

# Capture only stdout for processing, TUI sees stderr
yarn workspace codingbuddy start:dev -- --tui 2>/dev/null > output.json
```

### Diagnosis with Debug Logging

Enable debug logging to see why TUI isn't rendering:

```bash
MCP_DEBUG=1 yarn workspace codingbuddy start:dev -- --tui 2>&1
```

Expected outputs:

```
# TUI rendering normally
[codingbuddy] TUI Agent Monitor started (stderr)

# TUI disabled - stderr not a TTY (--tui was set but stderr is piped/redirected)
[codingbuddy] stderr is not a TTY; skipping TUI render
```

If you see the second message, review the solutions above. Note that when `--tui` is absent, no debug message is emitted (the TUI code path is not reached at all).

## Terminal Size Too Small

### Recommended Size

The TUI works best with a terminal size of at least 80 columns by 24 rows. Smaller sizes may produce rendering artifacts or truncated output:

| Dimension | Recommended |
|-----------|-------------|
| Width | 80 columns |
| Height | 24 rows |

Note: These are recommendations, not hard limits. The TUI does not enforce a minimum size, but smaller terminals may experience layout issues.

### Check Terminal Size

```bash
# Display terminal width and height
tput cols  # columns (width)
tput lines # lines (height)

# Example output
80
24
```

### Increase Terminal Size

- **Mouse**: Drag terminal window corners or edges to resize
- **Keyboard**: Use terminal application menu or fullscreen mode (usually F11)
- **SSH**: Terminal size inherits from local terminal; resize local terminal first

### tmux and screen Panes

If running in tmux or screen, resize the pane:

**tmux:**
```bash
# Resize tmux pane to 120 columns × 40 rows
tmux resize-pane -x 120 -y 40

# Or in split layout, resize to fit
tmux resize-window -x 120 -y 40
```

**screen:**
```bash
# Inside screen session, use terminal size change
# (Usually Ctrl+A then ?)
```

Then run the TUI:

```bash
yarn workspace codingbuddy start:dev -- --tui
```

## Graceful Shutdown Issues

### Normal Shutdown Sequence

The TUI implements automatic graceful shutdown:

**Signals Handled:**
- `SIGINT` (Ctrl+C in terminal)
- `SIGTERM` (kill command)

**Shutdown Order:**
1. Receive signal (SIGINT/SIGTERM)
2. Unmount TUI from Ink renderer
3. Close NestJS application
4. Exit process with code 0

**Expected behavior:**

```bash
$ yarn workspace codingbuddy start:dev -- --tui
# ... TUI running ...
# Press Ctrl+C
# TUI disappears, process exits cleanly
$ echo $?
0
```

### Terminal Left in Bad State

If shutdown is interrupted (e.g., kill -9) or crashes, the terminal may be left with:
- Cursor hidden
- Colors not reset
- Terminal in raw mode

**Solution: Reset Terminal**

```bash
# Standard reset command
reset

# Or if reset unavailable
stty sane
tput reset

# Or manually restore
echo -e "\033[?25h"  # Show cursor
clear               # Clear screen
```

### Force Shutdown

If normal shutdown doesn't work:

```bash
# Find the process
ps aux | grep "yarn.*start:dev.*--tui"

# Kill the process (if PID is 12345)
kill -9 12345

# Reset terminal
reset
```

### Verify Clean Shutdown

After shutdown, verify terminal is responsive:

```bash
# Terminal should respond immediately
echo "Terminal OK"

# Colors should work
echo -e "\033[32mGreen text\033[0m"

# Cursor should be visible (blinking)
```

If any of these fail, run `reset` again.

## Debugging

### Enable Debug Logging

All TUI operations can be logged with `MCP_DEBUG=1`:

```bash
MCP_DEBUG=1 yarn workspace codingbuddy start:dev -- --tui 2>&1
```

Debug output includes:
- TUI startup/shutdown events
- Configuration resolution
- Signal handling
- TTY detection

### TUI Configuration Resolution

When starting with `--tui`, the server resolves configuration in this order:

| Step | Check | Example Output |
|------|-------|-----------------|
| 1 | `--tui` flag present? | `TUI not enabled (--tui flag not present)` |
| 2 | Transport mode? | `SSE mode: TUI renders to stdout` |
| 3 | (stdio only) stderr is TTY? | `stdio mode: TUI renders to stderr to protect stdout for MCP JSON-RPC` |
| 4 | All checks pass? | `TUI Agent Monitor started (stderr)` |

Enable debug logging to see each step:

```bash
MCP_DEBUG=1 yarn workspace codingbuddy start:dev -- --tui 2>&1 | grep -i "tui\|stderr\|sse"
```

### Common Debug Scenarios

**Scenario 1: Verify Nerd Font Detection**

```bash
TERM_NERD_FONT=true MCP_DEBUG=1 yarn workspace codingbuddy start:dev -- --tui 2>&1
```

Expected: TUI renders with icons, debug log shows Nerd Font enabled.

**Scenario 2: Verify Color Support**

```bash
COLORTERM=truecolor MCP_DEBUG=1 yarn workspace codingbuddy start:dev -- --tui 2>&1
```

Expected: TUI renders with vibrant colors, no raw ANSI codes visible.

**Scenario 3: Verify stdout Protection**

```bash
MCP_DEBUG=1 yarn workspace codingbuddy start:dev -- --tui 2>/dev/null | jq . 2>/dev/null | head -5
```

Expected: JSON-RPC messages visible on stdout, TUI not interfering.

**Scenario 4: Verify Graceful Shutdown**

```bash
MCP_DEBUG=1 yarn workspace codingbuddy start:dev -- --tui 2>&1 &
sleep 2
kill -SIGINT $!
wait
```

Expected: Debug log shows `Graceful shutdown: unmounting TUI...`, then clean exit.

## Related Documentation

- [TUI User Guide](./tui-guide.md) - How to run and configure the TUI
- [TUI Architecture](./tui-architecture.md) - Internal component structure and event flow
- [MCP Protocol](https://spec.modelcontextprotocol.io/) - Model Context Protocol specification
- [Ink CLI](https://github.com/vadimdemedes/ink) - React renderer for terminals (used by TUI)
