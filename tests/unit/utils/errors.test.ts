/**
 * Tests for error handling utilities
 */

import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  SpriteError,
  createConfigError,
  createFigmaError,
  createValidationError,
  createProcessingError,
  createOutputError,
} from '../../../src/utils/errors.js';

describe('SpriteError', () => {
  it('should create error with code and message', () => {
    const error = new SpriteError(ErrorCode.CONFIG_NOT_FOUND, 'Config file not found');

    expect(error.code).toBe(ErrorCode.CONFIG_NOT_FOUND);
    expect(error.message).toContain('[E101]');
    expect(error.message).toContain('Config file not found');
    expect(error.name).toBe('SpriteError');
  });

  it('should include context in error', () => {
    const error = new SpriteError(ErrorCode.CONFIG_INVALID, 'Invalid config', {
      field: 'figma.fileKey',
      value: '',
    });

    expect(error.context).toEqual({
      field: 'figma.fileKey',
      value: '',
    });
  });

  it('should set recoverable flag', () => {
    const recoverable = new SpriteError(ErrorCode.FIGMA_RATE_LIMITED, 'Rate limited', {}, true);
    const nonRecoverable = new SpriteError(ErrorCode.CONFIG_INVALID, 'Invalid', {}, false);

    expect(recoverable.recoverable).toBe(true);
    expect(nonRecoverable.recoverable).toBe(false);
  });

  it('should generate user-friendly message for config errors', () => {
    const error = new SpriteError(ErrorCode.CONFIG_NOT_FOUND, 'Config not found');
    const message = error.toUserMessage();

    expect(message).toContain('E101');
    expect(message).toContain('Config not found');
    expect(message).toContain('Suggested actions');
    expect(message).toContain('figma.sprite.config.json');
  });

  it('should generate user-friendly message for Figma auth errors', () => {
    const error = new SpriteError(ErrorCode.FIGMA_AUTH_FAILED, 'Authentication failed');
    const message = error.toUserMessage();

    expect(message).toContain('FIGMA_TOKEN');
    expect(message).toContain('environment variable');
  });

  it('should format context information', () => {
    const error = new SpriteError(
      ErrorCode.DUPLICATE_ICON_ID,
      'Duplicate ID',
      {
        duplicateId: 'ic-home-24',
        locations: ['Page A', 'Page B'],
      },
    );
    const message = error.toUserMessage();

    expect(message).toContain('duplicate id');
    expect(message).toContain('ic-home-24');
    expect(message).toContain('Page A, Page B');
  });
});

describe('Error factory functions', () => {
  it('should create config error', () => {
    const error = createConfigError(ErrorCode.CONFIG_NOT_FOUND, 'Not found');

    expect(error.code).toBe(ErrorCode.CONFIG_NOT_FOUND);
    expect(error.recoverable).toBe(false);
  });

  it('should create Figma error with recovery flag', () => {
    const recoverable = createFigmaError(ErrorCode.FIGMA_RATE_LIMITED, 'Rate limited');
    const nonRecoverable = createFigmaError(ErrorCode.FIGMA_AUTH_FAILED, 'Auth failed');

    expect(recoverable.recoverable).toBe(true);
    expect(nonRecoverable.recoverable).toBe(false);
  });

  it('should create validation error', () => {
    const error = createValidationError(ErrorCode.DUPLICATE_ICON_ID, 'Duplicate');

    expect(error.code).toBe(ErrorCode.DUPLICATE_ICON_ID);
    expect(error.recoverable).toBe(false);
  });

  it('should create processing error', () => {
    const error = createProcessingError(ErrorCode.IMAGE_PROCESSING_FAILED, 'Failed');

    expect(error.code).toBe(ErrorCode.IMAGE_PROCESSING_FAILED);
    expect(error.recoverable).toBe(false);
  });

  it('should create output error', () => {
    const error = createOutputError(ErrorCode.WRITE_FAILED, 'Write failed');

    expect(error.code).toBe(ErrorCode.WRITE_FAILED);
    expect(error.recoverable).toBe(false);
  });
});

describe('Error code organization', () => {
  it('should have config errors in 1xx range', () => {
    expect(ErrorCode.CONFIG_NOT_FOUND).toMatch(/^E10\d$/);
    expect(ErrorCode.CONFIG_INVALID).toMatch(/^E10\d$/);
  });

  it('should have Figma errors in 2xx range', () => {
    expect(ErrorCode.FIGMA_AUTH_FAILED).toMatch(/^E20\d$/);
    expect(ErrorCode.FIGMA_FILE_NOT_FOUND).toMatch(/^E20\d$/);
  });

  it('should have validation errors in 3xx range', () => {
    expect(ErrorCode.DUPLICATE_ICON_ID).toMatch(/^E30\d$/);
    expect(ErrorCode.INVALID_ICON_ID).toMatch(/^E30\d$/);
  });

  it('should have processing errors in 4xx range', () => {
    expect(ErrorCode.IMAGE_PROCESSING_FAILED).toMatch(/^E40\d$/);
    expect(ErrorCode.PACKING_FAILED).toMatch(/^E40\d$/);
  });

  it('should have output errors in 5xx range', () => {
    expect(ErrorCode.WRITE_FAILED).toMatch(/^E50\d$/);
    expect(ErrorCode.PERMISSION_DENIED).toMatch(/^E50\d$/);
  });
});
