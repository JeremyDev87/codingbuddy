/**
 * File system interface for dependency injection
 * Allows mocking file system operations in tests
 */
export interface IFileSystem {
  /**
   * Read file contents as string
   * @param path - Path to the file to read
   * @param encoding - Character encoding for the file
   * @returns File contents as string
   */
  readFile(path: string, encoding: BufferEncoding): Promise<string>;

  /**
   * Check if a file or directory exists (sync)
   * @param path - Path to check
   * @returns true if the path exists
   */
  existsSync(path: string): boolean;
}

/**
 * Token for FileSystem dependency injection
 */
export const FILE_SYSTEM = 'FILE_SYSTEM';

/**
 * Path validation error thrown when path validation fails
 */
export class PathValidationError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly basePath?: string,
  ) {
    super(message);
    this.name = 'PathValidationError';
  }
}

/**
 * Options for path validation
 */
export interface PathValidationOptions {
  /** Base directory that paths must be contained within */
  basePath: string;
  /** Whether to allow absolute paths (default: false) */
  allowAbsolute?: boolean;
  /** File extensions to allow (if specified, only these extensions are allowed) */
  allowedExtensions?: string[];
}
