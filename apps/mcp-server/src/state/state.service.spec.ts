import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateService } from './state.service';
import { ConfigService } from '../config/config.service';
import * as fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import {
  STATE_DIR_NAME,
  STATE_FILES,
  STATE_SCHEMA_VERSION,
  type ProjectMetadata,
  type StateDocument,
} from './state.types';

vi.mock('fs/promises');
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

describe('StateService', () => {
  let service: StateService;
  let mockConfigService: ConfigService;
  const mockProjectRoot = '/test/project';
  const stateDir = path.join(mockProjectRoot, STATE_DIR_NAME);

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      getProjectRoot: vi.fn().mockReturnValue(mockProjectRoot),
    } as unknown as ConfigService;

    service = new StateService(mockConfigService);

    // Default: state directory exists
    vi.mocked(existsSync).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveProjectMetadata', () => {
    it('should save project metadata to file', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue();

      const metadata: ProjectMetadata = {
        projectRoot: mockProjectRoot,
        detectedAt: new Date().toISOString(),
        configFile: 'codingbuddy.config.js',
        lastMode: 'PLAN',
      };

      const result = await service.saveProjectMetadata(metadata);

      expect(result.success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(stateDir, STATE_FILES.PROJECT_METADATA),
        expect.any(String),
        'utf-8',
      );
    });

    it('should create state directory if not exists', async () => {
      vi.mocked(existsSync).mockReturnValueOnce(false);
      vi.mocked(fs.writeFile).mockResolvedValue();

      await service.saveProjectMetadata({
        projectRoot: mockProjectRoot,
        detectedAt: new Date().toISOString(),
      });

      expect(mkdirSync).toHaveBeenCalledWith(stateDir, { recursive: true });
    });

    it('should include schema version in saved document', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue();

      await service.saveProjectMetadata({
        projectRoot: mockProjectRoot,
        detectedAt: new Date().toISOString(),
      });

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const savedContent = JSON.parse(writeCall[1] as string) as StateDocument;

      expect(savedContent.version).toBe(STATE_SCHEMA_VERSION);
      expect(savedContent.project).toBeDefined();
      expect(savedContent.updatedAt).toBeDefined();
    });

    it('should handle write errors gracefully', async () => {
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write failed'));

      const result = await service.saveProjectMetadata({
        projectRoot: mockProjectRoot,
        detectedAt: new Date().toISOString(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Write failed');
    });
  });

  describe('loadProjectMetadata', () => {
    it('should load project metadata from file', async () => {
      const savedDoc: StateDocument = {
        version: STATE_SCHEMA_VERSION,
        project: {
          projectRoot: mockProjectRoot,
          detectedAt: '2026-01-11T00:00:00.000Z',
          lastMode: 'ACT',
        },
        updatedAt: '2026-01-11T00:00:00.000Z',
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(savedDoc));

      const result = await service.loadProjectMetadata();

      expect(result).not.toBeNull();
      expect(result?.projectRoot).toBe(mockProjectRoot);
      expect(result?.lastMode).toBe('ACT');
    });

    it('should return null if file does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.loadProjectMetadata();

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json');

      const result = await service.loadProjectMetadata();

      expect(result).toBeNull();
    });

    it('should return null for version mismatch', async () => {
      const savedDoc: StateDocument = {
        version: 999, // Future version
        project: {
          projectRoot: mockProjectRoot,
          detectedAt: '2026-01-11T00:00:00.000Z',
        },
        updatedAt: '2026-01-11T00:00:00.000Z',
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(savedDoc));

      const result = await service.loadProjectMetadata();

      expect(result).toBeNull();
    });
  });

  describe('updateLastMode', () => {
    it('should update lastMode in existing metadata', async () => {
      const existingDoc: StateDocument = {
        version: STATE_SCHEMA_VERSION,
        project: {
          projectRoot: mockProjectRoot,
          detectedAt: '2026-01-11T00:00:00.000Z',
          lastMode: 'PLAN',
        },
        updatedAt: '2026-01-11T00:00:00.000Z',
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingDoc));
      vi.mocked(fs.writeFile).mockResolvedValue();

      const result = await service.updateLastMode('ACT');

      expect(result.success).toBe(true);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const savedContent = JSON.parse(writeCall[1] as string) as StateDocument;
      expect(savedContent.project.lastMode).toBe('ACT');
    });

    it('should create new metadata if not exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFile).mockResolvedValue();

      const result = await service.updateLastMode('PLAN');

      expect(result.success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });

  describe('updateLastSession', () => {
    it('should update lastSessionId in existing metadata', async () => {
      const existingDoc: StateDocument = {
        version: STATE_SCHEMA_VERSION,
        project: {
          projectRoot: mockProjectRoot,
          detectedAt: '2026-01-11T00:00:00.000Z',
        },
        updatedAt: '2026-01-11T00:00:00.000Z',
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(existingDoc));
      vi.mocked(fs.writeFile).mockResolvedValue();

      const result = await service.updateLastSession('2026-01-11-test-session');

      expect(result.success).toBe(true);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const savedContent = JSON.parse(writeCall[1] as string) as StateDocument;
      expect(savedContent.project.lastSessionId).toBe(
        '2026-01-11-test-session',
      );
    });
  });

  describe('clearState', () => {
    it('should delete state files', async () => {
      vi.mocked(fs.unlink).mockResolvedValue();

      const result = await service.clearState();

      expect(result.success).toBe(true);
      expect(fs.unlink).toHaveBeenCalledWith(
        path.join(stateDir, STATE_FILES.PROJECT_METADATA),
      );
    });

    it('should handle missing files gracefully', async () => {
      vi.mocked(fs.unlink).mockRejectedValue({ code: 'ENOENT' });

      const result = await service.clearState();

      expect(result.success).toBe(true);
    });

    it('should handle non-ENOENT errors', async () => {
      vi.mocked(fs.unlink).mockRejectedValue({ code: 'EACCES' });

      const result = await service.clearState();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle Error objects in clearState', async () => {
      vi.mocked(fs.unlink).mockRejectedValue(new Error('Permission denied'));

      const result = await service.clearState();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  describe('getStateDir', () => {
    it('should return correct state directory path', () => {
      const result = service.getStateDir();

      expect(result).toBe(stateDir);
    });
  });

  describe('saveModeConfigSnapshot', () => {
    it('should save mode config snapshot to file', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue();

      const snapshot = {
        config: { modes: {} } as never,
        capturedAt: '2026-01-11T00:00:00.000Z',
        source: 'test.config.js',
      };

      const result = await service.saveModeConfigSnapshot(snapshot);

      expect(result.success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(stateDir, STATE_FILES.MODE_CONFIG),
        expect.any(String),
        'utf-8',
      );
    });

    it('should create state directory if not exists', async () => {
      vi.mocked(existsSync).mockReturnValueOnce(false);
      vi.mocked(fs.writeFile).mockResolvedValue();

      await service.saveModeConfigSnapshot({
        config: {} as never,
        capturedAt: '2026-01-11T00:00:00.000Z',
      });

      expect(mkdirSync).toHaveBeenCalledWith(stateDir, { recursive: true });
    });

    it('should handle write errors gracefully', async () => {
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Write failed'));

      const result = await service.saveModeConfigSnapshot({
        config: {} as never,
        capturedAt: '2026-01-11T00:00:00.000Z',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Write failed');
    });
  });

  describe('loadModeConfigSnapshot', () => {
    it('should load mode config snapshot from file', async () => {
      const snapshot = {
        config: { modes: {} },
        capturedAt: '2026-01-11T00:00:00.000Z',
        source: 'test.config.js',
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(snapshot));

      const result = await service.loadModeConfigSnapshot();

      expect(result).not.toBeNull();
      expect(result?.capturedAt).toBe('2026-01-11T00:00:00.000Z');
      expect(result?.source).toBe('test.config.js');
    });

    it('should return null if file does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.loadModeConfigSnapshot();

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json');

      const result = await service.loadModeConfigSnapshot();

      expect(result).toBeNull();
    });
  });

  describe('getLastMode', () => {
    it('should return lastMode from loaded metadata', async () => {
      const savedDoc: StateDocument = {
        version: STATE_SCHEMA_VERSION,
        project: {
          projectRoot: mockProjectRoot,
          detectedAt: '2026-01-11T00:00:00.000Z',
          lastMode: 'EVAL',
        },
        updatedAt: '2026-01-11T00:00:00.000Z',
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(savedDoc));

      const result = await service.getLastMode();

      expect(result).toBe('EVAL');
    });

    it('should return null if no metadata exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.getLastMode();

      expect(result).toBeNull();
    });

    it('should return null if lastMode is not set', async () => {
      const savedDoc: StateDocument = {
        version: STATE_SCHEMA_VERSION,
        project: {
          projectRoot: mockProjectRoot,
          detectedAt: '2026-01-11T00:00:00.000Z',
        },
        updatedAt: '2026-01-11T00:00:00.000Z',
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(savedDoc));

      const result = await service.getLastMode();

      expect(result).toBeNull();
    });
  });

  describe('getLastSessionId', () => {
    it('should return lastSessionId from loaded metadata', async () => {
      const savedDoc: StateDocument = {
        version: STATE_SCHEMA_VERSION,
        project: {
          projectRoot: mockProjectRoot,
          detectedAt: '2026-01-11T00:00:00.000Z',
          lastSessionId: '2026-01-11-auth-feature',
        },
        updatedAt: '2026-01-11T00:00:00.000Z',
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(savedDoc));

      const result = await service.getLastSessionId();

      expect(result).toBe('2026-01-11-auth-feature');
    });

    it('should return null if no metadata exists', async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const result = await service.getLastSessionId();

      expect(result).toBeNull();
    });

    it('should return null if lastSessionId is not set', async () => {
      const savedDoc: StateDocument = {
        version: STATE_SCHEMA_VERSION,
        project: {
          projectRoot: mockProjectRoot,
          detectedAt: '2026-01-11T00:00:00.000Z',
        },
        updatedAt: '2026-01-11T00:00:00.000Z',
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(savedDoc));

      const result = await service.getLastSessionId();

      expect(result).toBeNull();
    });
  });
});
