import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPackageVersion, FALLBACK_VERSION } from './version.utils';
import * as fs from 'fs';

vi.mock('fs');

describe('getPackageVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('happy path', () => {
    it('should return version from package.json', () => {
      const mockPackageJson = JSON.stringify({
        name: 'codingbuddy',
        version: '2.2.1',
      });

      vi.mocked(fs.readFileSync).mockReturnValue(mockPackageJson);

      const version = getPackageVersion();

      expect(version).toBe('2.2.1');
    });

    it('should read from correct package.json path', () => {
      const mockPackageJson = JSON.stringify({ version: '1.0.0' });
      vi.mocked(fs.readFileSync).mockReturnValue(mockPackageJson);

      getPackageVersion();

      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        'utf-8',
      );
    });
  });

  describe('error handling', () => {
    it('should return fallback version when package.json read fails', () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      const version = getPackageVersion();

      expect(version).toBe(FALLBACK_VERSION);
    });

    it('should return fallback version when JSON is invalid', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('not valid json');

      const version = getPackageVersion();

      expect(version).toBe(FALLBACK_VERSION);
    });
  });

  describe('edge cases - missing or invalid version field', () => {
    it('should return fallback version when version field is missing', () => {
      const mockPackageJson = JSON.stringify({
        name: 'codingbuddy',
      });

      vi.mocked(fs.readFileSync).mockReturnValue(mockPackageJson);

      const version = getPackageVersion();

      expect(version).toBe(FALLBACK_VERSION);
    });

    it('should return fallback version when version is empty string', () => {
      const mockPackageJson = JSON.stringify({
        name: 'codingbuddy',
        version: '',
      });

      vi.mocked(fs.readFileSync).mockReturnValue(mockPackageJson);

      const version = getPackageVersion();

      expect(version).toBe(FALLBACK_VERSION);
    });

    it('should return fallback version when version is null', () => {
      const mockPackageJson = JSON.stringify({
        name: 'codingbuddy',
        version: null,
      });

      vi.mocked(fs.readFileSync).mockReturnValue(mockPackageJson);

      const version = getPackageVersion();

      expect(version).toBe(FALLBACK_VERSION);
    });

    it('should return fallback version when version is a number', () => {
      const mockPackageJson = JSON.stringify({
        name: 'codingbuddy',
        version: 123,
      });

      vi.mocked(fs.readFileSync).mockReturnValue(mockPackageJson);

      const version = getPackageVersion();

      expect(version).toBe(FALLBACK_VERSION);
    });

    it('should return fallback version when version is an object', () => {
      const mockPackageJson = JSON.stringify({
        name: 'codingbuddy',
        version: { major: 1, minor: 0 },
      });

      vi.mocked(fs.readFileSync).mockReturnValue(mockPackageJson);

      const version = getPackageVersion();

      expect(version).toBe(FALLBACK_VERSION);
    });
  });

  describe('FALLBACK_VERSION constant', () => {
    it('should export FALLBACK_VERSION as 0.0.0', () => {
      expect(FALLBACK_VERSION).toBe('0.0.0');
    });
  });
});
