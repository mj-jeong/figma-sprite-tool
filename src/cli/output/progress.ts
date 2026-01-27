/**
 * Progress tracking for CLI operations
 * Simple implementation without external spinner libraries
 */

import pc from 'picocolors';

/**
 * Progress tracker for CLI operations
 */
export interface ProgressTracker {
  start(message: string): void;
  update(message: string): void;
  succeed(message: string): void;
  fail(message: string): void;
  info(message: string): void;
}

/**
 * Check if running in CI environment (no TTY)
 */
function isCI(): boolean {
  return (
    process.env.CI === 'true' ||
    !process.stdout.isTTY ||
    process.env.TERM === 'dumb'
  );
}

/**
 * Create a progress tracker
 * In CI environments, uses simple logging without spinners
 * @returns ProgressTracker instance
 */
export function createProgressTracker(): ProgressTracker {
  const ci = isCI();
  let currentMessage = '';

  return {
    start: (message: string) => {
      currentMessage = message;
      if (ci) {
        console.log(pc.blue('⟳'), message);
      } else {
        process.stdout.write(`${pc.blue('⟳')} ${message}...`);
      }
    },

    update: (message: string) => {
      currentMessage = message;
      if (ci) {
        console.log(pc.blue('⟳'), message);
      } else {
        // Clear current line and write new message
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`${pc.blue('⟳')} ${message}...`);
      }
    },

    succeed: (message: string) => {
      if (ci) {
        console.log(pc.green('✓'), message);
      } else {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        console.log(pc.green('✓'), message);
      }
      currentMessage = '';
    },

    fail: (message: string) => {
      if (ci) {
        console.log(pc.red('✗'), message);
      } else {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        console.log(pc.red('✗'), message);
      }
      currentMessage = '';
    },

    info: (message: string) => {
      if (!ci && currentMessage) {
        // Clear progress line before info message
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
      }
      console.log(pc.cyan('ℹ'), message);
      if (!ci && currentMessage) {
        // Restore progress line
        process.stdout.write(`${pc.blue('⟳')} ${currentMessage}...`);
      }
    },
  };
}

/**
 * Default progress tracker instance
 */
export const progress = createProgressTracker();
