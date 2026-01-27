/**
 * CLI Output utilities
 * Exports logger, progress tracker, and error formatting
 */

export { createLogger, logger, formatSize, formatDuration, formatPercentage } from './logger.js';
export { createProgressTracker, progress } from './progress.js';
export {
  formatError,
  formatSpriteError,
  formatGenericError,
  handleError,
} from './error-formatter.js';
export type { Logger } from './logger.js';
export type { ProgressTracker } from './progress.js';
