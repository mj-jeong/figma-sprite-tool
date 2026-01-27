/**
 * File system utilities with Windows compatibility and error handling
 */

import fs from 'node:fs/promises';
import fssync, { type Stats } from 'node:fs';
import { dirname } from 'node:path';
import { resolvePath } from './path.js';
import { ErrorCode, createOutputError } from './errors.js';

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if file exists synchronously
 */
export function fileExistsSync(filePath: string): boolean {
  try {
    fssync.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file as string
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw createOutputError(ErrorCode.WRITE_FAILED, `Failed to read file: ${filePath}`, {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Read file as buffer
 */
export async function readFileBuffer(filePath: string): Promise<Buffer> {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    throw createOutputError(ErrorCode.WRITE_FAILED, `Failed to read file: ${filePath}`, {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Write file with automatic directory creation
 */
export async function writeFile(filePath: string, content: string | Buffer): Promise<void> {
  try {
    const dir = dirname(filePath);
    await ensureDir(dir);
    await fs.writeFile(filePath, content, typeof content === 'string' ? 'utf-8' : undefined);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw createOutputError(ErrorCode.PERMISSION_DENIED, `Permission denied writing to: ${filePath}`, {
        filePath,
      });
    }
    throw createOutputError(ErrorCode.WRITE_FAILED, `Failed to write file: ${filePath}`, {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Ensure directory exists, create if not
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw createOutputError(ErrorCode.PERMISSION_DENIED, `Permission denied creating directory: ${dirPath}`, {
        dirPath,
      });
    }
    throw createOutputError(ErrorCode.WRITE_FAILED, `Failed to create directory: ${dirPath}`, {
      dirPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Read directory contents
 */
export async function readDir(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch (error) {
    throw createOutputError(ErrorCode.WRITE_FAILED, `Failed to read directory: ${dirPath}`, {
      dirPath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Delete file if exists
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw createOutputError(ErrorCode.WRITE_FAILED, `Failed to delete file: ${filePath}`, {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Get file stats
 */
export async function getFileStats(filePath: string): Promise<Stats> {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    throw createOutputError(ErrorCode.WRITE_FAILED, `Failed to get file stats: ${filePath}`, {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Check if path is a directory
 */
export async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Find file in directory or parent directories
 */
export async function findFileUp(fileName: string, startDir: string = process.cwd()): Promise<string | null> {
  let currentDir = resolvePath(startDir);
  const root = dirname(currentDir);

  while (currentDir !== root) {
    const filePath = resolvePath(fileName, currentDir);
    if (await fileExists(filePath)) {
      return filePath;
    }
    currentDir = dirname(currentDir);
  }

  // Check root directory
  const rootFilePath = resolvePath(fileName, root);
  if (await fileExists(rootFilePath)) {
    return rootFilePath;
  }

  return null;
}

/**
 * Copy file
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  try {
    const dir = dirname(dest);
    await ensureDir(dir);
    await fs.copyFile(src, dest);
  } catch (error) {
    throw createOutputError(ErrorCode.WRITE_FAILED, `Failed to copy file from ${src} to ${dest}`, {
      src,
      dest,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
