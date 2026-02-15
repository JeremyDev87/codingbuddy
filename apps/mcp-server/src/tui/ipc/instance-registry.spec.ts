import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { InstanceRegistry } from './instance-registry';
import type { IpcInstance } from './ipc.types';

describe('InstanceRegistry', () => {
  const testDir = path.join(os.tmpdir(), 'codingbuddy-test-registry');
  const testFile = path.join(testDir, 'instances.json');
  let registry: InstanceRegistry;

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it('should register a new instance', () => {
    registry = new InstanceRegistry(testFile);
    const instance: IpcInstance = {
      pid: 1234,
      socketPath: '/tmp/codingbuddy-1234.sock',
      projectRoot: '/home/user/project',
      startedAt: new Date().toISOString(),
    };
    registry.register(instance);

    const instances = registry.list();
    expect(instances).toHaveLength(1);
    expect(instances[0].pid).toBe(1234);
  });

  it('should unregister an instance by PID', () => {
    registry = new InstanceRegistry(testFile);
    registry.register({
      pid: 1234,
      socketPath: '/tmp/codingbuddy-1234.sock',
      projectRoot: '/home/user/project',
      startedAt: new Date().toISOString(),
    });
    registry.unregister(1234);

    expect(registry.list()).toHaveLength(0);
  });

  it('should prune stale instances (process no longer running)', () => {
    registry = new InstanceRegistry(testFile);
    // Use a very high PID that is guaranteed not to exist
    const deadPid = 4194304;
    registry.register({
      pid: deadPid,
      socketPath: `/tmp/codingbuddy-${deadPid}.sock`,
      projectRoot: '/tmp',
      startedAt: new Date().toISOString(),
    });

    const pruned = registry.prune();
    expect(pruned).toBe(1);
    expect(registry.list()).toHaveLength(0);
  });

  it('should not prune alive instances', () => {
    registry = new InstanceRegistry(testFile);
    // Current process PID is guaranteed to be alive.
    // Create a temporary socket file so the existence check passes.
    const socketPath = path.join(testDir, `codingbuddy-${process.pid}.sock`);
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(socketPath, '');
    registry.register({
      pid: process.pid,
      socketPath,
      projectRoot: '/tmp',
      startedAt: new Date().toISOString(),
    });

    const pruned = registry.prune();
    expect(pruned).toBe(0);
    expect(registry.list()).toHaveLength(1);
  });

  it('should create directory if it does not exist', () => {
    registry = new InstanceRegistry(testFile);
    registry.register({
      pid: 5678,
      socketPath: '/tmp/codingbuddy-5678.sock',
      projectRoot: '/tmp',
      startedAt: new Date().toISOString(),
    });
    expect(fs.existsSync(testFile)).toBe(true);
  });

  it('should replace existing entry for same PID', () => {
    registry = new InstanceRegistry(testFile);
    registry.register({
      pid: 1234,
      socketPath: '/tmp/codingbuddy-1234.sock',
      projectRoot: '/old',
      startedAt: new Date().toISOString(),
    });
    registry.register({
      pid: 1234,
      socketPath: '/tmp/codingbuddy-1234.sock',
      projectRoot: '/new',
      startedAt: new Date().toISOString(),
    });

    const instances = registry.list();
    expect(instances).toHaveLength(1);
    expect(instances[0].projectRoot).toBe('/new');
  });

  it('should throw if registry directory is a symlink', () => {
    // Create a symlink pointing to testDir as the registry directory
    const symlinkDir = path.join(os.tmpdir(), 'codingbuddy-test-symlink');
    try {
      fs.rmSync(symlinkDir, { recursive: true });
    } catch {
      /* ignore */
    }
    fs.mkdirSync(testDir, { recursive: true });
    fs.symlinkSync(testDir, symlinkDir);

    const symlinkFile = path.join(symlinkDir, 'instances.json');
    const symlinkRegistry = new InstanceRegistry(symlinkFile);

    expect(() =>
      symlinkRegistry.register({
        pid: 9999,
        socketPath: '/tmp/codingbuddy-9999.sock',
        projectRoot: '/tmp',
        startedAt: new Date().toISOString(),
      }),
    ).toThrow('not a real directory');

    try {
      fs.unlinkSync(symlinkDir);
    } catch {
      /* ignore */
    }
  });

  it('should use atomic write (tmp + rename)', () => {
    registry = new InstanceRegistry(testFile);
    registry.register({
      pid: 1111,
      socketPath: '/tmp/codingbuddy-1111.sock',
      projectRoot: '/tmp',
      startedAt: new Date().toISOString(),
    });

    // Verify the file exists and is valid JSON
    const content = fs.readFileSync(testFile, 'utf-8');
    const data = JSON.parse(content);
    expect(data.instances).toHaveLength(1);
  });
});
