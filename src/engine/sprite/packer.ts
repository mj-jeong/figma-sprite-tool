/**
 * Bin-packing wrapper using potpack
 * Provides deterministic sprite sheet layout with configurable padding
 */

import potpack from 'potpack';
import type { IconData, PackedIcon, PackingResult } from '../types/sprite.js';
import { createProcessingError, ErrorCode } from '../../utils/errors.js';

/**
 * Pack icons into sprite sheet using bin-packing algorithm
 *
 * CRITICAL: This function is deterministic by design.
 * Same input icons (sorted by ID) will always produce the same layout.
 *
 * @param icons - Icons to pack
 * @param padding - Padding between icons in pixels (default: 2)
 * @returns Packing result with positioned icons
 * @throws SpriteError on packing failures
 *
 * @example
 * ```typescript
 * const icons = [
 *   { id: 'ic-home-24', width: 24, height: 24, ... },
 *   { id: 'ic-search-24', width: 24, height: 24, ... }
 * ];
 * const result = packIcons(icons, 2);
 * console.log(`Sprite size: ${result.width}x${result.height}`);
 * ```
 */
export function packIcons(icons: IconData[], padding: number = 2): PackingResult {
  if (icons.length === 0) {
    throw createProcessingError(
      ErrorCode.PACKING_FAILED,
      'Cannot pack empty icon array',
      { iconCount: 0 }
    );
  }

  // DETERMINISM GUARANTEE: Sort icons by ID (alphabetically)
  // This ensures the same input order produces the same layout
  const sortedIcons = [...icons].sort((a, b) => a.id.localeCompare(b.id));

  // Prepare boxes for potpack (add padding to each dimension)
  const boxes = sortedIcons.map((icon) => ({
    w: icon.width + padding * 2,
    h: icon.height + padding * 2,
  }));

  // Run potpack algorithm
  const packResult = potpack(boxes);

  // Validate packing result
  if (!packResult || packResult.w === 0 || packResult.h === 0) {
    throw createProcessingError(
      ErrorCode.PACKING_FAILED,
      'Potpack returned invalid dimensions',
      {
        iconCount: icons.length,
        resultWidth: packResult?.w,
        resultHeight: packResult?.h,
      }
    );
  }

  // Create packed icons with positions (apply padding offset)
  return {
    width: packResult.w,
    height: packResult.h,
    fill: packResult.fill,
    boxes: boxes.map((box) => ({
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
    })),
  };
}

/**
 * Pack icons and return positioned icon data
 *
 * This is a convenience wrapper that returns PackedIcon[] directly
 * instead of the full PackingResult.
 *
 * @param icons - Icons to pack
 * @param padding - Padding between icons in pixels
 * @returns Array of positioned icons
 *
 * @example
 * ```typescript
 * const packedIcons = packIconsWithPositions(icons, 2);
 * for (const icon of packedIcons) {
 *   console.log(`${icon.id}: (${icon.x}, ${icon.y})`);
 * }
 * ```
 */
export function packIconsWithPositions(icons: IconData[], padding: number = 2): PackedIcon[] {
  if (icons.length === 0) {
    return [];
  }

  // Sort icons deterministically
  const sortedIcons = [...icons].sort((a, b) => a.id.localeCompare(b.id));

  // Prepare boxes for potpack
  const boxes = sortedIcons.map((icon) => ({
    w: icon.width + padding * 2,
    h: icon.height + padding * 2,
  }));

  // Run potpack
  const packResult = potpack(boxes);

  if (!packResult || packResult.w === 0 || packResult.h === 0) {
    throw createProcessingError(
      ErrorCode.PACKING_FAILED,
      'Failed to pack icons into sprite sheet',
      { iconCount: icons.length }
    );
  }

  // Create packed icons with positions
  return sortedIcons.map((icon, index) => {
    const box = boxes[index];

    return {
      ...icon,
      x: box.x + padding,
      y: box.y + padding,
    };
  });
}

/**
 * Calculate optimal sprite sheet dimensions
 *
 * This function provides information about the sprite sheet
 * without actually performing the packing operation.
 * Useful for pre-validation or progress reporting.
 *
 * @param icons - Icons to analyze
 * @param padding - Padding to apply
 * @returns Estimated sprite sheet dimensions
 *
 * @example
 * ```typescript
 * const dimensions = calculateSpriteDimensions(icons, 2);
 * console.log(`Estimated sprite: ${dimensions.width}x${dimensions.height}`);
 * console.log(`Fill efficiency: ${(dimensions.fill * 100).toFixed(1)}%`);
 * ```
 */
export function calculateSpriteDimensions(
  icons: IconData[],
  padding: number = 2
): { width: number; height: number; fill: number } {
  if (icons.length === 0) {
    return { width: 0, height: 0, fill: 0 };
  }

  const sortedIcons = [...icons].sort((a, b) => a.id.localeCompare(b.id));

  const boxes = sortedIcons.map((icon) => ({
    w: icon.width + padding * 2,
    h: icon.height + padding * 2,
  }));

  const result = potpack(boxes);

  return {
    width: result.w,
    height: result.h,
    fill: result.fill,
  };
}
