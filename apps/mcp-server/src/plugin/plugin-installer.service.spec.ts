import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const {
  mockExecSync,
  mockExistsSync,
  mockReadFileSync,
  mockWriteFileSync,
  mockMkdirSync,
  mockCpSync,
  mockRmSync,
  mockReaddirSync,
  mockMkdtempSync,
} = vi.hoisted(() => ({
  mockExecSync: vi.fn(),
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockCpSync: vi.fn(),
  mockRmSync: vi.fn(),
  mockReaddirSync: vi.fn(),
  mockMkdtempSync: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: mockExecSync,
}));

vi.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  cpSync: mockCpSync,
  rmSync: mockRmSync,
  readdirSync: mockReaddirSync,
  mkdtempSync: mockMkdtempSync,
}));

vi.mock('os', () => ({
  tmpdir: () => '/tmp',
}));

const mockFindByName = vi.fn();

vi.mock('./registry-client', () => ({
  RegistryClient: class {
    findByName = mockFindByName;
  },
}));

import { PluginInstallerService, InstallOptions } from './plugin-installer.service';

const TEMP_DIR = '/tmp/codingbuddy-plugin-abc123';

const validManifest = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'A test plugin',
  author: 'Test Author',
  compatibility: '>=5.0.0',
  provides: {
    agents: ['custom-agent-1'],
    rules: ['custom-rule-1'],
    skills: ['custom-skill-1'],
    checklists: [],
  },
};

function setupCloneSuccess(): void {
  mockMkdtempSync.mockReturnValue(TEMP_DIR);
  mockExecSync.mockImplementation(() => Buffer.from(''));

  mockExistsSync.mockImplementation((path: string) => {
    // plugin.json in temp dir
    if (path === `${TEMP_DIR}/plugin.json`) return true;
    // Source asset directories in temp
    if (path === `${TEMP_DIR}/agents`) return true;
    if (path === `${TEMP_DIR}/rules`) return true;
    if (path === `${TEMP_DIR}/skills`) return true;
    if (path === `${TEMP_DIR}/checklists`) return false;
    // plugins.json doesn't exist yet
    if (path.includes('plugins.json')) return false;
    // .codingbuddy dir exists
    if (path.endsWith('.codingbuddy')) return true;
    // No conflict — target asset files don't exist
    return false;
  });

  mockReadFileSync.mockImplementation((path: string) => {
    if (path.includes('plugin.json')) return JSON.stringify(validManifest);
    return '';
  });

  mockReaddirSync.mockImplementation((path: string) => {
    if (path === `${TEMP_DIR}/agents`) return ['custom-agent-1.json'];
    if (path === `${TEMP_DIR}/rules`) return ['custom-rule-1.md'];
    if (path === `${TEMP_DIR}/skills`) return ['custom-skill-1.md'];
    return [];
  });
}

describe('PluginInstallerService', () => {
  let service: PluginInstallerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PluginInstallerService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveGitUrl', () => {
    it('should convert github:user/repo shorthand to HTTPS URL', () => {
      const result = service.resolveGitUrl('github:user/repo');
      expect(result).toBe('https://github.com/user/repo.git');
    });

    it('should pass through full HTTPS URLs', () => {
      const result = service.resolveGitUrl('https://github.com/user/repo');
      expect(result).toBe('https://github.com/user/repo');
    });

    it('should pass through HTTPS URLs with .git suffix', () => {
      const result = service.resolveGitUrl('https://github.com/user/repo.git');
      expect(result).toBe('https://github.com/user/repo.git');
    });

    it('should throw on invalid URL format', () => {
      expect(() => service.resolveGitUrl('not-a-url')).toThrow('Invalid git URL');
    });
  });

  describe('resolveSource', () => {
    it('should pass through github: URLs', async () => {
      const result = await service.resolveSource('github:user/repo');
      expect(result).toEqual({ source: 'github:user/repo' });
      expect(mockFindByName).not.toHaveBeenCalled();
    });

    it('should pass through https:// URLs', async () => {
      const result = await service.resolveSource('https://github.com/user/repo');
      expect(result).toEqual({ source: 'https://github.com/user/repo' });
      expect(mockFindByName).not.toHaveBeenCalled();
    });

    it('should resolve plugin name via registry', async () => {
      mockFindByName.mockResolvedValue({
        name: 'nextjs-app-router',
        version: '1.0.0',
        source: 'github:codingbuddy-plugins/nextjs-app-router',
        description: 'Next.js plugin',
        tags: [],
        provides: {},
      });

      const result = await service.resolveSource('nextjs-app-router');

      expect(mockFindByName).toHaveBeenCalledWith('nextjs-app-router');
      expect(result).toEqual({ source: 'github:codingbuddy-plugins/nextjs-app-router' });
    });

    it('should parse name@version and return version', async () => {
      mockFindByName.mockResolvedValue({
        name: 'nextjs-app-router',
        version: '2.0.0',
        source: 'github:codingbuddy-plugins/nextjs-app-router',
        description: 'Next.js plugin',
        tags: [],
        provides: {},
      });

      const result = await service.resolveSource('nextjs-app-router@1.0.0');

      expect(mockFindByName).toHaveBeenCalledWith('nextjs-app-router');
      expect(result).toEqual({
        source: 'github:codingbuddy-plugins/nextjs-app-router',
        version: '1.0.0',
      });
    });

    it('should throw error when name not found in registry', async () => {
      mockFindByName.mockResolvedValue(undefined);

      await expect(service.resolveSource('nonexistent-plugin')).rejects.toThrow(
        /not found in registry/,
      );
    });
  });

  describe('install', () => {
    const defaultOptions: InstallOptions = {
      source: 'github:user/repo',
      targetRoot: '/project',
      force: false,
    };

    it('should install from github:user/repo shorthand', async () => {
      setupCloneSuccess();

      const result = await service.install(defaultOptions);

      expect(result.success).toBe(true);
      expect(result.pluginName).toBe('my-plugin');
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('git clone --depth=1'),
        expect.any(Object),
      );
    });

    it('should install from full HTTPS URL', async () => {
      setupCloneSuccess();

      const result = await service.install({
        ...defaultOptions,
        source: 'https://github.com/user/repo',
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/user/repo'),
        expect.any(Object),
      );
    });

    it('should reject invalid manifest', async () => {
      mockMkdtempSync.mockReturnValue(TEMP_DIR);
      mockExecSync.mockImplementation(() => Buffer.from(''));
      mockExistsSync.mockImplementation((path: string) => {
        if (path === `${TEMP_DIR}/plugin.json`) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify({ name: '' }));

      const result = await service.install(defaultOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid plugin manifest');
    });

    it('should reject when plugin.json is missing', async () => {
      mockMkdtempSync.mockReturnValue(TEMP_DIR);
      mockExecSync.mockImplementation(() => Buffer.from(''));
      mockExistsSync.mockReturnValue(false);

      const result = await service.install(defaultOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('plugin.json not found');
    });

    it('should reject incompatible version', async () => {
      const incompatibleManifest = {
        ...validManifest,
        compatibility: '>=99.0.0',
      };
      mockMkdtempSync.mockReturnValue(TEMP_DIR);
      mockExecSync.mockImplementation(() => Buffer.from(''));
      mockExistsSync.mockImplementation((path: string) => {
        if (path === `${TEMP_DIR}/plugin.json`) return true;
        return false;
      });
      mockReadFileSync.mockReturnValue(JSON.stringify(incompatibleManifest));

      const result = await service.install(defaultOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('incompatible');
    });

    it('should detect and refuse on name conflict', async () => {
      mockMkdtempSync.mockReturnValue(TEMP_DIR);
      mockExecSync.mockImplementation(() => Buffer.from(''));
      mockExistsSync.mockImplementation((path: string) => {
        if (path === `${TEMP_DIR}/plugin.json`) return true;
        // Existing agent file at target — conflict
        if (path === '/project/.ai-rules/agents/custom-agent-1.json') return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('plugin.json')) return JSON.stringify(validManifest);
        return '';
      });

      const result = await service.install(defaultOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('conflict');
    });

    it('should overwrite on conflict when --force is set', async () => {
      mockMkdtempSync.mockReturnValue(TEMP_DIR);
      mockExecSync.mockImplementation(() => Buffer.from(''));
      mockExistsSync.mockImplementation((path: string) => {
        if (path === `${TEMP_DIR}/plugin.json`) return true;
        if (path === '/project/.ai-rules/agents/custom-agent-1.json') return true;
        if (path.includes('plugins.json')) return false;
        if (path.endsWith('.codingbuddy')) return true;
        // Source dirs
        if (path === `${TEMP_DIR}/agents`) return true;
        if (path === `${TEMP_DIR}/rules`) return true;
        if (path === `${TEMP_DIR}/skills`) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('plugin.json')) return JSON.stringify(validManifest);
        return '';
      });
      mockReaddirSync.mockImplementation((path: string) => {
        if (path === `${TEMP_DIR}/agents`) return ['custom-agent-1.json'];
        if (path === `${TEMP_DIR}/rules`) return ['custom-rule-1.md'];
        if (path === `${TEMP_DIR}/skills`) return ['custom-skill-1.md'];
        return [];
      });

      const result = await service.install({ ...defaultOptions, force: true });

      expect(result.success).toBe(true);
    });

    it('should update plugins.json after install', async () => {
      setupCloneSuccess();

      await service.install(defaultOptions);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('plugins.json'),
        expect.stringContaining('"my-plugin"'),
        'utf-8',
      );
    });

    it('should include correct counts in result summary', async () => {
      setupCloneSuccess();

      const result = await service.install(defaultOptions);

      expect(result.summary).toContain('my-plugin@1.0.0');
      expect(result.summary).toContain('1 agents');
      expect(result.summary).toContain('1 rules');
      expect(result.summary).toContain('1 skills');
    });

    it('should clean up temp directory on success', async () => {
      setupCloneSuccess();

      await service.install(defaultOptions);

      expect(mockRmSync).toHaveBeenCalledWith(
        TEMP_DIR,
        expect.objectContaining({ recursive: true }),
      );
    });

    it('should clean up temp directory on failure', async () => {
      mockMkdtempSync.mockReturnValue(TEMP_DIR);
      mockExecSync.mockImplementation(() => Buffer.from(''));
      mockExistsSync.mockReturnValue(false);

      await service.install(defaultOptions);

      expect(mockRmSync).toHaveBeenCalledWith(
        TEMP_DIR,
        expect.objectContaining({ recursive: true }),
      );
    });

    it('should clone specific version tag when version is provided', async () => {
      setupCloneSuccess();

      const result = await service.install({
        ...defaultOptions,
        version: '1.0.0',
      });

      expect(result.success).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('--branch v1.0.0'),
        expect.any(Object),
      );
    });

    it('should handle git clone failure gracefully', async () => {
      mockMkdtempSync.mockReturnValue(TEMP_DIR);
      mockExecSync.mockImplementation(() => {
        throw new Error('fatal: repository not found');
      });

      const result = await service.install(defaultOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('clone');
    });

    it('should append to existing plugins.json', async () => {
      const existingPlugins = {
        plugins: [
          {
            name: 'existing-plugin',
            version: '2.0.0',
            source: 'github:other/repo',
            installedAt: '2026-01-01T00:00:00Z',
            provides: { agents: [], rules: [], skills: [], checklists: [] },
          },
        ],
      };

      mockMkdtempSync.mockReturnValue(TEMP_DIR);
      mockExecSync.mockImplementation(() => Buffer.from(''));
      mockExistsSync.mockImplementation((path: string) => {
        if (path === `${TEMP_DIR}/plugin.json`) return true;
        if (path.includes('plugins.json')) return true;
        if (path.endsWith('.codingbuddy')) return true;
        if (path === `${TEMP_DIR}/agents`) return true;
        if (path === `${TEMP_DIR}/rules`) return true;
        if (path === `${TEMP_DIR}/skills`) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path: string) => {
        if (path.includes('plugin.json') && path.includes(TEMP_DIR))
          return JSON.stringify(validManifest);
        if (path.includes('plugins.json')) return JSON.stringify(existingPlugins);
        return '';
      });
      mockReaddirSync.mockImplementation((path: string) => {
        if (path === `${TEMP_DIR}/agents`) return ['custom-agent-1.json'];
        if (path === `${TEMP_DIR}/rules`) return ['custom-rule-1.md'];
        if (path === `${TEMP_DIR}/skills`) return ['custom-skill-1.md'];
        return [];
      });

      await service.install(defaultOptions);

      const writeCall = mockWriteFileSync.mock.calls.find(
        (call: unknown[]) =>
          typeof call[0] === 'string' && (call[0] as string).includes('plugins.json'),
      );
      expect(writeCall).toBeDefined();
      const written = JSON.parse(writeCall![1] as string);
      expect(written.plugins).toHaveLength(2);
      expect(written.plugins[0].name).toBe('existing-plugin');
      expect(written.plugins[1].name).toBe('my-plugin');
    });
  });
});
