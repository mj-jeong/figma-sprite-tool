/**
 * CLI Logger with colored output
 * Uses picocolors for terminal color support
 */

import pc from 'picocolors';

/**
 * Logger interface for CLI output
 */
export interface Logger {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
  log(message: string): void;
}

/**
 * Create a logger instance
 * @param verbose - Enable verbose logging
 * @returns Logger instance
 */
export function createLogger(verbose = false): Logger {
  return {
    info: (msg: string) => console.log(pc.blue('ℹ'), msg),
    success: (msg: string) => console.log(pc.green('✓'), msg),
    warn: (msg: string) => console.log(pc.yellow('⚠'), msg),
    error: (msg: string) => console.log(pc.red('✗'), msg),
    debug: (msg: string) => {
      if (verbose) {
        console.log(pc.gray('›'), msg);
      }
    },
    log: (msg: string) => console.log(msg),
  };
}

/**
 * Default logger instance
 */
export const logger = createLogger(false);

/**
 * Format file size for display
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "45.2 KB")
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Format duration for display
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "2.4s")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Format percentage for display
 * @param value - Percentage value (0-100)
 * @returns Formatted string (e.g., "95%")
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}
