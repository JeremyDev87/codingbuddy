/**
 * TaskMaestro Detector Tests
 *
 * Tests for isTaskmaestroAvailable() including:
 * - Returns true when skill file exists
 * - Returns false when skill file is absent
 * - Handles filesystem errors gracefully
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import { isTaskmaestroAvailable } from './taskmaestro-detector';

vi.mock('fs');
vi.mock('os');

describe('isTaskmaestroAvailable', () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue('/home/testuser');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true when SKILL.md exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    expect(isTaskmaestroAvailable()).toBe(true);
  });

  it('should return false when SKILL.md does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    expect(isTaskmaestroAvailable()).toBe(false);
  });

  it('should check the correct path: ~/.claude/skills/taskmaestro/SKILL.md', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    isTaskmaestroAvailable();

    expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('/home/testuser'));
    expect(fs.existsSync).toHaveBeenCalledWith(
      expect.stringMatching(/\.claude.*skills.*taskmaestro.*SKILL\.md$/),
    );
  });

  it('should return false when fs.existsSync throws an error', () => {
    vi.mocked(fs.existsSync).mockImplementation(() => {
      throw new Error('EACCES: permission denied');
    });

    expect(isTaskmaestroAvailable()).toBe(false);
  });

  it('should return false when fs.existsSync throws a non-Error', () => {
    vi.mocked(fs.existsSync).mockImplementation(() => {
      throw 'unexpected string error';
    });

    expect(isTaskmaestroAvailable()).toBe(false);
  });

  it('should use os.homedir() for path resolution', () => {
    vi.mocked(os.homedir).mockReturnValue('/custom/home');
    vi.mocked(fs.existsSync).mockReturnValue(true);

    isTaskmaestroAvailable();

    expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('/custom/home'));
  });

  it('should call existsSync exactly once per invocation', () => {
    vi.mocked(fs.existsSync).mockClear();
    vi.mocked(fs.existsSync).mockReturnValue(false);

    isTaskmaestroAvailable();

    expect(fs.existsSync).toHaveBeenCalledTimes(1);
  });
});
