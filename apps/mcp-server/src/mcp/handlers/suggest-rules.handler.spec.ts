import { SuggestRulesHandler } from './suggest-rules.handler';
import * as child_process from 'child_process';

vi.mock('child_process');

describe('SuggestRulesHandler', () => {
  let handler: SuggestRulesHandler;

  const mockSuggestions = [
    {
      title: 'Repeated Bash failure: rm -rf /bad/path',
      description:
        'The `Bash` tool failed 5 times across 3 sessions with input `rm -rf /bad/path`.',
      rule_content: '# Repeated Bash failure\n\n> Auto-detected rule\n',
      pattern: {
        tool_name: 'Bash',
        input_summary: 'rm -rf /bad/path',
        failure_count: 5,
        session_count: 3,
        first_seen: 1700000000,
        last_seen: 1700100000,
      },
    },
    {
      title: 'Repeated Read failure: /nonexistent/file.ts',
      description:
        'The `Read` tool failed 3 times across 3 sessions with input `/nonexistent/file.ts`.',
      rule_content: '# Repeated Read failure\n\n> Auto-detected rule\n',
      pattern: {
        tool_name: 'Read',
        input_summary: '/nonexistent/file.ts',
        failure_count: 3,
        session_count: 3,
        first_seen: 1700000000,
        last_seen: 1700100000,
      },
    },
  ];

  beforeEach(() => {
    vi.mocked(child_process.execFile).mockImplementation(
      (_cmd: string, _args: readonly string[] | undefined | null, _opts: unknown, cb: unknown) => {
        const callback = cb as (err: Error | null, stdout: string, stderr: string) => void;
        callback(null, JSON.stringify(mockSuggestions), '');
        return {} as child_process.ChildProcess;
      },
    );

    handler = new SuggestRulesHandler();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null for unhandled tools', async () => {
    const result = await handler.handle('unknown_tool', {});
    expect(result).toBeNull();
  });

  describe('suggest_rules', () => {
    it('should return suggestions from pipeline', async () => {
      const result = await handler.handle('suggest_rules', {});

      expect(result).not.toBeNull();
      expect(result?.isError).toBeFalsy();

      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.suggestions).toHaveLength(2);
      expect(parsed.suggestions[0].title).toContain('Bash');
    });

    it('should pass minOccurrences parameter to pipeline', async () => {
      await handler.handle('suggest_rules', { minOccurrences: 5 });

      expect(child_process.execFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--min-occurrences', '5']),
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should pass days parameter to pipeline', async () => {
      await handler.handle('suggest_rules', { days: 14 });

      expect(child_process.execFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--days', '14']),
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should pass dbPath parameter to pipeline', async () => {
      await handler.handle('suggest_rules', { dbPath: '/custom/history.db' });

      expect(child_process.execFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['--db-path', '/custom/history.db']),
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should handle pipeline returning empty suggestions', async () => {
      vi.mocked(child_process.execFile).mockImplementation(
        (
          _cmd: string,
          _args: readonly string[] | undefined | null,
          _opts: unknown,
          cb: unknown,
        ) => {
          const callback = cb as (err: Error | null, stdout: string, stderr: string) => void;
          callback(null, '[]', '');
          return {} as child_process.ChildProcess;
        },
      );

      const result = await handler.handle('suggest_rules', {});

      expect(result).not.toBeNull();
      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.suggestions).toHaveLength(0);
    });

    it('should return error when pipeline fails', async () => {
      vi.mocked(child_process.execFile).mockImplementation(
        (
          _cmd: string,
          _args: readonly string[] | undefined | null,
          _opts: unknown,
          cb: unknown,
        ) => {
          const callback = cb as (err: Error | null, stdout: string, stderr: string) => void;
          callback(new Error('Python not found'), '', 'error');
          return {} as child_process.ChildProcess;
        },
      );

      const result = await handler.handle('suggest_rules', {});

      expect(result).not.toBeNull();
      expect(result?.isError).toBe(true);
      expect(result!.content[0].text).toContain('Pipeline execution failed');
    });

    it('should return error when pipeline outputs invalid JSON', async () => {
      vi.mocked(child_process.execFile).mockImplementation(
        (
          _cmd: string,
          _args: readonly string[] | undefined | null,
          _opts: unknown,
          cb: unknown,
        ) => {
          const callback = cb as (err: Error | null, stdout: string, stderr: string) => void;
          callback(null, 'not valid json', '');
          return {} as child_process.ChildProcess;
        },
      );

      const result = await handler.handle('suggest_rules', {});

      expect(result).not.toBeNull();
      expect(result?.isError).toBe(true);
      expect(result!.content[0].text).toContain('Failed to parse');
    });

    it('should include metadata in response', async () => {
      const result = await handler.handle('suggest_rules', {});

      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed).toHaveProperty('generatedAt');
      expect(parsed).toHaveProperty('count');
      expect(parsed.count).toBe(2);
    });
  });

  describe('getToolDefinitions', () => {
    it('should return suggest_rules definition', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('suggest_rules');
    });

    it('should have correct input schema properties', () => {
      const definitions = handler.getToolDefinitions();
      const schema = definitions[0].inputSchema;

      expect(schema.properties).toHaveProperty('minOccurrences');
      expect(schema.properties).toHaveProperty('days');
      expect(schema.properties).toHaveProperty('dbPath');
    });

    it('should have no required parameters', () => {
      const definitions = handler.getToolDefinitions();
      expect(definitions[0].inputSchema.required).toEqual([]);
    });
  });
});
