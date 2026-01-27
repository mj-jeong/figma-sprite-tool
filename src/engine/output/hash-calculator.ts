/**
 * Content hash calculator using SHA-256
 * Used for change detection in sprite.json
 */

import { createHash } from 'node:crypto';

/**
 * Calculate SHA-256 hash of content
 *
 * Returns a short 8-character hash for compact representation.
 * SHA-256 provides sufficient collision resistance for our use case.
 *
 * @param content - Content to hash (Buffer or string)
 * @returns 8-character hexadecimal hash
 *
 * @example
 * ```typescript
 * const hash = calculateHash(buffer);
 * // => "a1b2c3d4"
 *
 * const hash = calculateHash("svg content");
 * // => "e5f6a7b8"
 * ```
 */
export function calculateHash(content: Buffer | string): string {
  return createHash('sha256')
    .update(content)
    .digest('hex')
    .slice(0, 8);
}

/**
 * Calculate hash for PNG buffer
 *
 * @param buffer - PNG image buffer
 * @returns 8-character hash
 */
export function calculatePngHash(buffer: Buffer): string {
  return calculateHash(buffer);
}

/**
 * Calculate hash for SVG content
 *
 * @param content - SVG content string
 * @returns 8-character hash
 */
export function calculateSvgHash(content: string): string {
  return calculateHash(content);
}

/**
 * Calculate hash for multiple contents
 * Useful for hashing combined sprite sheets
 *
 * @param contents - Array of contents to hash together
 * @returns 8-character hash of combined content
 */
export function calculateCombinedHash(contents: Array<Buffer | string>): string {
  const hash = createHash('sha256');
  for (const content of contents) {
    hash.update(content);
  }
  return hash.digest('hex').slice(0, 8);
}
