/**
 * Tests for SVG symbol sprite generation
 */

import { describe, it, expect } from 'vitest';
import {
  generateSvgSprite,
  generateSvgSpritePreview,
  createSvgIconData,
  batchCreateSvgIconData,
  validateSvgIcons,
} from '../../../../src/engine/sprite/svg-generator.js';
import { createTestSvg } from '../../../fixtures/sprite/create-test-icons.js';
import type { SvgIconData } from '../../../../src/engine/types/sprite.js';

describe('svg-generator', () => {
  describe('createSvgIconData', () => {
    it('should create SVG icon data from buffer', () => {
      const svgContent = createTestSvg('ic-home-24', 24, 'circle');
      const buffer = Buffer.from(svgContent, 'utf-8');

      const iconData = createSvgIconData('ic-home-24', buffer, 24, 24);

      expect(iconData.id).toBe('ic-home-24');
      expect(iconData.content).toBe(svgContent);
      expect(iconData.viewBox).toBe('0 0 24 24');
      expect(iconData.width).toBe(24);
      expect(iconData.height).toBe(24);
    });

    it('should extract existing viewBox', () => {
      const svgContent = '<svg viewBox="0 0 32 32"><circle/></svg>';
      const buffer = Buffer.from(svgContent, 'utf-8');

      const iconData = createSvgIconData('ic-test-32', buffer, 32, 32);

      expect(iconData.viewBox).toBe('0 0 32 32');
    });

    it('should create fallback viewBox if missing', () => {
      const svgContent = '<svg><circle/></svg>';
      const buffer = Buffer.from(svgContent, 'utf-8');

      const iconData = createSvgIconData('ic-test-24', buffer, 24, 24);

      expect(iconData.viewBox).toBe('0 0 24 24');
    });
  });

  describe('batchCreateSvgIconData', () => {
    it('should create multiple SVG icon data', () => {
      const icons = [
        {
          id: 'ic-home-24',
          buffer: Buffer.from(createTestSvg('ic-home-24', 24), 'utf-8'),
          width: 24,
          height: 24,
        },
        {
          id: 'ic-search-24',
          buffer: Buffer.from(createTestSvg('ic-search-24', 24), 'utf-8'),
          width: 24,
          height: 24,
        },
      ];

      const svgIconData = batchCreateSvgIconData(icons);

      expect(svgIconData).toHaveLength(2);
      expect(svgIconData[0].id).toBe('ic-home-24');
      expect(svgIconData[1].id).toBe('ic-search-24');
    });
  });

  describe('validateSvgIcons', () => {
    it('should validate correct icons', () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-home-24',
          content: createTestSvg('ic-home-24', 24),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
      ];

      const result = validateSvgIcons(icons);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty ID', () => {
      const icons: SvgIconData[] = [
        {
          id: '',
          content: createTestSvg('test', 24),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
      ];

      const result = validateSvgIcons(icons);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Icon ID is empty');
    });

    it('should detect invalid viewBox', () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-test-24',
          content: createTestSvg('ic-test-24', 24),
          viewBox: 'invalid',
          width: 24,
          height: 24,
        },
      ];

      const result = validateSvgIcons(icons);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid viewBox');
    });

    it('should detect empty content', () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-test-24',
          content: '',
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
      ];

      const result = validateSvgIcons(icons);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('SVG content is empty');
    });

    it('should detect invalid dimensions', () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-test-0',
          content: createTestSvg('ic-test-0', 24),
          viewBox: '0 0 24 24',
          width: 0,
          height: 0,
        },
      ];

      const result = validateSvgIcons(icons);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid dimensions');
    });

    it('should detect multiple errors', () => {
      const icons: SvgIconData[] = [
        {
          id: '',
          content: '',
          viewBox: 'invalid',
          width: 0,
          height: 0,
        },
      ];

      const result = validateSvgIcons(icons);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('generateSvgSprite', () => {
    it('should generate SVG symbol sprite', async () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-home-24',
          content: createTestSvg('ic-home-24', 24, 'circle'),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
        {
          id: 'ic-search-24',
          content: createTestSvg('ic-search-24', 24, 'rect'),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
      ];

      const sprite = await generateSvgSprite(icons, { optimize: false });

      expect(sprite.icons).toHaveLength(2);
      expect(sprite.content).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(sprite.content).toContain('viewBox="0 0');
      expect(sprite.content).toContain('width="');
      expect(sprite.content).toContain('height="');
      expect(sprite.content).toContain('<symbol id="ic-home-24" viewBox="0 0 24 24">');
      expect(sprite.content).toContain('<symbol id="ic-search-24" viewBox="0 0 24 24">');
      expect(sprite.content).toContain('</svg>');
      expect(sprite.hash).toHaveLength(8);
    });

    it('should generate preview SVG with expanded viewBox that contains all icons', async () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-home-24',
          content: createTestSvg('ic-home-24', 24, 'circle'),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
        {
          id: 'ic-large-96',
          content: createTestSvg('ic-large-96', 96, 'rect'),
          viewBox: '0 0 96 96',
          width: 96,
          height: 96,
        },
        {
          id: 'ic-medium-48',
          content: createTestSvg('ic-medium-48', 48, 'circle'),
          viewBox: '0 0 48 48',
          width: 48,
          height: 48,
        },
      ];

      const sprite = await generateSvgSprite(icons, { optimize: false });
      const preview = generateSvgSpritePreview(sprite);

      expect(preview).toContain('viewBox="0 0');
      expect(preview).toContain('width="');
      expect(preview).toContain('height="');
      expect(preview).toContain('<use href="#ic-home-24"');
      expect(preview).toContain('<use href="#ic-large-96"');
      expect(preview).toContain('<use href="#ic-medium-48"');
    });

    it('should use viewBox dimensions for preview sizing when width/height differ', async () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-mismatch',
          content: '<svg viewBox="0 0 24 24"><rect width="24" height="24"/></svg>',
          viewBox: '0 0 24 24',
          width: 16,
          height: 16,
        },
      ];

      const sprite = await generateSvgSprite(icons, { optimize: false });
      const preview = generateSvgSpritePreview(sprite);

      expect(preview).toContain('<use href="#ic-mismatch"');
      expect(preview).toContain('width="24"');
      expect(preview).toContain('height="24"');
    });

    it('should sort icons by ID deterministically', async () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-zebra-24',
          content: createTestSvg('ic-zebra-24', 24),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
        {
          id: 'ic-alpha-24',
          content: createTestSvg('ic-alpha-24', 24),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
        {
          id: 'ic-beta-24',
          content: createTestSvg('ic-beta-24', 24),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
      ];

      const sprite = await generateSvgSprite(icons, { optimize: false });

      // Symbols should appear in alphabetical order
      const alphaIndex = sprite.content.indexOf('ic-alpha-24');
      const betaIndex = sprite.content.indexOf('ic-beta-24');
      const zebraIndex = sprite.content.indexOf('ic-zebra-24');

      expect(alphaIndex).toBeLessThan(betaIndex);
      expect(betaIndex).toBeLessThan(zebraIndex);
    });

    it('should produce deterministic output', async () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-home-24',
          content: createTestSvg('ic-home-24', 24),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
        {
          id: 'ic-search-24',
          content: createTestSvg('ic-search-24', 24),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
      ];

      const sprite1 = await generateSvgSprite([...icons], { optimize: false });
      const sprite2 = await generateSvgSprite([...icons], { optimize: false });

      // Same content = same hash
      expect(sprite1.hash).toBe(sprite2.hash);
      expect(sprite1.content).toBe(sprite2.content);
    });

    it('should preserve viewBox in symbols', async () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-custom-viewbox',
          content: '<svg viewBox="-10 -10 20 20"><circle/></svg>',
          viewBox: '-10 -10 20 20',
          width: 20,
          height: 20,
        },
      ];

      const sprite = await generateSvgSprite(icons, { optimize: false });

      expect(sprite.content).toContain('viewBox="-10 -10 20 20"');
    });

    it('should extract inner SVG content', async () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-test-24',
          content: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>',
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
      ];

      const sprite = await generateSvgSprite(icons, { optimize: false });

      // Should contain circle element inside symbol
      expect(sprite.content).toContain('<circle cx="12" cy="12" r="10"/>');
      // Should not have nested <svg> tags
      expect(sprite.content).not.toContain('<svg viewBox="0 0 24 24"><svg');
    });

    it('should escape XML special characters in IDs', async () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-test-<>&"\'',
          content: createTestSvg('ic-test', 24),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
      ];

      const sprite = await generateSvgSprite(icons, { optimize: false });

      // Special characters should be escaped
      expect(sprite.content).toContain('&lt;');
      expect(sprite.content).toContain('&gt;');
      expect(sprite.content).toContain('&amp;');
      expect(sprite.content).toContain('&quot;');
      expect(sprite.content).toContain('&apos;');
    });

    it('should throw error on empty array', async () => {
      await expect(generateSvgSprite([], { optimize: false })).rejects.toThrow(
        'Cannot generate sprite from empty icon array'
      );
    });

    it('should throw error on invalid viewBox', async () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-invalid',
          content: createTestSvg('ic-invalid', 24),
          viewBox: 'invalid viewbox',
          width: 24,
          height: 24,
        },
      ];

      await expect(generateSvgSprite(icons, { optimize: false })).rejects.toThrow();
    });

    it('should handle SVGO optimization', async () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-home-24',
          content: createTestSvg('ic-home-24', 24),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
      ];

      const unoptimized = await generateSvgSprite(icons, { optimize: false });
      const optimized = await generateSvgSprite(icons, { optimize: true });

      // Both should be valid
      expect(unoptimized.content).toContain('<svg');
      expect(optimized.content).toContain('<svg');

      // Optimized might be shorter (whitespace removed), but not guaranteed
      expect(optimized.content.length).toBeGreaterThan(0);
    });

    it('should handle SVGO failure gracefully', async () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-test-24',
          content: createTestSvg('ic-test-24', 24),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
      ];

      // Should not throw even if optimization fails
      const sprite = await generateSvgSprite(icons, {
        optimize: true,
        svgoPlugins: [], // Empty plugins might cause issues, but shouldn't throw
      });

      expect(sprite.content).toContain('<svg');
    });

    it('should handle many icons', async () => {
      const icons: SvgIconData[] = Array.from({ length: 50 }, (_, i) => ({
        id: `ic-icon-${i.toString().padStart(3, '0')}`,
        content: createTestSvg(`ic-icon-${i}`, 24),
        viewBox: '0 0 24 24',
        width: 24,
        height: 24,
      }));

      const sprite = await generateSvgSprite(icons, { optimize: false });

      expect(sprite.icons).toHaveLength(50);
      expect(sprite.content).toContain('<svg');

      // Should contain all icons
      for (let i = 0; i < 50; i++) {
        const id = `ic-icon-${i.toString().padStart(3, '0')}`;
        expect(sprite.content).toContain(`id="${id}"`);
      }
    });

    it('should handle pretty print option', async () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-test-24',
          content: createTestSvg('ic-test-24', 24),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
      ];

      const sprite = await generateSvgSprite(icons, { optimize: false, pretty: true });

      // Pretty printed should have newlines
      expect(sprite.content.split('\n').length).toBeGreaterThan(1);
    });
  });

  describe('integration tests', () => {
    it('should create valid sprite usable with <use>', async () => {
      const icons: SvgIconData[] = [
        {
          id: 'ic-home-24',
          content: createTestSvg('ic-home-24', 24, 'circle'),
          viewBox: '0 0 24 24',
          width: 24,
          height: 24,
        },
      ];

      const sprite = await generateSvgSprite(icons, { optimize: false });

      // Sprite should be valid SVG
      expect(sprite.content).toMatch(/<svg[^>]*>/);
      expect(sprite.content).toMatch(/<symbol[^>]*id="ic-home-24"[^>]*>/);
      expect(sprite.content).toMatch(/<\/symbol>/);
      expect(sprite.content).toMatch(/<\/svg>/);

      // Should contain viewBox for proper scaling
      expect(sprite.content).toContain('viewBox="0 0 24 24"');
    });
  });
});
