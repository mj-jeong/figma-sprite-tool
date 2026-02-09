/**
 * Tests for Figma image exporter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportPngImages, exportSvgImages, exportImages } from '../../../../src/engine/figma/exporter.js';
import { FigmaClient } from '../../../../src/engine/figma/client.js';
import type { ParsedIconNode } from '../../../../src/engine/types/figma.js';
import type { SpriteConfig } from '../../../../src/engine/types/config.js';
import { createMockPngBuffer, createMockSvg } from '../../../fixtures/figma/mock-helpers.js';
import { SpriteError } from '../../../../src/utils/errors.js';

// Mock FigmaClient
vi.mock('../../../../src/engine/figma/client.js', () => ({
  FigmaClient: vi.fn(),
}));

describe('Figma exporter', () => {
  let mockClient: any;
  let mockIconNodes: ParsedIconNode[];
  let mockIconMetadata: Map<string, ParsedIconNode>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock icon nodes
    mockIconNodes = [
      {
        nodeId: '10:1',
        exportId: '10:1', // COMPONENT nodes use nodeId as exportId
        name: 'ic/home-24-line',
        type: 'COMPONENT',
        bounds: { x: 0, y: 0, width: 24, height: 24 },
        visible: true,
      },
      {
        nodeId: '10:2',
        exportId: '10:2', // COMPONENT nodes use nodeId as exportId
        name: 'ic/search-24-line',
        type: 'COMPONENT',
        bounds: { x: 30, y: 0, width: 24, height: 24 },
        visible: true,
      },
    ];

    // Create metadata map
    mockIconMetadata = new Map([
      ['home-24-line', mockIconNodes[0]],
      ['search-24-line', mockIconNodes[1]],
    ]);

    // Setup mock client
    mockClient = {
      exportImages: vi.fn(),
      downloadImage: vi.fn(),
    };
  });

  describe('exportPngImages', () => {
    it('should export PNG images successfully', async () => {
      // Mock export response
      mockClient.exportImages.mockResolvedValue({
        err: null,
        images: {
          '10:1': 'https://example.com/home.png',
          '10:2': 'https://example.com/search.png',
        },
      });

      // Mock image downloads
      mockClient.downloadImage.mockResolvedValue(createMockPngBuffer());

      const result = await exportPngImages(
        mockClient,
        'test-file',
        mockIconNodes,
        mockIconMetadata,
        2,
      );

      expect(result.items).toHaveLength(2);
      expect(result.failures).toHaveLength(0);
      expect(result.stats.successful).toBe(2);
      expect(result.stats.failed).toBe(0);

      // Verify export was called with correct parameters
      expect(mockClient.exportImages).toHaveBeenCalledWith(
        'test-file',
        expect.objectContaining({
          ids: expect.arrayContaining(['10:1', '10:2']),
          format: 'png',
          scale: 2,
          use_absolute_bounds: true,
        }),
      );

      // Verify downloads were called
      expect(mockClient.downloadImage).toHaveBeenCalledTimes(2);
    });

    it('should handle partial export failures gracefully', async () => {
      // Mock export with one null URL
      mockClient.exportImages.mockResolvedValue({
        err: null,
        images: {
          '10:1': 'https://example.com/home.png',
          '10:2': null, // Failed
        },
      });

      mockClient.downloadImage.mockResolvedValue(createMockPngBuffer());

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await exportPngImages(
        mockClient,
        'test-file',
        mockIconNodes,
        mockIconMetadata,
        2,
      );

      expect(result.items).toHaveLength(1); // Only successful one
      expect(result.failures.length).toBeGreaterThanOrEqual(1);
      expect(result.stats.successful).toBe(1);
      expect(result.stats.failed).toBe(1);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle download errors gracefully', async () => {
      mockClient.exportImages.mockResolvedValue({
        err: null,
        images: {
          '10:1': 'https://example.com/home.png',
          '10:2': 'https://example.com/search.png',
        },
      });

      // First download succeeds, second fails
      mockClient.downloadImage
        .mockResolvedValueOnce(createMockPngBuffer())
        .mockRejectedValueOnce(new Error('Download failed'));

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await exportPngImages(
        mockClient,
        'test-file',
        mockIconNodes,
        mockIconMetadata,
        2,
      );

      expect(result.items).toHaveLength(1);
      expect(result.failures.length).toBeGreaterThanOrEqual(1);
      expect(result.stats.successful).toBe(1);
      expect(result.stats.failed).toBe(1);

      consoleWarnSpy.mockRestore();
    });

    it('should throw error if all exports fail', async () => {
      mockClient.exportImages.mockRejectedValue(new Error('Export failed'));

      await expect(
        exportPngImages(mockClient, 'test-file', mockIconNodes, mockIconMetadata, 2),
      ).rejects.toThrow(SpriteError);
    });

    it('should respect batch size for large icon sets', async () => {
      // Create large icon set
      const largeIconSet: ParsedIconNode[] = Array.from({ length: 150 }, (_, i) => ({
        nodeId: `10:${i}`,
        exportId: `10:${i}`, // COMPONENT nodes use nodeId as exportId
        name: `ic/icon-${i}-24-line`,
        type: 'COMPONENT' as const,
        bounds: { x: 0, y: 0, width: 24, height: 24 },
        visible: true,
      }));

      const largeMetadata = new Map(
        largeIconSet.map((node) => [`icon-${node.nodeId.split(':')[1]}-24-line`, node]),
      );

      mockClient.exportImages.mockResolvedValue({
        err: null,
        images: Object.fromEntries(
          largeIconSet.map((node) => [node.nodeId, `https://example.com/${node.nodeId}.png`]),
        ),
      });

      mockClient.downloadImage.mockResolvedValue(createMockPngBuffer());

      await exportPngImages(mockClient, 'test-file', largeIconSet, largeMetadata, 2, {
        batchSize: 50,
      });

      // Should have made 3 batch requests (150 / 50 = 3)
      expect(mockClient.exportImages).toHaveBeenCalledTimes(3);
    });

    it('should include icon data with correct structure', async () => {
      mockClient.exportImages.mockResolvedValue({
        err: null,
        images: {
          '10:1': 'https://example.com/home.png',
        },
      });

      mockClient.downloadImage.mockResolvedValue(createMockPngBuffer());

      const result = await exportPngImages(
        mockClient,
        'test-file',
        [mockIconNodes[0]],
        new Map([['home-24-line', mockIconNodes[0]]]),
        2,
      );

      const iconData = result.items[0];
      expect(iconData).toMatchObject({
        id: 'home-24-line',
        name: 'ic/home-24-line',
        nodeId: '10:1',
        width: 24,
        height: 24,
      });
      expect(iconData.buffer).toBeInstanceOf(Buffer);
    });

    it('should fallback to per-id exports when batch export fails', async () => {
      mockClient.exportImages
        // Initial batch request fails
        .mockRejectedValueOnce(new Error('Failed to export 2 node(s)'))
        // Per-id fallback: first succeeds
        .mockResolvedValueOnce({
          err: null,
          images: {
            '10:1': 'https://example.com/home.png',
          },
        })
        // Per-id fallback: second fails
        .mockRejectedValueOnce(new Error('Failed to export 1 node(s)'));

      mockClient.downloadImage.mockResolvedValue(createMockPngBuffer());
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await exportPngImages(
        mockClient,
        'test-file',
        mockIconNodes,
        mockIconMetadata,
        2,
      );

      expect(result.items).toHaveLength(1);
      expect(result.failures.length).toBeGreaterThanOrEqual(1);
      expect(result.stats.successful).toBe(1);
      expect(result.stats.failed).toBeGreaterThanOrEqual(1);
      expect(mockClient.exportImages).toHaveBeenCalledTimes(3);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('exportSvgImages', () => {
    it('should export SVG images successfully', async () => {
      mockClient.exportImages.mockResolvedValue({
        err: null,
        images: {
          '10:1': 'https://example.com/home.svg',
          '10:2': 'https://example.com/search.svg',
        },
      });

      const mockSvg = createMockSvg(24, 24, 'home');
      mockClient.downloadImage.mockResolvedValue(Buffer.from(mockSvg));

      const result = await exportSvgImages(
        mockClient,
        'test-file',
        mockIconNodes,
        mockIconMetadata,
      );

      expect(result.items).toHaveLength(2);
      expect(result.failures).toHaveLength(0);
      expect(result.stats.successful).toBe(2);
      expect(result.stats.failed).toBe(0);

      // Verify export was called with SVG options
      expect(mockClient.exportImages).toHaveBeenCalledWith(
        'test-file',
        expect.objectContaining({
          format: 'svg',
          svg_include_id: true,
          svg_simplify_stroke: true,
        }),
      );
    });

    it('should extract viewBox from SVG content', async () => {
      mockClient.exportImages.mockResolvedValue({
        err: null,
        images: {
          '10:1': 'https://example.com/home.svg',
        },
      });

      const svgWithViewBox = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
      mockClient.downloadImage.mockResolvedValue(Buffer.from(svgWithViewBox));

      const result = await exportSvgImages(
        mockClient,
        'test-file',
        [mockIconNodes[0]],
        new Map([['home-24-line', mockIconNodes[0]]]),
      );

      expect(result.items[0].viewBox).toBe('0 0 24 24');
    });

    it('should fallback to dimensions if viewBox not found', async () => {
      mockClient.exportImages.mockResolvedValue({
        err: null,
        images: {
          '10:1': 'https://example.com/home.svg',
        },
      });

      const svgWithoutViewBox = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
      mockClient.downloadImage.mockResolvedValue(Buffer.from(svgWithoutViewBox));

      const result = await exportSvgImages(
        mockClient,
        'test-file',
        [mockIconNodes[0]],
        new Map([['home-24-line', mockIconNodes[0]]]),
      );

      // Should create viewBox from bounds
      expect(result.items[0].viewBox).toBe('0 0 24 24');
    });

    it('should fallback to per-id exports when SVG batch export fails', async () => {
      mockClient.exportImages
        // Initial batch request fails
        .mockRejectedValueOnce(new Error('Failed to export 2 node(s)'))
        // Per-id fallback: first succeeds
        .mockResolvedValueOnce({
          err: null,
          images: {
            '10:1': 'https://example.com/home.svg',
          },
        })
        // Per-id fallback: second fails
        .mockRejectedValueOnce(new Error('Failed to export 1 node(s)'));

      mockClient.downloadImage.mockResolvedValue(Buffer.from(createMockSvg(24, 24, 'home')));
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await exportSvgImages(
        mockClient,
        'test-file',
        mockIconNodes,
        mockIconMetadata,
      );

      expect(result.items).toHaveLength(1);
      expect(result.failures.length).toBeGreaterThanOrEqual(1);
      expect(result.stats.successful).toBe(1);
      expect(result.stats.failed).toBeGreaterThanOrEqual(1);
      expect(mockClient.exportImages).toHaveBeenCalledTimes(3);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('exportImages (combined)', () => {
    const mockConfig: SpriteConfig = {
      figma: {
        fileKey: 'test-file',
        page: 'Design System / Icons',
        scope: { type: 'prefix', value: 'ic/' },
        personalAccessToken: undefined,
      },
      output: { dir: './assets', name: 'sprite' },
      formats: {
        png: { enabled: true, scale: 2, padding: 2 },
        svg: { enabled: true, svgo: true },
      },
      naming: {
        idFormat: '{name}-{size}-{style}',
        sanitize: true,
      },
    };

    it('should export both PNG and SVG when both enabled', async () => {
      mockClient.exportImages.mockResolvedValue({
        err: null,
        images: {
          '10:1': 'https://example.com/icon',
        },
      });

      mockClient.downloadImage
        .mockResolvedValueOnce(createMockPngBuffer())
        .mockResolvedValueOnce(Buffer.from(createMockSvg()));

      const result = await exportImages(
        mockClient,
        'test-file',
        [mockIconNodes[0]],
        new Map([['home-24-line', mockIconNodes[0]]]),
        mockConfig,
      );

      expect(result.png).toBeDefined();
      expect(result.svg).toBeDefined();
      expect(result.png!.items).toHaveLength(1);
      expect(result.svg!.items).toHaveLength(1);
    });

    it('should export only PNG when SVG disabled', async () => {
      const pngOnlyConfig = {
        ...mockConfig,
        formats: {
          ...mockConfig.formats,
          svg: { enabled: false, svgo: false },
        },
      };

      mockClient.exportImages.mockResolvedValue({
        err: null,
        images: { '10:1': 'https://example.com/icon.png' },
      });

      mockClient.downloadImage.mockResolvedValue(createMockPngBuffer());

      const result = await exportImages(
        mockClient,
        'test-file',
        [mockIconNodes[0]],
        new Map([['home-24-line', mockIconNodes[0]]]),
        pngOnlyConfig,
      );

      expect(result.png).toBeDefined();
      expect(result.svg).toBeUndefined();
    });

    it('should export only SVG when PNG disabled', async () => {
      const svgOnlyConfig = {
        ...mockConfig,
        formats: {
          png: { enabled: false, scale: 2, padding: 2 },
          svg: { enabled: true, svgo: true },
        },
      };

      mockClient.exportImages.mockResolvedValue({
        err: null,
        images: { '10:1': 'https://example.com/icon.svg' },
      });

      mockClient.downloadImage.mockResolvedValue(Buffer.from(createMockSvg()));

      const result = await exportImages(
        mockClient,
        'test-file',
        [mockIconNodes[0]],
        new Map([['home-24-line', mockIconNodes[0]]]),
        svgOnlyConfig,
      );

      expect(result.png).toBeUndefined();
      expect(result.svg).toBeDefined();
    });
  });
});
