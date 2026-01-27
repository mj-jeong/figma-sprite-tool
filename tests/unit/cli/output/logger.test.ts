/**
 * Tests for CLI logger
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, formatSize, formatDuration, formatPercentage } from '../../../../src/cli/output/logger.js';

describe('CLI Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('createLogger', () => {
    it('should create logger instance', () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(logger.info).toBeInstanceOf(Function);
      expect(logger.success).toBeInstanceOf(Function);
      expect(logger.warn).toBeInstanceOf(Function);
      expect(logger.error).toBeInstanceOf(Function);
      expect(logger.debug).toBeInstanceOf(Function);
      expect(logger.log).toBeInstanceOf(Function);
    });

    it('should log info messages', () => {
      const logger = createLogger();
      logger.info('Test message');
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), 'Test message');
    });

    it('should log success messages', () => {
      const logger = createLogger();
      logger.success('Success message');
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), 'Success message');
    });

    it('should log warning messages', () => {
      const logger = createLogger();
      logger.warn('Warning message');
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), 'Warning message');
    });

    it('should log error messages', () => {
      const logger = createLogger();
      logger.error('Error message');
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), 'Error message');
    });

    it('should not log debug messages by default', () => {
      const logger = createLogger(false);
      logger.debug('Debug message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log debug messages in verbose mode', () => {
      const logger = createLogger(true);
      logger.debug('Debug message');
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), 'Debug message');
    });
  });

  describe('formatSize', () => {
    it('should format bytes', () => {
      expect(formatSize(0)).toBe('0 B');
      expect(formatSize(100)).toBe('100.0 B');
      expect(formatSize(512)).toBe('512.0 B');
    });

    it('should format kilobytes', () => {
      expect(formatSize(1024)).toBe('1.0 KB');
      expect(formatSize(1536)).toBe('1.5 KB');
      expect(formatSize(10240)).toBe('10.0 KB');
    });

    it('should format megabytes', () => {
      expect(formatSize(1048576)).toBe('1.0 MB');
      expect(formatSize(1572864)).toBe('1.5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatSize(1073741824)).toBe('1.0 GB');
      expect(formatSize(2147483648)).toBe('2.0 GB');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(0)).toBe('0ms');
      expect(formatDuration(100)).toBe('100ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1.0s');
      expect(formatDuration(1500)).toBe('1.5s');
      expect(formatDuration(10000)).toBe('10.0s');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages', () => {
      expect(formatPercentage(0)).toBe('0%');
      expect(formatPercentage(50)).toBe('50%');
      expect(formatPercentage(100)).toBe('100%');
    });

    it('should round percentages', () => {
      expect(formatPercentage(45.6)).toBe('46%');
      expect(formatPercentage(45.4)).toBe('45%');
      expect(formatPercentage(99.9)).toBe('100%');
    });
  });
});
