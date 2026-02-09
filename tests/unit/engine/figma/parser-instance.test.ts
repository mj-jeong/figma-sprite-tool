import { describe, it, expect, vi } from 'vitest';
import { parseIconNodes } from '../../../../src/engine/figma/parser.js';
import type { FigmaFileResponse } from '../../../../src/engine/types/figma.js';
import type { SpriteConfig } from '../../../../src/engine/types/config.js';

describe('Parser - INSTANCE node handling', () => {
  const mockConfig: SpriteConfig = {
    figma: {
      fileKey: 'test-file-key',
      page: 'Icons',
      scope: {
        type: 'prefix',
        value: 'ic/',
      },
    },
    naming: {
      idFormat: '{name}-{size}-{style}',
      sanitize: true,
    },
    formats: {
      png: { enabled: true, scale: 2 },
      svg: { enabled: true },
    },
    output: {
      dir: './output',
      sprite: { name: 'sprite' },
      scss: { name: 'sprite.scss' },
      json: { name: 'sprite.json' },
    },
  };

  it('should skip INSTANCE nodes without componentId', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mockFile: FigmaFileResponse = {
      name: 'Test File',
      lastModified: '2024-01-01T00:00:00Z',
      thumbnailUrl: 'https://example.com/thumb.png',
      version: '1.0',
      schemaVersion: 0,
      components: {},
      styles: {},
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [
          {
            id: '1:0',
            name: 'Icons',
            type: 'CANVAS',
            children: [
              {
                id: '2:0',
                name: 'ic/orphaned-instance',
                type: 'INSTANCE',
                // Missing componentId!
                absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 },
                visible: true,
                children: [],
              },
            ],
          },
        ],
      },
    };

    // When all nodes are skipped, parseIconNodes throws EMPTY_ICON_SET error
    expect(() => parseIconNodes(mockFile, mockConfig)).toThrow('No icons found matching filter criteria');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('has no componentId - skipping')
    );

    consoleSpy.mockRestore();
  });

  it('should warn about missing component references', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mockFile: FigmaFileResponse = {
      name: 'Test File',
      lastModified: '2024-01-01T00:00:00Z',
      thumbnailUrl: 'https://example.com/thumb.png',
      version: '1.0',
      schemaVersion: 0,
      components: {}, // Component not in this file!
      styles: {},
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [
          {
            id: '1:0',
            name: 'Icons',
            type: 'CANVAS',
            children: [
              {
                id: '2:0',
                name: 'ic/external-instance',
                type: 'INSTANCE',
                componentId: 'external-component-id',
                absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 },
                visible: true,
                children: [],
              },
            ],
          },
        ],
      },
    };

    const result = parseIconNodes(mockFile, mockConfig);

    expect(result).toHaveLength(1); // Node is included but warned
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('references missing component')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('external library component')
    );

    consoleSpy.mockRestore();
  });

  it('should process valid INSTANCE nodes normally', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mockFile: FigmaFileResponse = {
      name: 'Test File',
      lastModified: '2024-01-01T00:00:00Z',
      thumbnailUrl: 'https://example.com/thumb.png',
      version: '1.0',
      schemaVersion: 0,
      components: {
        'comp-123': {
          key: 'comp-123',
          name: 'Icon Component',
          description: '',
        },
      },
      styles: {},
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [
          {
            id: '1:0',
            name: 'Icons',
            type: 'CANVAS',
            children: [
              {
                id: '2:0',
                name: 'ic/valid-instance',
                type: 'INSTANCE',
                componentId: 'comp-123',
                absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 },
                visible: true,
                children: [],
              },
            ],
          },
        ],
      },
    };

    const result = parseIconNodes(mockFile, mockConfig);

    expect(result).toHaveLength(1);
    expect(result[0].exportId).toBe('comp-123');
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
