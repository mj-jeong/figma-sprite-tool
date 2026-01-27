/**
 * Tests for CLI progress tracker
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProgressTracker } from '../../../../src/cli/output/progress.js';

describe('Progress Tracker', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let clearLineSpy: ReturnType<typeof vi.spyOn> | undefined;
  let cursorToSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    // Mock clearLine and cursorTo only if they exist
    if (typeof process.stdout.clearLine === 'function') {
      clearLineSpy = vi.spyOn(process.stdout, 'clearLine').mockImplementation(() => true);
    }
    if (typeof process.stdout.cursorTo === 'function') {
      cursorToSpy = vi.spyOn(process.stdout, 'cursorTo').mockImplementation(() => true);
    }

    // Mock CI environment
    delete process.env.CI;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
    clearLineSpy?.mockRestore();
    cursorToSpy?.mockRestore();
  });

  describe('createProgressTracker', () => {
    it('should create progress tracker instance', () => {
      const progress = createProgressTracker();
      expect(progress).toBeDefined();
      expect(progress.start).toBeInstanceOf(Function);
      expect(progress.update).toBeInstanceOf(Function);
      expect(progress.succeed).toBeInstanceOf(Function);
      expect(progress.fail).toBeInstanceOf(Function);
      expect(progress.info).toBeInstanceOf(Function);
    });

    it('should start progress (CI mode)', () => {
      // In CI mode, should use console.log instead of stdout.write
      const progress = createProgressTracker();
      progress.start('Loading');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should update progress (CI mode)', () => {
      const progress = createProgressTracker();
      progress.start('Loading');
      progress.update('Processing');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should succeed progress', () => {
      const progress = createProgressTracker();
      progress.start('Loading');
      progress.succeed('Complete');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), 'Complete');
    });

    it('should fail progress', () => {
      const progress = createProgressTracker();
      progress.start('Loading');
      progress.fail('Failed');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), 'Failed');
    });

    it('should show info messages', () => {
      const progress = createProgressTracker();
      progress.info('Information');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String), 'Information');
    });
  });

  describe('CI environment', () => {
    beforeEach(() => {
      process.env.CI = 'true';
    });

    it('should use simple logging in CI', () => {
      const progress = createProgressTracker();
      progress.start('Loading');
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });
  });
});
