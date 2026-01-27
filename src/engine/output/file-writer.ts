/**
 * File writer for sprite outputs
 * Coordinates writing of all output files with Windows path compatibility
 */

import { writeFile, ensureDir } from '../../utils/fs.js';
import { resolvePath, joinPath, normalizePath } from '../../utils/path.js';
import type { SpriteSheet, SvgSpriteSheet } from '../types/sprite.js';
import { generateScss, type ScssGenerationOptions } from './scss-generator.js';
import { generateSpriteJson, type JsonGenerationOptions } from './json-generator.js';

/**
 * Output file paths
 */
export interface OutputFilePaths {
  /** PNG sprite file path (1x) */
  png: string;
  /** PNG sprite file path (2x) */
  png2x: string;
  /** SVG sprite file path */
  svg: string;
  /** SCSS mixin file path */
  scss: string;
  /** JSON metadata file path */
  json: string;
}

/**
 * Output result with file information
 */
export interface OutputResult {
  /** Generated file paths */
  files: OutputFilePaths;
  /** Content hashes */
  hashes: {
    png: string;
    svg: string;
  };
  /** Generation statistics */
  stats: {
    iconCount: number;
    spriteWidth: number;
    spriteHeight: number;
    fileSize: {
      png: number;
      png2x: number;
      svg: number;
      scss: number;
      json: number;
    };
  };
}

/**
 * Write sprite output options
 */
export interface WriteOutputOptions {
  /** Output directory path */
  outputDir: string;
  /** Output filename prefix (e.g., "sprite") */
  outputName: string;
  /** PNG sprite data (1x) */
  pngSprite: {
    buffer: Buffer;
    sheet: SpriteSheet;
  };
  /** PNG sprite data (2x, optional) */
  pngSprite2x?: {
    buffer: Buffer;
    sheet: SpriteSheet;
  };
  /** SVG sprite data */
  svgSprite: SvgSpriteSheet;
  /** Figma file key */
  fileKey: string;
  /** Figma page path */
  page: string;
  /** PNG configuration */
  pngConfig: {
    scale: number;
    padding: number;
  };
  /** SVG configuration */
  svgConfig: {
    svgo: boolean;
  };
}

/**
 * Build output file paths
 *
 * Creates absolute file paths for all output files with Windows compatibility.
 *
 * @param outputDir - Output directory
 * @param outputName - Filename prefix
 * @returns Object containing all output file paths
 */
export function buildOutputPaths(outputDir: string, outputName: string): OutputFilePaths {
  const dir = resolvePath(outputDir);

  return {
    png: normalizePath(joinPath(dir, `${outputName}.png`)),
    png2x: normalizePath(joinPath(dir, `${outputName}@2x.png`)),
    svg: normalizePath(joinPath(dir, `${outputName}.svg`)),
    scss: normalizePath(joinPath(dir, `${outputName}.scss`)),
    json: normalizePath(joinPath(dir, `${outputName}.json`)),
  };
}

/**
 * Write PNG sprite files
 *
 * Writes both 1x and optional 2x PNG sprite sheets.
 *
 * @param paths - Output file paths
 * @param pngBuffer - 1x PNG buffer
 * @param png2xBuffer - 2x PNG buffer (optional)
 * @returns File sizes in bytes
 */
async function writePngFiles(
  paths: OutputFilePaths,
  pngBuffer: Buffer,
  png2xBuffer?: Buffer
): Promise<{ png: number; png2x: number }> {
  // Write 1x PNG
  await writeFile(paths.png, pngBuffer);
  const pngSize = pngBuffer.length;

  // Write 2x PNG (if provided)
  let png2xSize = 0;
  if (png2xBuffer) {
    await writeFile(paths.png2x, png2xBuffer);
    png2xSize = png2xBuffer.length;
  }

  return { png: pngSize, png2x: png2xSize };
}

/**
 * Write SVG sprite file
 *
 * @param path - SVG file path
 * @param svgSprite - SVG sprite data
 * @returns File size in bytes
 */
async function writeSvgFile(path: string, svgSprite: SvgSpriteSheet): Promise<number> {
  await writeFile(path, svgSprite.content);
  return Buffer.byteLength(svgSprite.content, 'utf-8');
}

/**
 * Write SCSS mixin file
 *
 * @param path - SCSS file path
 * @param options - SCSS generation options
 * @returns File size in bytes
 */
async function writeScssFile(path: string, options: ScssGenerationOptions): Promise<number> {
  const scss = await generateScss(options);
  await writeFile(path, scss);
  return Buffer.byteLength(scss, 'utf-8');
}

/**
 * Write JSON metadata file
 *
 * @param path - JSON file path
 * @param options - JSON generation options
 * @returns File size in bytes
 */
async function writeJsonFile(path: string, options: JsonGenerationOptions): Promise<number> {
  const json = generateSpriteJson(options);
  await writeFile(path, json);
  return Buffer.byteLength(json, 'utf-8');
}

/**
 * Write all sprite output files
 *
 * Coordinates writing of all output files:
 * - PNG sprite sheets (1x and 2x)
 * - SVG sprite sheet
 * - SCSS mixin file
 * - JSON metadata file
 *
 * All file operations use atomic writes (temp → rename) via fs utilities.
 * Windows path compatibility is handled automatically.
 *
 * @param options - Write output options
 * @returns Output result with file paths and statistics
 * @throws SpriteError on write failures (E501, E503)
 *
 * @example
 * ```typescript
 * const result = await writeOutput({
 *   outputDir: './assets/sprite',
 *   outputName: 'sprite',
 *   pngSprite: pngData,
 *   pngSprite2x: pngData2x,
 *   svgSprite: svgData,
 *   fileKey: 'AbCdEf123456',
 *   page: 'Design System / Icons',
 *   pngConfig: { scale: 2, padding: 2 },
 *   svgConfig: { svgo: true },
 * });
 * ```
 */
export async function writeOutput(options: WriteOutputOptions): Promise<OutputResult> {
  // Ensure output directory exists
  await ensureDir(options.outputDir);

  // Build output file paths
  const paths = buildOutputPaths(options.outputDir, options.outputName);

  // Write PNG files
  const pngSizes = await writePngFiles(
    paths,
    options.pngSprite.buffer,
    options.pngSprite2x?.buffer
  );

  // Write SVG file
  const svgSize = await writeSvgFile(paths.svg, options.svgSprite);

  // Write SCSS file
  const scssSize = await writeScssFile(paths.scss, {
    spriteImage: `./${options.outputName}.png`,
    spriteImage2x: `./${options.outputName}@2x.png`,
    spriteWidth: options.pngSprite.sheet.width,
    spriteHeight: options.pngSprite.sheet.height,
    icons: options.pngSprite.sheet.icons,
  });

  // Write JSON metadata file
  const jsonSize = await writeJsonFile(paths.json, {
    fileKey: options.fileKey,
    page: options.page,
    png: options.pngConfig,
    svg: options.svgConfig,
    pngSprite: {
      width: options.pngSprite.sheet.width,
      height: options.pngSprite.sheet.height,
      hash: options.pngSprite.sheet.hash,
      icons: options.pngSprite.sheet.icons,
    },
    svgSprite: {
      hash: options.svgSprite.hash,
      icons: options.svgSprite.icons,
    },
  });

  // Build result
  return {
    files: paths,
    hashes: {
      png: options.pngSprite.sheet.hash,
      svg: options.svgSprite.hash,
    },
    stats: {
      iconCount: options.pngSprite.sheet.icons.length,
      spriteWidth: options.pngSprite.sheet.width,
      spriteHeight: options.pngSprite.sheet.height,
      fileSize: {
        png: pngSizes.png,
        png2x: pngSizes.png2x,
        svg: svgSize,
        scss: scssSize,
        json: jsonSize,
      },
    },
  };
}

/**
 * Validate write output options
 *
 * @param options - Options to validate
 * @throws Error if options are invalid
 */
export function validateWriteOptions(options: WriteOutputOptions): void {
  if (!options.outputDir) {
    throw new Error('outputDir is required');
  }

  if (!options.outputName) {
    throw new Error('outputName is required');
  }

  if (!options.pngSprite) {
    throw new Error('pngSprite is required');
  }

  if (!options.svgSprite) {
    throw new Error('svgSprite is required');
  }

  if (!options.fileKey) {
    throw new Error('fileKey is required');
  }

  if (!options.page) {
    throw new Error('page is required');
  }
}
