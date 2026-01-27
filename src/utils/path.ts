/**
 * Path utilities with Windows compatibility
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Normalize path separators for cross-platform compatibility
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Resolve path relative to current working directory
 * Handles both relative and absolute paths
 */
export function resolvePath(filePath: string, cwd: string = process.cwd()): string {
  if (path.isAbsolute(filePath)) {
    return path.normalize(filePath);
  }
  return path.resolve(cwd, filePath);
}

/**
 * Join path segments with proper separators
 */
export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Get directory name from path
 */
export function getDirname(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Get base name from path
 */
export function getBasename(filePath: string, ext?: string): string {
  return path.basename(filePath, ext);
}

/**
 * Get file extension
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath);
}

/**
 * Convert file URL to path (for ESM)
 */
export function urlToPath(url: string | URL): string {
  return fileURLToPath(url);
}

/**
 * Check if path is absolute
 */
export function isAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

/**
 * Get relative path from one path to another
 */
export function getRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}

/**
 * Ensure path uses forward slashes (for output consistency)
 */
export function toUnixPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Ensure path uses platform-specific separators
 */
export function toPlatformPath(filePath: string): string {
  return filePath.split('/').join(path.sep);
}

/**
 * Parse path into components
 */
export function parsePath(filePath: string): path.ParsedPath {
  return path.parse(filePath);
}

/**
 * Format path from components
 */
export function formatPath(pathObject: path.FormatInputPathObject): string {
  return path.format(pathObject);
}
