import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  COMMANDS,
  GLOBAL_FLAGS,
  COMMAND_FLAGS,
  getPluginNames,
  generateBashCompletion,
  generateZshCompletion,
  generateFishCompletion,
  generateCompletion,
  runCompletion,
} from './completion';

// ============================================================================
// Completion Data Structure
// ============================================================================

describe('completion data', () => {
  it('should export all CLI commands', () => {
    expect(COMMANDS).toContain('init');
    expect(COMMANDS).toContain('install');
    expect(COMMANDS).toContain('search');
    expect(COMMANDS).toContain('plugins');
    expect(COMMANDS).toContain('update');
    expect(COMMANDS).toContain('uninstall');
    expect(COMMANDS).toContain('mcp');
    expect(COMMANDS).toContain('tui');
    expect(COMMANDS).toContain('completion');
  });

  it('should export global flags', () => {
    expect(GLOBAL_FLAGS).toContain('--help');
    expect(GLOBAL_FLAGS).toContain('--version');
  });

  it('should export command-specific flags', () => {
    expect(COMMAND_FLAGS.init).toContain('--force');
    expect(COMMAND_FLAGS.init).toContain('--yes');
    expect(COMMAND_FLAGS.init).toContain('--api-key');
    expect(COMMAND_FLAGS.install).toContain('--force');
    expect(COMMAND_FLAGS.uninstall).toContain('--yes');
  });
});

// ============================================================================
// Dynamic Plugin Names
// ============================================================================

describe('getPluginNames', () => {
  beforeEach(() => {
    vi.mock('fs', async () => {
      const actual = await vi.importActual<typeof import('fs')>('fs');
      return {
        ...actual,
        existsSync: vi.fn(),
        readFileSync: vi.fn(),
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty array when plugins.json does not exist', async () => {
    const fs = await import('fs');
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const names = getPluginNames('/project');

    expect(names).toEqual([]);
  });

  it('should return plugin names from plugins.json', async () => {
    const fs = await import('fs');
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({
        plugins: [
          { name: 'plugin-a', version: '1.0.0' },
          { name: 'plugin-b', version: '2.0.0' },
        ],
      }),
    );

    const names = getPluginNames('/project');

    expect(names).toEqual(['plugin-a', 'plugin-b']);
  });

  it('should return empty array on parse error', async () => {
    const fs = await import('fs');
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (fs.readFileSync as ReturnType<typeof vi.fn>).mockReturnValue('invalid json');

    const names = getPluginNames('/project');

    expect(names).toEqual([]);
  });
});

// ============================================================================
// Bash Completion
// ============================================================================

describe('generateBashCompletion', () => {
  it('should generate valid bash completion script', () => {
    const script = generateBashCompletion();

    expect(script).toContain('_codingbuddy_completions');
    expect(script).toContain('complete -F _codingbuddy_completions codingbuddy');
    expect(script).toContain('COMPREPLY');
  });

  it('should include all commands in bash script', () => {
    const script = generateBashCompletion();

    for (const cmd of COMMANDS) {
      expect(script).toContain(cmd);
    }
  });

  it('should include command-specific flags', () => {
    const script = generateBashCompletion();

    expect(script).toContain('--force');
    expect(script).toContain('--yes');
    expect(script).toContain('--api-key');
  });

  it('should include dynamic plugin completion for update/uninstall', () => {
    const script = generateBashCompletion();

    expect(script).toContain('plugins.json');
  });
});

// ============================================================================
// Zsh Completion
// ============================================================================

describe('generateZshCompletion', () => {
  it('should generate valid zsh completion script', () => {
    const script = generateZshCompletion();

    expect(script).toContain('#compdef codingbuddy');
    expect(script).toContain('_codingbuddy');
    expect(script).toContain('compadd');
  });

  it('should include all commands in zsh script', () => {
    const script = generateZshCompletion();

    for (const cmd of COMMANDS) {
      expect(script).toContain(cmd);
    }
  });

  it('should include command descriptions', () => {
    const script = generateZshCompletion();

    expect(script).toContain('Initialize');
    expect(script).toContain('Install');
    expect(script).toContain('completion');
  });

  it('should include dynamic plugin completion', () => {
    const script = generateZshCompletion();

    expect(script).toContain('plugins.json');
  });
});

// ============================================================================
// Fish Completion
// ============================================================================

describe('generateFishCompletion', () => {
  it('should generate valid fish completion script', () => {
    const script = generateFishCompletion();

    expect(script).toContain('complete -c codingbuddy');
  });

  it('should include all commands in fish script', () => {
    const script = generateFishCompletion();

    for (const cmd of COMMANDS) {
      expect(script).toContain(cmd);
    }
  });

  it('should include command descriptions', () => {
    const script = generateFishCompletion();

    expect(script).toContain('Initialize');
    expect(script).toContain('Install');
  });

  it('should include dynamic plugin completion', () => {
    const script = generateFishCompletion();

    expect(script).toContain('plugins.json');
  });
});

// ============================================================================
// generateCompletion dispatcher
// ============================================================================

describe('generateCompletion', () => {
  it('should return bash script for "bash" shell', () => {
    const script = generateCompletion('bash');

    expect(script).toContain('complete -F _codingbuddy_completions');
  });

  it('should return zsh script for "zsh" shell', () => {
    const script = generateCompletion('zsh');

    expect(script).toContain('#compdef codingbuddy');
  });

  it('should return fish script for "fish" shell', () => {
    const script = generateCompletion('fish');

    expect(script).toContain('complete -c codingbuddy');
  });

  it('should return null for unsupported shell', () => {
    const script = generateCompletion('powershell');

    expect(script).toBeNull();
  });
});

// ============================================================================
// runCompletion command handler
// ============================================================================

describe('runCompletion', () => {
  let stdoutWrite: ReturnType<typeof vi.spyOn>;
  let stderrWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should output bash completion and return success', () => {
    const result = runCompletion({ shell: 'bash' });

    expect(result.success).toBe(true);
    expect(stdoutWrite).toHaveBeenCalled();
    const output = stdoutWrite.mock.calls.map((c: unknown[]) => c[0]).join('');
    expect(output).toContain('complete -F _codingbuddy_completions');
  });

  it('should output zsh completion and return success', () => {
    const result = runCompletion({ shell: 'zsh' });

    expect(result.success).toBe(true);
    const output = stdoutWrite.mock.calls.map((c: unknown[]) => c[0]).join('');
    expect(output).toContain('#compdef codingbuddy');
  });

  it('should output fish completion and return success', () => {
    const result = runCompletion({ shell: 'fish' });

    expect(result.success).toBe(true);
    const output = stdoutWrite.mock.calls.map((c: unknown[]) => c[0]).join('');
    expect(output).toContain('complete -c codingbuddy');
  });

  it('should return failure for unsupported shell', () => {
    const result = runCompletion({ shell: 'powershell' });

    expect(result.success).toBe(false);
    expect(stderrWrite).toHaveBeenCalled();
    const output = stderrWrite.mock.calls.map((c: unknown[]) => c[0]).join('');
    expect(output).toContain('Unsupported shell');
  });

  it('should show usage when no shell is specified', () => {
    const result = runCompletion({ shell: undefined as unknown as string });

    expect(result.success).toBe(false);
    expect(stderrWrite).toHaveBeenCalled();
  });
});
