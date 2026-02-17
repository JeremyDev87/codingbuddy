import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiagnosticLogService } from './diagnostic-log.service';
import { ConfigService } from '../config/config.service';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';

vi.mock('fs/promises');
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('DiagnosticLogService', () => {
  let service: DiagnosticLogService;
  let mockConfigService: ConfigService;

  const TEST_PROJECT_ROOT = '/test/project';
  const LOG_DIR = path.join(TEST_PROJECT_ROOT, 'docs/codingbuddy/log');
  const LOG_FILE = path.join(LOG_DIR, 'diagnostic.log');

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      getProjectRoot: vi.fn().mockReturnValue(TEST_PROJECT_ROOT),
    } as unknown as ConfigService;

    service = new DiagnosticLogService(mockConfigService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getLogDir', () => {
    it('should return correct log directory path', () => {
      const result = service.getLogDir();
      expect(result).toBe(LOG_DIR);
    });
  });

  describe('getLogFilePath', () => {
    it('should return correct log file path', () => {
      const result = service.getLogFilePath();
      expect(result).toBe(LOG_FILE);
    });
  });

  describe('log', () => {
    it('should create log entry and write to file', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.log('info', 'test', 'Test message', {
        key: 'value',
      });

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(LOG_FILE);
      expect(mkdirSync).toHaveBeenCalledWith(LOG_DIR, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalled();

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.version).toBe('1.0.0');
      expect(writtenContent.entries).toHaveLength(1);
      expect(writtenContent.entries[0].level).toBe('info');
      expect(writtenContent.entries[0].category).toBe('test');
      expect(writtenContent.entries[0].message).toBe('Test message');
    });

    it('should append to existing log file', async () => {
      const existingLog = {
        version: '1.0.0',
        createdAt: '2024-01-01T00:00:00.000Z',
        entries: [
          {
            timestamp: '2024-01-01T00:00:00.000Z',
            level: 'info',
            category: 'existing',
            message: 'Existing entry',
          },
        ],
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingLog));
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await service.log('warn', 'new', 'New entry');

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.entries).toHaveLength(2);
    });

    it('should handle write errors gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write failed'));

      const result = await service.log('error', 'test', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Write failed');
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    });

    it('debug should log with debug level', async () => {
      await service.debug('cat', 'msg');

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.entries[0].level).toBe('debug');
    });

    it('info should log with info level', async () => {
      await service.info('cat', 'msg');

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.entries[0].level).toBe('info');
    });

    it('warn should log with warn level', async () => {
      await service.warn('cat', 'msg');

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.entries[0].level).toBe('warn');
    });

    it('error should log with error level', async () => {
      await service.error('cat', 'msg');

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.entries[0].level).toBe('error');
    });
  });

  describe('logConfigLoading', () => {
    beforeEach(() => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    });

    it('should log successful config loading', async () => {
      await service.logConfigLoading(true, '/project', 'ko');

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.entries[0].level).toBe('info');
      expect(writtenContent.entries[0].category).toBe('config');
      expect(writtenContent.entries[0].context.configLanguage).toBe('ko');
    });

    it('should log failed config loading', async () => {
      await service.logConfigLoading(false, '/project', undefined, 'Config not found');

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.entries[0].level).toBe('warn');
      expect(writtenContent.entries[0].context.error).toBe('Config not found');
    });
  });

  describe('readLogs', () => {
    it('should return empty array if file does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.readLogs();

      expect(result).toEqual([]);
    });

    it('should return log entries from file', async () => {
      const logFile = {
        version: '1.0.0',
        createdAt: '2024-01-01T00:00:00.000Z',
        entries: [
          {
            timestamp: '2024-01-01T00:00:00.000Z',
            level: 'info',
            category: 'test',
            message: 'Test',
          },
        ],
      };

      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(logFile));

      const result = await service.readLogs();

      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Test');
    });
  });

  describe('clearLogs', () => {
    it('should delete log file if exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fs.unlink).mockResolvedValue(undefined);

      const result = await service.clearLogs();

      expect(result.success).toBe(true);
      expect(fs.unlink).toHaveBeenCalledWith(LOG_FILE);
    });

    it('should succeed even if file does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.clearLogs();

      expect(result.success).toBe(true);
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });
});
