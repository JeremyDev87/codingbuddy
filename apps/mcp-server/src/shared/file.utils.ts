import { promises as fs, type Dirent } from 'fs';

/**
 * Safely reads a file, returning null if the file doesn't exist.
 * Throws on permission errors or other issues.
 */
export async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Attempts to read a file, returning undefined on any error.
 * Use this for skip-on-error patterns where errors should be silently ignored.
 */
export async function tryReadFile(
  filePath: string,
): Promise<string | undefined> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return undefined;
  }
}

/**
 * Safely reads directory with file types, returning an empty array if the directory doesn't exist.
 * Throws on permission errors or other issues.
 */
export async function safeReadDirWithTypes(dirPath: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
