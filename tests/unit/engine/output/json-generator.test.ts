/**
 * JSON metadata generator unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateSpriteJson,
  generateTimestamp,
  validateJsonOptions,
  type JsonGenerationOptions,
} from '../../../../src/engine/output/json-generator.js';
import type { PackedIcon, SvgIconData } from '../../../../src/engine/types/sprite.js';

describe('json-generator', () => {
  describe('generateTimestamp', () => {
    beforeEach(() => {
      // Mock Date to return fixed time
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-26T17:30:00+09:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should generate ISO 8601 timestamp with timezone', () => {
      const timestamp = generateTimestamp();

      // Check format
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    });

    it('should include timezone offset', () => {
      const timestamp = generateTimestamp();

      // Should contain + or - followed by HH:MM
      expect(timestamp).toMatch(/[+-]\d{2}:\d{2}$/);
    });
  });

  describe('generateSpriteJson', () => {
    const mockPngIcon: PackedIcon = {
      id: 'ic-home-24-line',
      name: 'Home',
      nodeId: '123:456',
      variants: { size: 24, style: 'line', name: 'Home' },
      buffer: Buffer.from(''),
      width: 24,
      height: 24,
      x: 12,
      y: 8,
    };

    const mockSvgIcon: SvgIconData = {
      id: 'ic-home-24-line',
      content: '<path d="M0 0"/>',
      viewBox: '0 0 24 24',
      width: 24,
      height: 24,
    };

    it('should generate valid sprite.json with PNG data', () => {
      const options: JsonGenerationOptions = {
        fileKey: 'AbCdEf123456',
        page: 'Design System / Icons',
        png: { scale: 2, padding: 2 },
        pngSprite: {
          width: 1024,
          height: 512,
          hash: 'abc123',
          icons: [mockPngIcon],
        },
      };

      const json = generateSpriteJson(options);
      const parsed = JSON.parse(json);

      // Check meta
      expect(parsed.meta.fileKey).toBe('AbCdEf123456');
      expect(parsed.meta.page).toBe('Design System / Icons');
      expect(parsed.meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(parsed.meta.png).toEqual({ scale: 2, padding: 2 });

      // Check icons
      expect(parsed.icons['ic-home-24-line']).toBeDefined();
      expect(parsed.icons['ic-home-24-line'].nodeId).toBe('123:456');
      expect(parsed.icons['ic-home-24-line'].png).toEqual({
        x: 12,
        y: 8,
        w: 24,
        h: 24,
      });
      expect(parsed.icons['ic-home-24-line'].hash.png).toBe('abc123');
    });

    it('should generate valid sprite.json with SVG data', () => {
      const options: JsonGenerationOptions = {
        fileKey: 'AbCdEf123456',
        page: 'Design System / Icons',
        svg: { svgo: true },
        svgSprite: {
          hash: 'def456',
          icons: [mockSvgIcon],
        },
      };

      const json = generateSpriteJson(options);
      const parsed = JSON.parse(json);

      // Check SVG icon
      expect(parsed.icons['ic-home-24-line']).toBeDefined();
      expect(parsed.icons['ic-home-24-line'].svg).toEqual({
        symbolId: 'ic-home-24-line',
        viewBox: '0 0 24 24',
      });
      expect(parsed.icons['ic-home-24-line'].hash.svg).toBe('def456');
    });

    it('should combine PNG and SVG data', () => {
      const options: JsonGenerationOptions = {
        fileKey: 'AbCdEf123456',
        page: 'Design System / Icons',
        png: { scale: 2, padding: 2 },
        svg: { svgo: true },
        pngSprite: {
          width: 1024,
          height: 512,
          hash: 'abc123',
          icons: [mockPngIcon],
        },
        svgSprite: {
          hash: 'def456',
          icons: [mockSvgIcon],
        },
      };

      const json = generateSpriteJson(options);
      const parsed = JSON.parse(json);

      // Check combined icon
      const icon = parsed.icons['ic-home-24-line'];
      expect(icon.png).toBeDefined();
      expect(icon.svg).toBeDefined();
      expect(icon.hash.png).toBe('abc123');
      expect(icon.hash.svg).toBe('def456');
    });

    it('should sort icons alphabetically by ID', () => {
      const icons: PackedIcon[] = [
        { ...mockPngIcon, id: 'ic-zebra', x: 0, y: 0 },
        { ...mockPngIcon, id: 'ic-apple', x: 0, y: 0 },
        { ...mockPngIcon, id: 'ic-banana', x: 0, y: 0 },
      ];

      const options: JsonGenerationOptions = {
        fileKey: 'test',
        page: 'test',
        pngSprite: {
          width: 100,
          height: 100,
          hash: 'test',
          icons,
        },
      };

      const json = generateSpriteJson(options);
      const parsed = JSON.parse(json);
      const keys = Object.keys(parsed.icons);

      expect(keys).toEqual(['ic-apple', 'ic-banana', 'ic-zebra']);
    });

    it('should format with 2-space indent', () => {
      const options: JsonGenerationOptions = {
        fileKey: 'test',
        page: 'test',
        pngSprite: {
          width: 100,
          height: 100,
          hash: 'test',
          icons: [mockPngIcon],
        },
      };

      const json = generateSpriteJson(options);

      // Check indentation
      expect(json).toContain('  "meta"');
      expect(json).toContain('    "fileKey"');
    });

    it('should include failedAssets metadata when provided', () => {
      const options: JsonGenerationOptions = {
        fileKey: 'test',
        page: 'test',
        pngSprite: {
          width: 100,
          height: 100,
          hash: 'test',
          icons: [mockPngIcon],
        },
        failedAssets: [
          {
            format: 'svg',
            exportId: '70:71',
            iconIds: ['close-pop'],
            nodeIds: ['70:71'],
            reason: 'Failed to export node',
          },
        ],
      };

      const json = generateSpriteJson(options);
      const parsed = JSON.parse(json);

      expect(parsed.meta.failedAssets).toBeDefined();
      expect(parsed.meta.failedAssets.total).toBe(1);
      expect(parsed.meta.failedAssets.items).toHaveLength(1);
      expect(parsed.meta.failedAssets.items[0].exportId).toBe('70:71');
    });
  });

  describe('validateJsonOptions', () => {
    it('should pass for valid options', () => {
      const options: JsonGenerationOptions = {
        fileKey: 'test',
        page: 'test',
        pngSprite: {
          width: 100,
          height: 100,
          hash: 'test',
          icons: [],
        },
      };

      expect(() => validateJsonOptions(options)).not.toThrow();
    });

    it('should throw if fileKey is missing', () => {
      const options = {
        page: 'test',
        pngSprite: {},
      } as JsonGenerationOptions;

      expect(() => validateJsonOptions(options)).toThrow('fileKey is required');
    });

    it('should throw if page is missing', () => {
      const options = {
        fileKey: 'test',
        pngSprite: {},
      } as JsonGenerationOptions;

      expect(() => validateJsonOptions(options)).toThrow('page is required');
    });

    it('should throw if no sprite data', () => {
      const options = {
        fileKey: 'test',
        page: 'test',
      } as JsonGenerationOptions;

      expect(() => validateJsonOptions(options)).toThrow(
        'At least one sprite type (PNG or SVG) is required'
      );
    });
  });
});
