import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import type { IFileSystem } from './filesystem.interface';

/**
 * Node.js implementation of IFileSystem
 * Uses native fs module for file operations
 */
@Injectable()
export class NodeFileSystemService implements IFileSystem {
  async readFile(path: string, encoding: BufferEncoding): Promise<string> {
    return fs.readFile(path, encoding);
  }

  existsSync(path: string): boolean {
    return existsSync(path);
  }
}
