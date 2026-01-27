/**
 * Tests for SVG viewBox extraction utilities
 */

import { describe, it, expect } from 'vitest';
import {
  extractViewBox,
  parseViewBox,
  validateViewBox,
  extractSvgInnerContent,
  extractSvgDimensions,
  createViewBox,
} from '../../../../src/engine/sprite/viewbox-extractor.js';

describe('viewbox-extractor', () => {
  describe('extractViewBox', () => {
    it('should extract viewBox from SVG content', () => {
      const svg = '<svg viewBox="0 0 24 24"><path d="M12 2L2 7"/></svg>';
      const viewBox = extractViewBox(svg, 24, 24);

      expect(viewBox).toBe('0 0 24 24');
    });

    it('should handle double quotes', () => {
      const svg = '<svg viewBox="0 0 32 32"><circle/></svg>';
      const viewBox = extractViewBox(svg, 32, 32);

      expect(viewBox).toBe('0 0 32 32');
    });

    it('should handle single quotes', () => {
      const svg = "<svg viewBox='0 0 16 16'><rect/></svg>";
      const viewBox = extractViewBox(svg, 16, 16);

      expect(viewBox).toBe('0 0 16 16');
    });

    it('should be case insensitive', () => {
      const svg = '<svg VIEWBOX="0 0 24 24"><path/></svg>';
      const viewBox = extractViewBox(svg, 24, 24);

      expect(viewBox).toBe('0 0 24 24');
    });

    it('should handle extra whitespace', () => {
      const svg = '<svg viewBox="  0   0   24   24  "><path/></svg>';
      const viewBox = extractViewBox(svg, 24, 24);

      expect(viewBox).toBe('0   0   24   24');
    });

    it('should fall back to dimensions if viewBox not found', () => {
      const svg = '<svg width="24" height="24"><path/></svg>';
      const viewBox = extractViewBox(svg, 24, 24);

      expect(viewBox).toBe('0 0 24 24');
    });

    it('should handle non-zero viewBox origin', () => {
      const svg = '<svg viewBox="-12 -12 24 24"><path/></svg>';
      const viewBox = extractViewBox(svg, 24, 24);

      expect(viewBox).toBe('-12 -12 24 24');
    });

    it('should handle decimal values', () => {
      const svg = '<svg viewBox="0 0 24.5 24.5"><path/></svg>';
      const viewBox = extractViewBox(svg, 24.5, 24.5);

      expect(viewBox).toBe('0 0 24.5 24.5');
    });

    it('should round fallback dimensions', () => {
      const svg = '<svg><path/></svg>';
      const viewBox = extractViewBox(svg, 24.7, 24.3);

      expect(viewBox).toBe('0 0 25 24');
    });
  });

  describe('parseViewBox', () => {
    it('should parse valid viewBox string', () => {
      const parsed = parseViewBox('0 0 24 24');

      expect(parsed).toEqual({
        minX: 0,
        minY: 0,
        width: 24,
        height: 24,
      });
    });

    it('should handle negative origins', () => {
      const parsed = parseViewBox('-10 -10 20 20');

      expect(parsed).toEqual({
        minX: -10,
        minY: -10,
        width: 20,
        height: 20,
      });
    });

    it('should handle decimal values', () => {
      const parsed = parseViewBox('0 0 24.5 24.5');

      expect(parsed).toEqual({
        minX: 0,
        minY: 0,
        width: 24.5,
        height: 24.5,
      });
    });

    it('should handle extra whitespace', () => {
      const parsed = parseViewBox('  0   0   24   24  ');

      expect(parsed).toEqual({
        minX: 0,
        minY: 0,
        width: 24,
        height: 24,
      });
    });

    it('should throw on invalid format', () => {
      expect(() => parseViewBox('invalid')).toThrow('Invalid viewBox format');
      expect(() => parseViewBox('0 0 24')).toThrow('Invalid viewBox format');
      // Note: Extra values cause the 5th element to be NaN, triggering validation error
      expect(() => parseViewBox('0 0 24 24 extra')).toThrow('Invalid viewBox format');
    });

    it('should throw on non-numeric values', () => {
      expect(() => parseViewBox('0 0 abc def')).toThrow('Invalid viewBox format');
    });
  });

  describe('validateViewBox', () => {
    it('should validate correct viewBox', () => {
      expect(validateViewBox('0 0 24 24')).toBe(true);
      expect(validateViewBox('-10 -10 20 20')).toBe(true);
      expect(validateViewBox('0 0 24.5 24.5')).toBe(true);
    });

    it('should reject invalid viewBox', () => {
      expect(validateViewBox('invalid')).toBe(false);
      expect(validateViewBox('0 0 24')).toBe(false);
      expect(validateViewBox('0 0 abc def')).toBe(false);
      expect(validateViewBox('')).toBe(false);
    });
  });

  describe('extractSvgInnerContent', () => {
    it('should extract content between svg tags', () => {
      const svg = '<svg viewBox="0 0 24 24"><path d="M12 2L2 7"/><circle/></svg>';
      const inner = extractSvgInnerContent(svg);

      expect(inner).toBe('<path d="M12 2L2 7"/><circle/>');
    });

    it('should handle multiline SVG', () => {
      const svg = `<svg viewBox="0 0 24 24">
  <path d="M12 2L2 7"/>
  <circle cx="12" cy="12" r="10"/>
</svg>`;
      const inner = extractSvgInnerContent(svg);

      expect(inner).toContain('<path d="M12 2L2 7"/>');
      expect(inner).toContain('<circle cx="12" cy="12" r="10"/>');
    });

    it('should remove XML declaration', () => {
      const svg = '<?xml version="1.0"?><svg><path/></svg>';
      const inner = extractSvgInnerContent(svg);

      expect(inner).toBe('<path/>');
    });

    it('should handle case insensitive tags', () => {
      const svg = '<SVG><PATH d="M0 0"/></SVG>';
      const inner = extractSvgInnerContent(svg);

      expect(inner).toContain('PATH');
    });

    it('should handle empty SVG', () => {
      const svg = '<svg></svg>';
      const inner = extractSvgInnerContent(svg);

      // If no match, returns original content (self-closing behavior)
      expect(inner).toBe('<svg></svg>');
    });

    it('should handle SVG with attributes', () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0"/></svg>';
      const inner = extractSvgInnerContent(svg);

      expect(inner).toBe('<path d="M0 0"/>');
    });
  });

  describe('extractSvgDimensions', () => {
    it('should extract width and height', () => {
      const svg = '<svg width="24" height="24"><path/></svg>';
      const dimensions = extractSvgDimensions(svg);

      expect(dimensions).toEqual({ width: 24, height: 24 });
    });

    it('should handle decimal values', () => {
      const svg = '<svg width="24.5" height="32.7"><path/></svg>';
      const dimensions = extractSvgDimensions(svg);

      expect(dimensions).toEqual({ width: 24.5, height: 32.7 });
    });

    it('should handle quotes', () => {
      const svg1 = '<svg width="24" height="24"><path/></svg>';
      const svg2 = "<svg width='24' height='24'><path/></svg>";
      const svg3 = '<svg width=24 height=24><path/></svg>';

      expect(extractSvgDimensions(svg1)).toEqual({ width: 24, height: 24 });
      expect(extractSvgDimensions(svg2)).toEqual({ width: 24, height: 24 });
      expect(extractSvgDimensions(svg3)).toEqual({ width: 24, height: 24 });
    });

    it('should return null if dimensions not found', () => {
      const svg = '<svg viewBox="0 0 24 24"><path/></svg>';
      const dimensions = extractSvgDimensions(svg);

      expect(dimensions).toBeNull();
    });

    it('should return null if only one dimension present', () => {
      const svg1 = '<svg width="24"><path/></svg>';
      const svg2 = '<svg height="24"><path/></svg>';

      expect(extractSvgDimensions(svg1)).toBeNull();
      expect(extractSvgDimensions(svg2)).toBeNull();
    });
  });

  describe('createViewBox', () => {
    it('should use existing viewBox if present', () => {
      const svg = '<svg viewBox="0 0 24 24"><path/></svg>';
      const viewBox = createViewBox(svg, 32, 32);

      expect(viewBox).toBe('0 0 24 24');
    });

    it('should use width/height attributes if viewBox missing', () => {
      const svg = '<svg width="24" height="24"><path/></svg>';
      const viewBox = createViewBox(svg, 32, 32);

      expect(viewBox).toBe('0 0 24 24');
    });

    it('should fall back to defaults if neither present', () => {
      const svg = '<svg><path/></svg>';
      const viewBox = createViewBox(svg, 32, 32);

      expect(viewBox).toBe('0 0 32 32');
    });

    it('should prioritize viewBox over dimensions', () => {
      const svg = '<svg viewBox="0 0 16 16" width="24" height="24"><path/></svg>';
      const viewBox = createViewBox(svg, 32, 32);

      expect(viewBox).toBe('0 0 16 16');
    });

    it('should round dimension-based viewBox', () => {
      const svg = '<svg width="24.7" height="24.3"><path/></svg>';
      const viewBox = createViewBox(svg, 32, 32);

      expect(viewBox).toBe('0 0 25 24');
    });

    it('should round default viewBox', () => {
      const svg = '<svg><path/></svg>';
      const viewBox = createViewBox(svg, 24.7, 24.3);

      expect(viewBox).toBe('0 0 25 24');
    });
  });
});
