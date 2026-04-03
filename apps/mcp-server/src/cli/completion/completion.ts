/**
 * Shell Completion Command
 *
 * Generates shell-specific completion scripts for bash, zsh, and fish.
 * Supports dynamic plugin name completion from .codingbuddy/plugins.json.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Completion Data
// ============================================================================

export const COMMANDS = [
  'init',
  'install',
  'search',
  'plugins',
  'update',
  'uninstall',
  'mcp',
  'tui',
  'completion',
] as const;

export const GLOBAL_FLAGS = ['--help', '--version'] as const;

export const COMMAND_FLAGS: Record<string, readonly string[]> = {
  init: ['--force', '--yes', '--api-key'],
  install: ['--force'],
  uninstall: ['--yes'],
  tui: ['--restart'],
  completion: ['bash', 'zsh', 'fish'],
} as const;

const COMMAND_DESCRIPTIONS: Record<string, string> = {
  init: 'Initialize configuration',
  install: 'Install a plugin from git repository',
  search: 'Search plugins in the registry',
  plugins: 'List installed plugins',
  update: 'Check and update outdated plugins',
  uninstall: 'Uninstall a plugin',
  mcp: 'Start MCP server (stdio mode)',
  tui: 'Monitor agent execution in real-time',
  completion: 'Generate shell completion script',
};

// ============================================================================
// Dynamic Plugin Names
// ============================================================================

/**
 * Read plugin names from .codingbuddy/plugins.json.
 */
export function getPluginNames(projectRoot: string): string[] {
  const pluginsPath = join(projectRoot, '.codingbuddy', 'plugins.json');

  if (!existsSync(pluginsPath)) {
    return [];
  }

  try {
    const raw = readFileSync(pluginsPath, 'utf-8');
    const data = JSON.parse(raw) as { plugins?: Array<{ name: string }> };
    return (data.plugins ?? []).map(p => p.name);
  } catch {
    return [];
  }
}

// ============================================================================
// Bash Completion
// ============================================================================

export function generateBashCompletion(): string {
  const cmds = COMMANDS.join(' ');
  const globalFlags = GLOBAL_FLAGS.join(' ');
  const initFlags = (COMMAND_FLAGS.init ?? []).join(' ');
  const installFlags = (COMMAND_FLAGS.install ?? []).join(' ');
  const uninstallFlags = (COMMAND_FLAGS.uninstall ?? []).join(' ');
  const tuiFlags = (COMMAND_FLAGS.tui ?? []).join(' ');

  return `#!/bin/bash
# codingbuddy bash completion
# Install: codingbuddy completion bash >> ~/.bashrc
#   or:    codingbuddy completion bash > /etc/bash_completion.d/codingbuddy

_codingbuddy_get_plugin_names() {
  local plugins_file=".codingbuddy/plugins.json"
  if [[ -f "$plugins_file" ]]; then
    grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$plugins_file" | sed 's/"name"[[:space:]]*:[[:space:]]*"\\([^"]*\\)"/\\1/'
  fi
}

_codingbuddy_completions() {
  local cur prev commands
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  commands="${cmds}"

  # Complete commands at position 1
  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "$commands ${globalFlags}" -- "$cur") )
    return
  fi

  # Complete based on command
  case "\${COMP_WORDS[1]}" in
    init)
      COMPREPLY=( $(compgen -W "${initFlags}" -- "$cur") )
      ;;
    install)
      COMPREPLY=( $(compgen -W "${installFlags}" -- "$cur") )
      ;;
    uninstall)
      if [[ \${COMP_CWORD} -eq 2 ]]; then
        local plugins=$(_codingbuddy_get_plugin_names)
        COMPREPLY=( $(compgen -W "$plugins ${uninstallFlags}" -- "$cur") )
      else
        COMPREPLY=( $(compgen -W "${uninstallFlags}" -- "$cur") )
      fi
      ;;
    update)
      if [[ \${COMP_CWORD} -eq 2 ]]; then
        local plugins=$(_codingbuddy_get_plugin_names)
        COMPREPLY=( $(compgen -W "$plugins" -- "$cur") )
      fi
      ;;
    tui)
      COMPREPLY=( $(compgen -W "${tuiFlags}" -- "$cur") )
      ;;
    completion)
      COMPREPLY=( $(compgen -W "bash zsh fish" -- "$cur") )
      ;;
  esac
}

complete -F _codingbuddy_completions codingbuddy
`;
}

// ============================================================================
// Zsh Completion
// ============================================================================

export function generateZshCompletion(): string {
  const cmdEntries = COMMANDS.map(cmd => `      '${cmd}:${COMMAND_DESCRIPTIONS[cmd] ?? cmd}'`).join(
    '\n',
  );
  const initFlags = (COMMAND_FLAGS.init ?? [])
    .map(
      f =>
        `        '${f}[${f === '--force' ? 'Overwrite existing config' : f === '--yes' ? 'Accept defaults' : 'Anthropic API key'}]'`,
    )
    .join('\n');
  const installFlags = (COMMAND_FLAGS.install ?? [])
    .map(f => `        '${f}[Force install]'`)
    .join('\n');
  const uninstallFlags = (COMMAND_FLAGS.uninstall ?? [])
    .map(f => `        '${f}[Skip confirmation]'`)
    .join('\n');

  return `#compdef codingbuddy
# codingbuddy zsh completion
# Install: codingbuddy completion zsh > ~/.zsh/completions/_codingbuddy
#   then add to ~/.zshrc: fpath=(~/.zsh/completions $fpath)

_codingbuddy_get_plugin_names() {
  local plugins_file=".codingbuddy/plugins.json"
  if [[ -f "$plugins_file" ]]; then
    grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$plugins_file" | sed 's/"name"[[:space:]]*:[[:space:]]*"\\([^"]*\\)"/\\1/'
  fi
}

_codingbuddy() {
  local -a commands
  commands=(
${cmdEntries}
  )

  _arguments -C \\
    '1:command:->command' \\
    '*::arg:->args'

  case "$state" in
    command)
      _describe 'command' commands
      compadd -- --help --version
      ;;
    args)
      case "\${words[1]}" in
        init)
          _arguments \\
${initFlags}
          ;;
        install)
          _arguments \\
${installFlags}
          ;;
        uninstall)
          if (( CURRENT == 2 )); then
            local -a plugins
            plugins=(\${(f)"$(_codingbuddy_get_plugin_names)"})
            compadd -a plugins
          fi
          _arguments \\
${uninstallFlags}
          ;;
        update)
          if (( CURRENT == 2 )); then
            local -a plugins
            plugins=(\${(f)"$(_codingbuddy_get_plugin_names)"})
            compadd -a plugins
          fi
          ;;
        tui)
          _arguments \\
            '--restart[Restart TUI client]'
          ;;
        completion)
          compadd bash zsh fish
          ;;
      esac
      ;;
  esac
}

_codingbuddy "$@"
`;
}

// ============================================================================
// Fish Completion
// ============================================================================

export function generateFishCompletion(): string {
  const noSubcommandCond =
    '__fish_seen_subcommand_from init install search plugins update uninstall mcp tui completion';

  const lines: string[] = [
    '# codingbuddy fish completion',
    '# Install: codingbuddy completion fish > ~/.config/fish/completions/codingbuddy.fish',
    '',
    '# Helper: get plugin names from plugins.json',
    'function __codingbuddy_plugin_names',
    '  set -l plugins_file ".codingbuddy/plugins.json"',
    '  if test -f $plugins_file',
    '    string match -rg \'"name"\\s*:\\s*"([^"]*)"\'  < $plugins_file',
    '  end',
    'end',
    '',
    '# Disable file completions by default',
    'complete -c codingbuddy -f',
    '',
    '# Commands (only when no subcommand given)',
  ];

  for (const cmd of COMMANDS) {
    const desc = COMMAND_DESCRIPTIONS[cmd] ?? cmd;
    lines.push(`complete -c codingbuddy -n "not ${noSubcommandCond}" -a "${cmd}" -d "${desc}"`);
  }

  lines.push('');
  lines.push('# Global flags');
  lines.push(`complete -c codingbuddy -n "not ${noSubcommandCond}" -l help -d "Show help"`);
  lines.push(`complete -c codingbuddy -n "not ${noSubcommandCond}" -l version -d "Show version"`);

  lines.push('');
  lines.push('# init flags');
  lines.push(
    'complete -c codingbuddy -n "__fish_seen_subcommand_from init" -l force -s f -d "Overwrite existing config"',
  );
  lines.push(
    'complete -c codingbuddy -n "__fish_seen_subcommand_from init" -l yes -s y -d "Accept defaults"',
  );
  lines.push(
    'complete -c codingbuddy -n "__fish_seen_subcommand_from init" -l api-key -d "Anthropic API key"',
  );

  lines.push('');
  lines.push('# install flags');
  lines.push(
    'complete -c codingbuddy -n "__fish_seen_subcommand_from install" -l force -s f -d "Force install"',
  );

  lines.push('');
  lines.push('# uninstall - dynamic plugin names + flags');
  lines.push(
    'complete -c codingbuddy -n "__fish_seen_subcommand_from uninstall" -a "(__codingbuddy_plugin_names)" -d "Plugin name"',
  );
  lines.push(
    'complete -c codingbuddy -n "__fish_seen_subcommand_from uninstall" -l yes -s y -d "Skip confirmation"',
  );

  lines.push('');
  lines.push('# update - dynamic plugin names');
  lines.push(
    'complete -c codingbuddy -n "__fish_seen_subcommand_from update" -a "(__codingbuddy_plugin_names)" -d "Plugin name"',
  );

  lines.push('');
  lines.push('# tui flags');
  lines.push(
    'complete -c codingbuddy -n "__fish_seen_subcommand_from tui" -l restart -d "Restart TUI client"',
  );

  lines.push('');
  lines.push('# completion subcommands');
  lines.push(
    'complete -c codingbuddy -n "__fish_seen_subcommand_from completion" -a "bash zsh fish" -d "Shell type"',
  );
  lines.push('');

  return lines.join('\n');
}

// ============================================================================
// Dispatcher
// ============================================================================

export function generateCompletion(shell: string): string | null {
  switch (shell) {
    case 'bash':
      return generateBashCompletion();
    case 'zsh':
      return generateZshCompletion();
    case 'fish':
      return generateFishCompletion();
    default:
      return null;
  }
}

// ============================================================================
// Command Handler
// ============================================================================

export interface CompletionOptions {
  shell: string;
}

export interface CompletionResult {
  success: boolean;
  error?: string;
}

export function runCompletion(options: CompletionOptions): CompletionResult {
  if (!options.shell) {
    process.stderr.write(
      'Error: Missing shell type. Usage: codingbuddy completion <bash|zsh|fish>\n',
    );
    return { success: false, error: 'Missing shell type' };
  }

  const script = generateCompletion(options.shell);

  if (!script) {
    process.stderr.write(
      `Error: Unsupported shell "${options.shell}". Supported: bash, zsh, fish\n`,
    );
    return { success: false, error: `Unsupported shell: ${options.shell}` };
  }

  process.stdout.write(script);
  return { success: true };
}
