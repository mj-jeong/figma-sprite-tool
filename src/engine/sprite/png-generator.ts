/**
 * PNG sprite sheet generator using Sharp
 * Composites icons into a single sprite sheet with support for retina scaling
 */

import sharp from 'sharp';
import type { PackedIcon, SpriteSheet } from '../types/sprite.js';
import { createProcessingError, ErrorCode } from '../../utils/errors.js';
import { createHash } from 'node:crypto';

/**
 * PNG generation options
 */
export interface PngGenerationOptions {
  /** Scale factor (1 for standard, 2 for retina) */
  scale: number;
  /** Background color (transparent by default) */
  backgroundColor?: { r: number; g: number; b: number; alpha: number };
  /** PNG compression level (0-9, default: 9) */
  compressionLevel?: number;
}

/**
 * Default PNG generation options
 */
const DEFAULT_PNG_OPTIONS: PngGenerationOptions = {
  scale: 1,
  backgroundColor: { r: 0, g: 0, b: 0, alpha: 0 },
  compressionLevel: 9,
};

/**
 * Generate PNG sprite sheet from packed icons
 *
 * This function uses Sharp to composite multiple icon images
 * into a single sprite sheet with transparent background.
 *
 * @param packedIcons - Icons with position information
 * @param spriteWidth - Total sprite sheet width
 * @param spriteHeight - Total sprite sheet height
 * @param options - PNG generation options
 * @returns Sprite sheet data with buffer and hash
 * @throws SpriteError on processing failures
 *
 * @example
 * ```typescript
 * const sprite = await generatePngSprite(
 *   packedIcons,
 *   1024,
 *   512,
 *   { scale: 1 }
 * );
 * await fs.writeFile('sprite.png', sprite.buffer);
 * ```
 */
export async function generatePngSprite(
  packedIcons: PackedIcon[],
  spriteWidth: number,
  spriteHeight: number,
  options: Partial<PngGenerationOptions> = {}
): Promise<{ buffer: Buffer; hash: string }> {
  const opts = { ...DEFAULT_PNG_OPTIONS, ...options };

  if (packedIcons.length === 0) {
    throw createProcessingError(
      ErrorCode.IMAGE_PROCESSING_FAILED,
      'Cannot generate sprite from empty icon array',
      { iconCount: 0 }
    );
  }

  if (spriteWidth <= 0 || spriteHeight <= 0) {
    throw createProcessingError(
      ErrorCode.IMAGE_PROCESSING_FAILED,
      'Invalid sprite dimensions',
      { width: spriteWidth, height: spriteHeight }
    );
  }

  try {
    // Calculate scaled dimensions
    const scaledWidth = Math.round(spriteWidth * opts.scale);
    const scaledHeight = Math.round(spriteHeight * opts.scale);

    // Create transparent canvas
    const canvas = sharp({
      create: {
        width: scaledWidth,
        height: scaledHeight,
        channels: 4,
        background: opts.backgroundColor || { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });

    // Prepare composite operations
    const compositeOperations = await Promise.all(
      packedIcons.map(async (icon) => {
        // Scale icon buffer if needed
        let processedBuffer = icon.buffer;

        if (opts.scale !== 1) {
          const scaledWidth = Math.round(icon.width * opts.scale);
          const scaledHeight = Math.round(icon.height * opts.scale);

          processedBuffer = await sharp(icon.buffer)
            .resize(scaledWidth, scaledHeight, {
              kernel: sharp.kernel.lanczos3,
              fit: 'contain',
            })
            .toBuffer();
        }

        return {
          input: processedBuffer,
          top: Math.round(icon.y * opts.scale),
          left: Math.round(icon.x * opts.scale),
        };
      })
    );

    // Composite all icons onto canvas
    const buffer = await canvas
      .composite(compositeOperations)
      .png({ compressionLevel: opts.compressionLevel })
      .toBuffer();

    // Calculate hash for change detection
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 8);

    return { buffer, hash };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw createProcessingError(
      ErrorCode.IMAGE_PROCESSING_FAILED,
      `Failed to generate PNG sprite: ${errorMessage}`,
      {
        iconCount: packedIcons.length,
        spriteWidth,
        spriteHeight,
        scale: opts.scale,
        error: errorMessage,
      }
    );
  }
}

/**
 * Generate both 1x and 2x (retina) PNG sprites
 *
 * This is a convenience function that generates both standard
 * and retina sprite sheets in a single operation.
 *
 * @param packedIcons - Icons with position information
 * @param spriteWidth - Total sprite sheet width (1x)
 * @param spriteHeight - Total sprite sheet height (1x)
 * @param padding - Padding used in packing
 * @returns Both sprite sheets with metadata
 *
 * @example
 * ```typescript
 * const { standard, retina } = await generatePngSprites(
 *   packedIcons,
 *   1024,
 *   512,
 *   2
 * );
 * await fs.writeFile('sprite.png', standard.buffer);
 * await fs.writeFile('sprite@2x.png', retina.buffer);
 * ```
 */
export async function generatePngSprites(
  packedIcons: PackedIcon[],
  spriteWidth: number,
  spriteHeight: number,
  padding: number
): Promise<{
  standard: SpriteSheet;
  retina: SpriteSheet;
}> {
  // Generate 1x sprite
  const standardResult = await generatePngSprite(packedIcons, spriteWidth, spriteHeight, {
    scale: 1,
  });

  // Generate 2x sprite
  const retinaResult = await generatePngSprite(packedIcons, spriteWidth, spriteHeight, {
    scale: 2,
  });

  // Create sprite sheet metadata
  const standard: SpriteSheet = {
    width: spriteWidth,
    height: spriteHeight,
    icons: packedIcons,
    hash: standardResult.hash,
  };

  const retina: SpriteSheet = {
    width: spriteWidth * 2,
    height: spriteHeight * 2,
    icons: packedIcons.map((icon) => ({
      ...icon,
      x: icon.x * 2,
      y: icon.y * 2,
      width: icon.width * 2,
      height: icon.height * 2,
    })),
    hash: retinaResult.hash,
  };

  return { standard, retina };
}

/**
 * Generate single PNG sprite with full metadata
 *
 * This is the main entry point for PNG sprite generation,
 * combining packing result with buffer generation.
 *
 * @param packedIcons - Icons with position information
 * @param spriteWidth - Total sprite sheet width
 * @param spriteHeight - Total sprite sheet height
 * @param scale - Scale factor (1 or 2)
 * @returns Complete sprite sheet with buffer
 *
 * @example
 * ```typescript
 * const sprite = await generatePngSpriteSheet(
 *   packedIcons,
 *   1024,
 *   512,
 *   2 // Retina
 * );
 * console.log(`Generated ${sprite.icons.length} icons`);
 * console.log(`Hash: ${sprite.hash}`);
 * ```
 */
export async function generatePngSpriteSheet(
  packedIcons: PackedIcon[],
  spriteWidth: number,
  spriteHeight: number,
  scale: number = 1
): Promise<SpriteSheet & { buffer: Buffer }> {
  const { buffer, hash } = await generatePngSprite(
    packedIcons,
    spriteWidth,
    spriteHeight,
    { scale }
  );

  const scaledWidth = Math.round(spriteWidth * scale);
  const scaledHeight = Math.round(spriteHeight * scale);

  return {
    width: scaledWidth,
    height: scaledHeight,
    icons: packedIcons.map((icon) =>
      scale === 1
        ? icon
        : {
            ...icon,
            x: Math.round(icon.x * scale),
            y: Math.round(icon.y * scale),
            width: Math.round(icon.width * scale),
            height: Math.round(icon.height * scale),
          }
    ),
    hash,
    buffer,
  };
}
