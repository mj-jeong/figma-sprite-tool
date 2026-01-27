/**
 * Tests for error formatting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatError, formatSpriteError, formatGenericError } from '../../../../src/cli/output/error-formatter.js';
import { SpriteError, ErrorCode } from '../../../../src/utils/errors.js';

describe('Error Formatter', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('formatSpriteError', () => {
    it('should format sprite error with message', () => {
      const error = new SpriteError(ErrorCode.CONFIG_NOT_FOUND, 'Config not found');
      formatSpriteError(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const calls = consoleErrorSpy.mock.calls.flat();
      expect(calls.some((c) => String(c).includes('Config not found'))).toBe(true);
    });

    it('should format sprite error with context', () => {
      const error = new SpriteError(ErrorCode.DUPLICATE_ICON_ID, 'Duplicate ID', {
        iconId: 'ic-home-24',
        nodeIds: ['123:456', '789:101'],
      });

      formatSpriteError(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const calls = consoleErrorSpy.mock.calls.flat();
      expect(calls.some((c) => String(c).includes('Context'))).toBe(true);
    });

    it('should display error code', () => {
      const error = new SpriteError(ErrorCode.FIGMA_AUTH_FAILED, 'Auth failed');
      formatSpriteError(error);

      const calls = consoleErrorSpy.mock.calls.flat();
      expect(calls.some((c) => String(c).includes('E201'))).toBe(true);
    });
  });

  describe('formatGenericError', () => {
    it('should format generic error', () => {
      const error = new Error('Something went wrong');
      formatGenericError(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const calls = consoleErrorSpy.mock.calls.flat();
      expect(calls.some((c) => String(c).includes('Something went wrong'))).toBe(true);
    });

    it('should include stack trace', () => {
      const error = new Error('Test error');
      Error.captureStackTrace(error);
      formatGenericError(error);

      const calls = consoleErrorSpy.mock.calls.flat();
      expect(calls.some((c) => String(c).includes('Stack trace'))).toBe(true);
    });
  });

  describe('formatError', () => {
    it('should detect and format SpriteError', () => {
      const error = new SpriteError(ErrorCode.CONFIG_INVALID, 'Invalid config');
      formatError(error);

      const calls = consoleErrorSpy.mock.calls.flat();
      expect(calls.some((c) => String(c).includes('Invalid config'))).toBe(true);
      expect(calls.some((c) => String(c).includes('E102'))).toBe(true);
    });

    it('should detect and format generic Error', () => {
      const error = new Error('Generic error');
      formatError(error);

      const calls = consoleErrorSpy.mock.calls.flat();
      expect(calls.some((c) => String(c).includes('Generic error'))).toBe(true);
    });

    it('should handle unknown error types', () => {
      formatError('String error');

      const calls = consoleErrorSpy.mock.calls.flat();
      expect(calls.some((c) => String(c).includes('unknown error'))).toBe(true);
    });
  });
});
