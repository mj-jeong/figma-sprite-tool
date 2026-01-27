/**
 * Tests for PNG sprite generation with Sharp
 */

import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
  generatePngSprite,
  generatePngSprites,
  generatePngSpriteSheet,
} from '../../../../src/engine/sprite/png-generator.js';
import { packIconsWithPositions } from '../../../../src/engine/sprite/packer.js';
import { createTestIconData, createTestIconBatch } from '../../../fixtures/sprite/create-test-icons.js';

describe('png-generator', () => {
  describe('generatePngSprite', () => {
    it('should generate PNG sprite from packed icons', async () => {
      const icons = await Promise.all([
        createTestIconData('ic-home-24', 24, 24),
        createTestIconData('ic-search-24', 24, 24),
      ]);

      const packedIcons = packIconsWithPositions(icons, 2);
      const spriteWidth = Math.max(...packedIcons.map((i) => i.x + i.width)) + 2;
      const spriteHeight = Math.max(...packedIcons.map((i) => i.y + i.height)) + 2;

      const result = await generatePngSprite(packedIcons, spriteWidth, spriteHeight, {
        scale: 1,
      });

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.hash).toHaveLength(8);

      // Verify it's a valid PNG
      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.width).toBe(spriteWidth);
      expect(metadata.height).toBe(spriteHeight);
    });

    it('should generate 2x scaled sprite', async () => {
      const icons = await Promise.all([createTestIconData('ic-test-16', 16, 16)]);

      const packedIcons = packIconsWithPositions(icons, 2);
      const spriteWidth = icons[0].width + 4;
      const spriteHeight = icons[0].height + 4;

      const result = await generatePngSprite(packedIcons, spriteWidth, spriteHeight, {
        scale: 2,
      });

      expect(result.buffer).toBeInstanceOf(Buffer);

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBe(spriteWidth * 2);
      expect(metadata.height).toBe(spriteHeight * 2);
    });

    it('should handle multiple icons with different sizes', async () => {
      const icons = await Promise.all([
        createTestIconData('ic-small-16', 16, 16),
        createTestIconData('ic-medium-24', 24, 24),
        createTestIconData('ic-large-32', 32, 32),
      ]);

      const packedIcons = packIconsWithPositions(icons, 2);
      const spriteWidth = Math.max(...packedIcons.map((i) => i.x + i.width)) + 2;
      const spriteHeight = Math.max(...packedIcons.map((i) => i.y + i.height)) + 2;

      const result = await generatePngSprite(packedIcons, spriteWidth, spriteHeight);

      expect(result.buffer).toBeInstanceOf(Buffer);

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.format).toBe('png');
      expect(metadata.channels).toBe(4); // RGBA
    });

    it('should produce deterministic output for same input', async () => {
      const icons = await Promise.all([
        createTestIconData('ic-a-24', 24, 24, { r: 255, g: 0, b: 0 }),
        createTestIconData('ic-b-24', 24, 24, { r: 0, g: 255, b: 0 }),
      ]);

      const packedIcons = packIconsWithPositions(icons, 2);
      const spriteWidth = Math.max(...packedIcons.map((i) => i.x + i.width)) + 2;
      const spriteHeight = Math.max(...packedIcons.map((i) => i.y + i.height)) + 2;

      const result1 = await generatePngSprite(packedIcons, spriteWidth, spriteHeight);
      const result2 = await generatePngSprite(packedIcons, spriteWidth, spriteHeight);

      // Same hash means same content
      expect(result1.hash).toBe(result2.hash);
    });

    it('should throw error on empty icon array', async () => {
      await expect(
        generatePngSprite([], 100, 100)
      ).rejects.toThrow('Cannot generate sprite from empty icon array');
    });

    it('should throw error on invalid dimensions', async () => {
      const icons = await Promise.all([createTestIconData('ic-test-24', 24, 24)]);
      const packedIcons = packIconsWithPositions(icons, 2);

      await expect(
        generatePngSprite(packedIcons, 0, 100)
      ).rejects.toThrow('Invalid sprite dimensions');

      await expect(
        generatePngSprite(packedIcons, 100, 0)
      ).rejects.toThrow('Invalid sprite dimensions');

      await expect(
        generatePngSprite(packedIcons, -100, 100)
      ).rejects.toThrow('Invalid sprite dimensions');
    });

    it('should have transparent background', async () => {
      const icons = await Promise.all([createTestIconData('ic-test-24', 24, 24)]);

      const packedIcons = packIconsWithPositions(icons, 10); // Large padding
      const spriteWidth = Math.max(...packedIcons.map((i) => i.x + i.width)) + 10;
      const spriteHeight = Math.max(...packedIcons.map((i) => i.y + i.height)) + 10;

      const result = await generatePngSprite(packedIcons, spriteWidth, spriteHeight);

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.hasAlpha).toBe(true);
    });

    it('should handle many icons efficiently', async () => {
      const icons = await createTestIconBatch(20);
      const packedIcons = packIconsWithPositions(icons, 2);
      const spriteWidth = Math.max(...packedIcons.map((i) => i.x + i.width)) + 2;
      const spriteHeight = Math.max(...packedIcons.map((i) => i.y + i.height)) + 2;

      const startTime = Date.now();
      const result = await generatePngSprite(packedIcons, spriteWidth, spriteHeight);
      const duration = Date.now() - startTime;

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.format).toBe('png');
    });
  });

  describe('generatePngSprites', () => {
    it('should generate both 1x and 2x sprites', async () => {
      const icons = await Promise.all([
        createTestIconData('ic-test-24', 24, 24),
        createTestIconData('ic-test-32', 32, 32),
      ]);

      const packedIcons = packIconsWithPositions(icons, 2);
      const spriteWidth = Math.max(...packedIcons.map((i) => i.x + i.width)) + 2;
      const spriteHeight = Math.max(...packedIcons.map((i) => i.y + i.height)) + 2;

      const result = await generatePngSprites(
        packedIcons,
        spriteWidth,
        spriteHeight,
        2
      );

      expect(result.standard).toBeDefined();
      expect(result.retina).toBeDefined();

      // Standard sprite
      expect(result.standard.width).toBe(spriteWidth);
      expect(result.standard.height).toBe(spriteHeight);
      expect(result.standard.icons).toHaveLength(2);
      expect(result.standard.hash).toHaveLength(8);

      // Retina sprite (2x dimensions)
      expect(result.retina.width).toBe(spriteWidth * 2);
      expect(result.retina.height).toBe(spriteHeight * 2);
      expect(result.retina.icons).toHaveLength(2);
      expect(result.retina.hash).toHaveLength(8);

      // Different hashes (different content)
      expect(result.standard.hash).not.toBe(result.retina.hash);
    });

    it('should scale icon positions correctly for retina', async () => {
      const icons = await Promise.all([createTestIconData('ic-test-24', 24, 24)]);

      const packedIcons = packIconsWithPositions(icons, 2);
      const spriteWidth = icons[0].width + 4;
      const spriteHeight = icons[0].height + 4;

      const result = await generatePngSprites(
        packedIcons,
        spriteWidth,
        spriteHeight,
        2
      );

      const standardIcon = result.standard.icons[0];
      const retinaIcon = result.retina.icons[0];

      // Retina positions should be 2x
      expect(retinaIcon.x).toBe(standardIcon.x * 2);
      expect(retinaIcon.y).toBe(standardIcon.y * 2);
      expect(retinaIcon.width).toBe(standardIcon.width * 2);
      expect(retinaIcon.height).toBe(standardIcon.height * 2);
    });
  });

  describe('generatePngSpriteSheet', () => {
    it('should generate complete sprite sheet with buffer', async () => {
      const icons = await Promise.all([
        createTestIconData('ic-home-24', 24, 24),
        createTestIconData('ic-search-24', 24, 24),
      ]);

      const packedIcons = packIconsWithPositions(icons, 2);
      const spriteWidth = Math.max(...packedIcons.map((i) => i.x + i.width)) + 2;
      const spriteHeight = Math.max(...packedIcons.map((i) => i.y + i.height)) + 2;

      const sprite = await generatePngSpriteSheet(
        packedIcons,
        spriteWidth,
        spriteHeight,
        1
      );

      expect(sprite.width).toBe(spriteWidth);
      expect(sprite.height).toBe(spriteHeight);
      expect(sprite.icons).toHaveLength(2);
      expect(sprite.hash).toHaveLength(8);
      expect(sprite.buffer).toBeInstanceOf(Buffer);
    });

    it('should handle retina scale', async () => {
      const icons = await Promise.all([createTestIconData('ic-test-16', 16, 16)]);

      const packedIcons = packIconsWithPositions(icons, 2);
      const spriteWidth = icons[0].width + 4;
      const spriteHeight = icons[0].height + 4;

      const sprite = await generatePngSpriteSheet(
        packedIcons,
        spriteWidth,
        spriteHeight,
        2
      );

      expect(sprite.width).toBe(spriteWidth * 2);
      expect(sprite.height).toBe(spriteHeight * 2);

      const metadata = await sharp(sprite.buffer).metadata();
      expect(metadata.width).toBe(spriteWidth * 2);
    });
  });

  describe('compression and optimization', () => {
    it('should use compression level', async () => {
      const icons = await Promise.all([createTestIconData('ic-test-24', 24, 24)]);

      const packedIcons = packIconsWithPositions(icons, 2);
      const spriteWidth = icons[0].width + 4;
      const spriteHeight = icons[0].height + 4;

      // Low compression (faster, larger file)
      const lowCompression = await generatePngSprite(
        packedIcons,
        spriteWidth,
        spriteHeight,
        { compressionLevel: 0 }
      );

      // High compression (slower, smaller file)
      const highCompression = await generatePngSprite(
        packedIcons,
        spriteWidth,
        spriteHeight,
        { compressionLevel: 9 }
      );

      expect(lowCompression.buffer).toBeInstanceOf(Buffer);
      expect(highCompression.buffer).toBeInstanceOf(Buffer);

      // High compression should generally be smaller (though not guaranteed for small images)
      expect(highCompression.buffer.length).toBeLessThanOrEqual(
        lowCompression.buffer.length * 1.5
      );
    });
  });
});
