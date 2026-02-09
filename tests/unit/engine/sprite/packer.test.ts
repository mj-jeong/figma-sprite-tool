/**
 * Tests for icon packing with potpack
 */

import { describe, it, expect } from 'vitest';
import { packIcons, packIconsWithPositions, calculateSpriteDimensions } from '../../../../src/engine/sprite/packer.js';
import type { IconData } from '../../../../src/engine/types/sprite.js';

describe('packer', () => {
  // Helper to create test icon data
  function createTestIcon(id: string, width: number, height: number): IconData {
    return {
      id,
      name: id,
      nodeId: `node-${id}`,
      variants: { name: id },
      width,
      height,
      buffer: Buffer.from('fake-image-data'),
    };
  }

  describe('packIcons', () => {
    it('should pack icons with padding', () => {
      const icons: IconData[] = [
        createTestIcon('ic-home-24', 24, 24),
        createTestIcon('ic-search-24', 24, 24),
        createTestIcon('ic-settings-24', 24, 24),
      ];

      const result = packIcons(icons, 2);

      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.boxes).toHaveLength(3);
      expect(result.fill).toBeGreaterThan(0);
      expect(result.fill).toBeLessThanOrEqual(1);
    });

    it('should produce deterministic results (same input = same output)', () => {
      const icons: IconData[] = [
        createTestIcon('ic-home-24', 24, 24),
        createTestIcon('ic-search-24', 24, 24),
        createTestIcon('ic-settings-24', 24, 24),
      ];

      const result1 = packIcons([...icons], 2);
      const result2 = packIcons([...icons], 2);

      // Same dimensions
      expect(result1.width).toBe(result2.width);
      expect(result1.height).toBe(result2.height);
      expect(result1.fill).toBe(result2.fill);

      // Same positions
      expect(result1.boxes).toEqual(result2.boxes);
    });

    it('should produce deterministic results regardless of input order', () => {
      const icons: IconData[] = [
        createTestIcon('ic-home-24', 24, 24),
        createTestIcon('ic-search-24', 24, 24),
        createTestIcon('ic-settings-24', 24, 24),
      ];

      // Different input orders
      const shuffled1 = [icons[1], icons[0], icons[2]];
      const shuffled2 = [icons[2], icons[1], icons[0]];

      const result1 = packIcons(shuffled1, 2);
      const result2 = packIcons(shuffled2, 2);

      // Should produce identical layouts (IDs are sorted internally)
      expect(result1.width).toBe(result2.width);
      expect(result1.height).toBe(result2.height);
    });

    it('should handle different icon sizes', () => {
      const icons: IconData[] = [
        createTestIcon('ic-small-16', 16, 16),
        createTestIcon('ic-medium-24', 24, 24),
        createTestIcon('ic-large-32', 32, 32),
      ];

      const result = packIcons(icons, 2);

      expect(result.width).toBeGreaterThanOrEqual(32 + 4); // largest icon + padding
      expect(result.height).toBeGreaterThan(0);
      expect(result.boxes).toHaveLength(3);
    });

    it('should respect padding parameter', () => {
      const icons: IconData[] = [
        createTestIcon('ic-home-24', 24, 24),
        createTestIcon('ic-search-24', 24, 24),
      ];

      const result0 = packIcons(icons, 0);
      const result2 = packIcons(icons, 2);
      const result4 = packIcons(icons, 4);

      // More padding = larger sprite (generally)
      expect(result4.width).toBeGreaterThanOrEqual(result2.width);
      expect(result2.width).toBeGreaterThanOrEqual(result0.width);
    });

    it('should throw error on empty array', () => {
      expect(() => packIcons([], 2)).toThrow('Cannot pack empty icon array');
    });

    it('should handle single icon', () => {
      const icons: IconData[] = [createTestIcon('ic-only-24', 24, 24)];

      const result = packIcons(icons, 2);

      expect(result.width).toBe(24 + 4); // icon + padding * 2
      expect(result.height).toBe(24 + 4);
      expect(result.boxes).toHaveLength(1);
    });

    it('should handle many icons efficiently', () => {
      const icons: IconData[] = Array.from({ length: 50 }, (_, i) =>
        createTestIcon(`ic-icon-${i.toString().padStart(3, '0')}`, 24, 24)
      );

      const result = packIcons(icons, 2);

      expect(result.boxes).toHaveLength(50);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.fill).toBeGreaterThan(0);
    });
  });

  describe('packIconsWithPositions', () => {
    it('should return positioned icons', () => {
      const icons: IconData[] = [
        createTestIcon('ic-home-24', 24, 24),
        createTestIcon('ic-search-24', 24, 24),
      ];

      const packedIcons = packIconsWithPositions(icons, 2);

      expect(packedIcons).toHaveLength(2);

      for (const icon of packedIcons) {
        expect(icon.x).toBeGreaterThanOrEqual(0);
        expect(icon.y).toBeGreaterThanOrEqual(0);
        expect(icon.width).toBe(24);
        expect(icon.height).toBe(24);
      }
    });

    it('should sort icons by ID', () => {
      const icons: IconData[] = [
        createTestIcon('ic-zebra-24', 24, 24),
        createTestIcon('ic-alpha-24', 24, 24),
        createTestIcon('ic-beta-24', 24, 24),
      ];

      const packedIcons = packIconsWithPositions(icons, 2);

      // Icons should be sorted alphabetically by ID
      expect(packedIcons[0].id).toBe('ic-alpha-24');
      expect(packedIcons[1].id).toBe('ic-beta-24');
      expect(packedIcons[2].id).toBe('ic-zebra-24');
    });

    it('should return empty array for empty input', () => {
      const packedIcons = packIconsWithPositions([], 2);
      expect(packedIcons).toEqual([]);
    });

    it('should apply padding offset correctly', () => {
      const icons: IconData[] = [createTestIcon('ic-test-24', 24, 24)];

      const padding = 4;
      const packedIcons = packIconsWithPositions(icons, padding);

      // First icon should be offset by padding
      expect(packedIcons[0].x).toBe(padding);
      expect(packedIcons[0].y).toBe(padding);
    });
  });

  describe('calculateSpriteDimensions', () => {
    it('should calculate dimensions without packing icons', () => {
      const icons: IconData[] = [
        createTestIcon('ic-home-24', 24, 24),
        createTestIcon('ic-search-24', 24, 24),
        createTestIcon('ic-settings-24', 24, 24),
      ];

      const dimensions = calculateSpriteDimensions(icons, 2);

      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
      expect(dimensions.fill).toBeGreaterThan(0);
      expect(dimensions.fill).toBeLessThanOrEqual(1);
    });

    it('should return zero dimensions for empty array', () => {
      const dimensions = calculateSpriteDimensions([], 2);

      expect(dimensions.width).toBe(0);
      expect(dimensions.height).toBe(0);
      expect(dimensions.fill).toBe(0);
    });

    it('should match packIcons dimensions', () => {
      const icons: IconData[] = [
        createTestIcon('ic-home-24', 24, 24),
        createTestIcon('ic-search-24', 24, 24),
      ];

      const estimated = calculateSpriteDimensions(icons, 2);
      const packed = packIcons(icons, 2);

      expect(estimated.width).toBe(packed.width);
      expect(estimated.height).toBe(packed.height);
      expect(estimated.fill).toBe(packed.fill);
    });

    it('should be deterministic regardless of input order', () => {
      const icons: IconData[] = [
        createTestIcon('ic-z-24', 24, 24),
        createTestIcon('ic-a-16', 16, 16),
        createTestIcon('ic-m-32', 32, 32),
      ];

      const shuffled = [icons[2], icons[0], icons[1]];
      const estimatedA = calculateSpriteDimensions(icons, 2);
      const estimatedB = calculateSpriteDimensions(shuffled, 2);

      expect(estimatedA.width).toBe(estimatedB.width);
      expect(estimatedA.height).toBe(estimatedB.height);
      expect(estimatedA.fill).toBe(estimatedB.fill);
    });
  });

  describe('determinism validation', () => {
    it('should produce identical results across multiple runs', () => {
      const icons: IconData[] = [
        createTestIcon('ic-a-16', 16, 16),
        createTestIcon('ic-b-24', 24, 24),
        createTestIcon('ic-c-32', 32, 32),
        createTestIcon('ic-d-24', 24, 24),
        createTestIcon('ic-e-16', 16, 16),
      ];

      const results = Array.from({ length: 10 }, () => packIcons([...icons], 2));

      // All results should be identical
      const firstResult = results[0];
      for (const result of results.slice(1)) {
        expect(result.width).toBe(firstResult.width);
        expect(result.height).toBe(firstResult.height);
        expect(result.fill).toBe(firstResult.fill);
        expect(result.boxes).toEqual(firstResult.boxes);
      }
    });

    it('should be deterministic with special characters in IDs', () => {
      const icons: IconData[] = [
        createTestIcon('ic-home-24-line', 24, 24),
        createTestIcon('ic-search-24-filled', 24, 24),
        createTestIcon('ic-settings-32-outlined--dark', 32, 32),
      ];

      const result1 = packIcons([...icons], 2);
      const result2 = packIcons([...icons], 2);

      expect(result1.boxes).toEqual(result2.boxes);
    });
  });
});
