/**
 * SCSS generator unit tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateScss,
  generateMixins,
  validateScssOptions,
  type ScssGenerationOptions,
} from '../../../../src/engine/output/scss-generator.js';
import type { PackedIcon } from '../../../../src/engine/types/sprite.js';

describe('scss-generator', () => {
  const mockIcon: PackedIcon = {
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

  describe('generateScss', () => {
    it('should generate data-only SCSS content', async () => {
      const options: ScssGenerationOptions = {
        spriteImage: './sprite.png',
        spriteImage2x: './sprite@2x.png',
        spriteWidth: 1024,
        spriteHeight: 512,
        icons: [mockIcon],
      };

      const scss = await generateScss(options);

      // Check header comment
      expect(scss).toContain('// Auto-generated file. DO NOT EDIT.');
      expect(scss).toContain('// Source: Figma');

      // Check sprite variables
      expect(scss).toContain('$sprite-image: "./sprite.png"');
      expect(scss).toContain('$sprite-image-2x: "./sprite@2x.png"');
      expect(scss).toContain('$sprite-width: 1024px');
      expect(scss).toContain('$sprite-height: 512px');

      // Check icons map
      expect(scss).toContain('$icons: (');
      expect(scss).toContain('"ic-home-24-line": (x: 12px, y: 8px, w: 24px, h: 24px)');
      expect(scss).not.toContain('@mixin ');
    });

    it('should sort icons alphabetically by ID', async () => {
      const icons: PackedIcon[] = [
        { ...mockIcon, id: 'ic-zebra' },
        { ...mockIcon, id: 'ic-apple' },
        { ...mockIcon, id: 'ic-banana' },
      ];

      const options: ScssGenerationOptions = {
        spriteImage: './sprite.png',
        spriteImage2x: './sprite@2x.png',
        spriteWidth: 1024,
        spriteHeight: 512,
        icons,
      };

      const scss = await generateScss(options);

      // Extract icon entries
      const iconsMapMatch = scss.match(/\$icons: \(([\s\S]*?)\);/);
      expect(iconsMapMatch).toBeTruthy();

      const iconsMap = iconsMapMatch![1];
      const iconOrder = iconsMap.match(/"ic-[^"]+"/g);

      expect(iconOrder).toEqual(['"ic-apple"', '"ic-banana"', '"ic-zebra"']);
    });

    it('should handle multiple icons with proper commas', async () => {
      const icons: PackedIcon[] = [
        { ...mockIcon, id: 'ic-home-24-line', x: 0, y: 0 },
        { ...mockIcon, id: 'ic-search-24-line', x: 32, y: 0 },
        { ...mockIcon, id: 'ic-settings-24-line', x: 64, y: 0 },
      ];

      const options: ScssGenerationOptions = {
        spriteImage: './sprite.png',
        spriteImage2x: './sprite@2x.png',
        spriteWidth: 1024,
        spriteHeight: 512,
        icons,
      };

      const scss = await generateScss(options);

      // Check proper comma placement
      expect(scss).toContain('"ic-home-24-line": (x: 0px, y: 0px, w: 24px, h: 24px),');
      expect(scss).toContain('"ic-search-24-line": (x: 32px, y: 0px, w: 24px, h: 24px),');
      expect(scss).toContain('"ic-settings-24-line": (x: 64px, y: 0px, w: 24px, h: 24px)');

      // Last item should not have comma
      expect(scss).not.toContain('"ic-settings-24-line": (x: 64px, y: 0px, w: 24px, h: 24px),');
    });

    it('should use relative paths for sprite images', async () => {
      const options: ScssGenerationOptions = {
        spriteImage: './custom-sprite.png',
        spriteImage2x: './custom-sprite@2x.png',
        spriteWidth: 1024,
        spriteHeight: 512,
        icons: [mockIcon],
      };

      const scss = await generateScss(options);

      expect(scss).toContain('$sprite-image: "./custom-sprite.png"');
      expect(scss).toContain('$sprite-image-2x: "./custom-sprite@2x.png"');
    });

    it('should handle special characters in icon IDs', async () => {
      const specialIcon: PackedIcon = {
        ...mockIcon,
        id: 'ic-arrow-right-24-line',
      };

      const options: ScssGenerationOptions = {
        spriteImage: './sprite.png',
        spriteImage2x: './sprite@2x.png',
        spriteWidth: 1024,
        spriteHeight: 512,
        icons: [specialIcon],
      };

      const scss = await generateScss(options);

      expect(scss).toContain('"ic-arrow-right-24-line"');
    });

    it('should maintain sprite template structure', async () => {
      const options: ScssGenerationOptions = {
        spriteImage: './sprite.png',
        spriteImage2x: './sprite@2x.png',
        spriteWidth: 1024,
        spriteHeight: 512,
        icons: [mockIcon],
      };

      const scss = await generateScss(options);

      // Check overall structure order
      const headerIndex = scss.indexOf('// Auto-generated');
      const variablesIndex = scss.indexOf('$sprite-image:');
      const iconsMapIndex = scss.indexOf('$icons: (');

      expect(headerIndex).toBeLessThan(variablesIndex);
      expect(variablesIndex).toBeLessThan(iconsMapIndex);
    });
  });

  describe('generateMixins', () => {
    it('should generate mixins SCSS APIs for PNG and SVG', async () => {
      const options: ScssGenerationOptions = {
        spriteImage: './sprite.png',
        spriteImage2x: './sprite@2x.png',
        spriteWidth: 1024,
        spriteHeight: 512,
        icons: [mockIcon],
      };

      const scss = await generateMixins(options);

      expect(scss).toContain('@function _icon($name)');
      expect(scss).toContain('@mixin sprite-png($name, $unit: px, $rem-base: 10)');
      expect(scss).toContain('@mixin sprite-png-image($icon, $unit: px, $rem-base: 10)');
      expect(scss).toContain('@mixin sprite-png-position($icon, $unit: px, $rem-base: 10)');
      expect(scss).toContain('@mixin sprite-png-size($icon, $unit: px, $rem-base: 10)');
      expect(scss).toContain('@mixin sprite-svg($name, $unit: px, $rem-base: 10, $image: $sprite-svg-image)');
      expect(scss).toContain('@mixin sprite-svg-image($icon, $unit: px, $rem-base: 10, $image: $sprite-svg-image)');
      expect(scss).toContain('@mixin sprite-svg-position($icon, $unit: px, $rem-base: 10)');
      expect(scss).toContain('@mixin sprite-svg-size($icon, $unit: px, $rem-base: 10)');
      expect(scss).toContain('@error "Sprite icon `#{$name}` not found."');
    });

    it('should reference sprite data variables for import-based usage', async () => {
      const options: ScssGenerationOptions = {
        spriteImage: './sprite.png',
        spriteImage2x: './sprite@2x.png',
        spriteWidth: 1024,
        spriteHeight: 512,
        icons: [mockIcon],
      };

      const spriteScss = await generateScss(options);
      const mixinsScss = await generateMixins(options);

      expect(spriteScss).toContain('$icons: (');
      expect(mixinsScss).toContain('map-get($icons, $name)');
      expect(mixinsScss).toContain('background-image: url(#{$sprite-image})');
      expect(mixinsScss).toContain('background-image: url(#{$sprite-image-2x})');
    });
  });

  describe('validateScssOptions', () => {
    it('should pass for valid options', () => {
      const options: ScssGenerationOptions = {
        spriteImage: './sprite.png',
        spriteImage2x: './sprite@2x.png',
        spriteWidth: 1024,
        spriteHeight: 512,
        icons: [mockIcon],
      };

      expect(() => validateScssOptions(options)).not.toThrow();
    });

    it('should throw if spriteImage is missing', () => {
      const options = {
        spriteImage2x: './sprite@2x.png',
        spriteWidth: 1024,
        spriteHeight: 512,
        icons: [mockIcon],
      } as ScssGenerationOptions;

      expect(() => validateScssOptions(options)).toThrow('spriteImage is required');
    });

    it('should throw if spriteImage2x is missing', () => {
      const options = {
        spriteImage: './sprite.png',
        spriteWidth: 1024,
        spriteHeight: 512,
        icons: [mockIcon],
      } as ScssGenerationOptions;

      expect(() => validateScssOptions(options)).toThrow('spriteImage2x is required');
    });

    it('should throw if dimensions are invalid', () => {
      const options: ScssGenerationOptions = {
        spriteImage: './sprite.png',
        spriteImage2x: './sprite@2x.png',
        spriteWidth: 0,
        spriteHeight: 512,
        icons: [mockIcon],
      };

      expect(() => validateScssOptions(options)).toThrow('Sprite dimensions must be positive');
    });

    it('should throw if icons array is empty', () => {
      const options: ScssGenerationOptions = {
        spriteImage: './sprite.png',
        spriteImage2x: './sprite@2x.png',
        spriteWidth: 1024,
        spriteHeight: 512,
        icons: [],
      };

      expect(() => validateScssOptions(options)).toThrow('Icons array cannot be empty');
    });
  });
});
