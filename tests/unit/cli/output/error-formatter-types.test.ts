/**
 * Error formatter type-safe context tests
 * Validates that formatSpriteError handles all context types correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SpriteError,
  ErrorCode,
  type OrphanedInstanceContext,
  type DuplicateInfo,
  type FileErrorContext,
  type DuplicateIconsContext,
  type OrphanedInstanceErrorContext,
} from '../../../../src/utils/errors.js';
import { formatSpriteError } from '../../../../src/cli/output/error-formatter.js';

describe('formatSpriteError with type-safe contexts', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should format OrphanedInstanceContext correctly', () => {
    const context: OrphanedInstanceContext = {
      instanceName: 'test-icon',
      instanceId: 'I123:456',
      missingComponentId: 'C789:012',
      suggestion: 'Check external components',
    };

    const error = new SpriteError(ErrorCode.FIGMA_EXPORT_FAILED, 'Export failed', context);

    expect(() => formatSpriteError(error)).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should format OrphanedInstanceErrorContext (wrapped) correctly', () => {
    const orphaned: OrphanedInstanceContext = {
      instanceName: 'test-icon',
      instanceId: 'I123:456',
      missingComponentId: 'C789:012',
      suggestion: 'Check external components',
    };

    const context: OrphanedInstanceErrorContext = {
      orphanedInstance: orphaned,
    };

    const error = new SpriteError(ErrorCode.FIGMA_EXPORT_FAILED, 'Export failed', context);

    expect(() => formatSpriteError(error)).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should format DuplicateInfo correctly', () => {
    const context: DuplicateInfo = {
      id: 'ic-home',
      names: ['Home Icon', 'Home'],
      nodeIds: ['123:456', '789:012'],
    };

    const error = new SpriteError(ErrorCode.DUPLICATE_ICON_ID, 'Duplicate icon ID', context);

    expect(() => formatSpriteError(error)).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should format DuplicateIconsContext (array) correctly', () => {
    const context: DuplicateIconsContext = {
      duplicates: [
        {
          id: 'ic-home',
          names: ['Home Icon', 'Home'],
          nodeIds: ['123:456', '789:012'],
        },
        {
          id: 'ic-search',
          names: ['Search Icon', 'Search'],
          nodeIds: ['234:567', '890:123'],
        },
      ],
    };

    const error = new SpriteError(ErrorCode.DUPLICATE_ICON_ID, 'Multiple duplicate icon IDs', context);

    expect(() => formatSpriteError(error)).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should format FileErrorContext correctly', () => {
    const context: FileErrorContext = {
      filePath: '/path/to/file.txt',
      error: 'ENOENT',
    };

    const error = new SpriteError(ErrorCode.WRITE_FAILED, 'File write failed', context);

    expect(() => formatSpriteError(error)).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should format empty context correctly', () => {
    const context: Record<string, never> = {};

    const error = new SpriteError(ErrorCode.FIGMA_NETWORK_ERROR, 'Network error', context);

    expect(() => formatSpriteError(error)).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should format error without context correctly', () => {
    const error = new SpriteError(ErrorCode.FIGMA_NETWORK_ERROR, 'Network error');

    expect(() => formatSpriteError(error)).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should format generic context with arrays correctly', () => {
    const context = {
      availablePages: ['Icons', 'Components', 'Styles'],
      suggestion: 'Check the page name',
    };

    const error = new SpriteError(ErrorCode.FIGMA_NODE_NOT_FOUND, 'Page not found', context);

    expect(() => formatSpriteError(error)).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should format generic context with nested objects correctly', () => {
    const context = {
      details: {
        url: 'https://api.figma.com',
        status: 404,
      },
      suggestion: 'Check the URL',
    };

    const error = new SpriteError(ErrorCode.FIGMA_NETWORK_ERROR, 'Request failed', context);

    expect(() => formatSpriteError(error)).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
