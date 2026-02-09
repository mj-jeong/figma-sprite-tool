/**
 * Type-safe error context tests
 * Validates that all error contexts are properly typed
 */

import { describe, it, expect } from 'vitest';
import {
  SpriteError,
  ErrorCode,
  type OrphanedInstanceContext,
  type DuplicateInfo,
  type FileErrorContext,
  type DirectoryErrorContext,
  type FileCopyErrorContext,
  type FigmaExportErrorContext,
  type ImageDownloadErrorContext,
  type NetworkErrorContext,
  type PageNotFoundContext,
  type EmptyIconSetContext,
  type AllExportsFailedContext,
  type ConfigNotFoundContext,
  type ConfigValidationContext,
  type GenericErrorContext,
  type DuplicateIconsContext,
  type OrphanedInstanceErrorContext,
} from '../../../src/utils/errors.js';

describe('Type-safe error contexts', () => {
  describe('OrphanedInstanceContext', () => {
    it('should create error with OrphanedInstanceContext', () => {
      const context: OrphanedInstanceContext = {
        instanceName: 'test-icon',
        instanceId: 'I123:456',
        missingComponentId: 'C789:012',
        suggestion: 'Check external components',
      };

      const error = new SpriteError(ErrorCode.FIGMA_EXPORT_FAILED, 'Export failed', context);

      expect(error.code).toBe(ErrorCode.FIGMA_EXPORT_FAILED);
      expect(error.context).toEqual(context);
    });

    it('should create error with OrphanedInstanceErrorContext (wrapped)', () => {
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

      expect(error.code).toBe(ErrorCode.FIGMA_EXPORT_FAILED);
      expect(error.context).toEqual(context);
    });
  });

  describe('DuplicateInfo', () => {
    it('should create error with DuplicateInfo', () => {
      const context: DuplicateInfo = {
        id: 'ic-home',
        names: ['Home Icon', 'Home'],
        nodeIds: ['123:456', '789:012'],
      };

      const error = new SpriteError(ErrorCode.DUPLICATE_ICON_ID, 'Duplicate icon ID', context);

      expect(error.code).toBe(ErrorCode.DUPLICATE_ICON_ID);
      expect(error.context).toEqual(context);
    });

    it('should create error with DuplicateIconsContext (array)', () => {
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

      expect(error.code).toBe(ErrorCode.DUPLICATE_ICON_ID);
      expect(error.context).toEqual(context);
    });
  });

  describe('FileErrorContext', () => {
    it('should create error with FileErrorContext', () => {
      const context: FileErrorContext = {
        filePath: '/path/to/file.txt',
        error: 'ENOENT',
      };

      const error = new SpriteError(ErrorCode.WRITE_FAILED, 'File write failed', context);

      expect(error.code).toBe(ErrorCode.WRITE_FAILED);
      expect(error.context).toEqual(context);
    });

    it('should create error with FileErrorContext without error field', () => {
      const context: FileErrorContext = {
        filePath: '/path/to/file.txt',
      };

      const error = new SpriteError(ErrorCode.PERMISSION_DENIED, 'Permission denied', context);

      expect(error.code).toBe(ErrorCode.PERMISSION_DENIED);
      expect(error.context).toEqual(context);
    });
  });

  describe('DirectoryErrorContext', () => {
    it('should create error with DirectoryErrorContext', () => {
      const context: DirectoryErrorContext = {
        dirPath: '/path/to/dir',
        error: 'EACCES',
      };

      const error = new SpriteError(ErrorCode.WRITE_FAILED, 'Directory creation failed', context);

      expect(error.code).toBe(ErrorCode.WRITE_FAILED);
      expect(error.context).toEqual(context);
    });
  });

  describe('FileCopyErrorContext', () => {
    it('should create error with FileCopyErrorContext', () => {
      const context: FileCopyErrorContext = {
        src: '/path/to/src.txt',
        dest: '/path/to/dest.txt',
        error: 'ENOENT',
      };

      const error = new SpriteError(ErrorCode.WRITE_FAILED, 'File copy failed', context);

      expect(error.code).toBe(ErrorCode.WRITE_FAILED);
      expect(error.context).toEqual(context);
    });
  });

  describe('FigmaExportErrorContext', () => {
    it('should create error with FigmaExportErrorContext', () => {
      const context: FigmaExportErrorContext = {
        fileKey: 'AbCdEf123456',
        nodeIds: ['123:456', '789:012'],
        format: 'png',
        error: 'Export failed',
      };

      const error = new SpriteError(ErrorCode.FIGMA_EXPORT_FAILED, 'Figma export failed', context);

      expect(error.code).toBe(ErrorCode.FIGMA_EXPORT_FAILED);
      expect(error.context).toEqual(context);
    });

    it('should create error with failedNodes', () => {
      const context: FigmaExportErrorContext = {
        fileKey: 'AbCdEf123456',
        failedNodes: ['123:456', '789:012'],
        format: 'svg',
      };

      const error = new SpriteError(ErrorCode.FIGMA_EXPORT_FAILED, 'Some nodes failed', context);

      expect(error.code).toBe(ErrorCode.FIGMA_EXPORT_FAILED);
      expect(error.context).toEqual(context);
    });
  });

  describe('ImageDownloadErrorContext', () => {
    it('should create error with ImageDownloadErrorContext', () => {
      const context: ImageDownloadErrorContext = {
        url: 'https://example.com/image.png',
        status: 404,
      };

      const error = new SpriteError(ErrorCode.FIGMA_EXPORT_FAILED, 'Image download failed', context);

      expect(error.code).toBe(ErrorCode.FIGMA_EXPORT_FAILED);
      expect(error.context).toEqual(context);
    });
  });

  describe('NetworkErrorContext', () => {
    it('should create error with NetworkErrorContext (timeout)', () => {
      const context: NetworkErrorContext = {
        url: 'https://api.figma.com',
        timeout: 30000,
      };

      const error = new SpriteError(ErrorCode.FIGMA_NETWORK_ERROR, 'Request timed out', context);

      expect(error.code).toBe(ErrorCode.FIGMA_NETWORK_ERROR);
      expect(error.context).toEqual(context);
    });

    it('should create error with NetworkErrorContext (error)', () => {
      const context: NetworkErrorContext = {
        url: 'https://api.figma.com',
        originalError: 'Network error',
      };

      const error = new SpriteError(ErrorCode.FIGMA_NETWORK_ERROR, 'Network error', context);

      expect(error.code).toBe(ErrorCode.FIGMA_NETWORK_ERROR);
      expect(error.context).toEqual(context);
    });
  });

  describe('PageNotFoundContext', () => {
    it('should create error with PageNotFoundContext', () => {
      const context: PageNotFoundContext = {
        availablePages: ['Icons', 'Components', 'Styles'],
        suggestion: 'Check the page name in your config',
      };

      const error = new SpriteError(ErrorCode.FIGMA_NODE_NOT_FOUND, 'Page not found', context);

      expect(error.code).toBe(ErrorCode.FIGMA_NODE_NOT_FOUND);
      expect(error.context).toEqual(context);
    });
  });

  describe('EmptyIconSetContext', () => {
    it('should create error with EmptyIconSetContext', () => {
      const context: EmptyIconSetContext = {
        page: 'Icons',
        scopeType: 'prefix',
        scopeValue: 'ic-',
        suggestion: 'Check that icons exist in the page',
      };

      const error = new SpriteError(ErrorCode.EMPTY_ICON_SET, 'No icons found', context);

      expect(error.code).toBe(ErrorCode.EMPTY_ICON_SET);
      expect(error.context).toEqual(context);
    });
  });

  describe('AllExportsFailedContext', () => {
    it('should create error with AllExportsFailedContext', () => {
      const context: AllExportsFailedContext = {
        total: 10,
        errors: ['Error 1', 'Error 2', 'Error 3'],
      };

      const error = new SpriteError(ErrorCode.FIGMA_EXPORT_FAILED, 'All exports failed', context);

      expect(error.code).toBe(ErrorCode.FIGMA_EXPORT_FAILED);
      expect(error.context).toEqual(context);
    });
  });

  describe('ConfigNotFoundContext', () => {
    it('should create error with searchedPaths', () => {
      const context: ConfigNotFoundContext = {
        searchedPaths: ['figma.sprite.config.json', '.figma-sprite.json'],
        cwd: '/home/user/project',
      };

      const error = new SpriteError(ErrorCode.CONFIG_NOT_FOUND, 'Config not found', context);

      expect(error.code).toBe(ErrorCode.CONFIG_NOT_FOUND);
      expect(error.context).toEqual(context);
    });

    it('should create error with configPath', () => {
      const context: ConfigNotFoundContext = {
        configPath: '/path/to/config.json',
      };

      const error = new SpriteError(ErrorCode.CONFIG_NOT_FOUND, 'Config file not found', context);

      expect(error.code).toBe(ErrorCode.CONFIG_NOT_FOUND);
      expect(error.context).toEqual(context);
    });
  });

  describe('ConfigValidationContext', () => {
    it('should create error with ConfigValidationContext', () => {
      const context: ConfigValidationContext = {
        configPath: '/path/to/config.json',
        error: 'Invalid JSON',
      };

      const error = new SpriteError(ErrorCode.CONFIG_INVALID, 'Config validation failed', context);

      expect(error.code).toBe(ErrorCode.CONFIG_INVALID);
      expect(error.context).toEqual(context);
    });

    it('should create error with validationErrors', () => {
      const context: ConfigValidationContext = {
        validationErrors: ['Missing figma.fileKey', 'Invalid formats.png.scale'],
      };

      const error = new SpriteError(ErrorCode.CONFIG_INVALID, 'Validation failed', context);

      expect(error.code).toBe(ErrorCode.CONFIG_INVALID);
      expect(error.context).toEqual(context);
    });
  });

  describe('GenericErrorContext', () => {
    it('should create error with GenericErrorContext', () => {
      const context: GenericErrorContext = {
        suggestion: 'Set FIGMA_TOKEN environment variable',
        docs: 'https://www.figma.com/developers/api#access-tokens',
      };

      const error = new SpriteError(ErrorCode.FIGMA_AUTH_FAILED, 'Authentication failed', context);

      expect(error.code).toBe(ErrorCode.FIGMA_AUTH_FAILED);
      expect(error.context).toEqual(context);
    });

    it('should create error with retryAfter', () => {
      const context: GenericErrorContext = {
        retryAfter: '60',
        suggestion: 'Wait before retrying',
      };

      const error = new SpriteError(ErrorCode.FIGMA_RATE_LIMITED, 'Rate limited', context);

      expect(error.code).toBe(ErrorCode.FIGMA_RATE_LIMITED);
      expect(error.context).toEqual(context);
    });
  });

  describe('Empty context', () => {
    it('should create error with empty context', () => {
      const context: Record<string, never> = {};

      const error = new SpriteError(ErrorCode.FIGMA_NETWORK_ERROR, 'Network error', context);

      expect(error.code).toBe(ErrorCode.FIGMA_NETWORK_ERROR);
      expect(error.context).toEqual(context);
    });

    it('should create error without context', () => {
      const error = new SpriteError(ErrorCode.FIGMA_NETWORK_ERROR, 'Network error');

      expect(error.code).toBe(ErrorCode.FIGMA_NETWORK_ERROR);
      expect(error.context).toBeUndefined();
    });
  });
});
