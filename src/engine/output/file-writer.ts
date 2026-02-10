/**
 * File writer for sprite outputs
 * Coordinates writing of all output files with Windows path compatibility
 */

import { writeFile, ensureDir, fileExists } from '../../utils/fs.js';
import { resolvePath, joinPath, normalizePath } from '../../utils/path.js';
import type { SpriteSheet, SvgSpriteSheet } from '../types/sprite.js';
import { generateSvgSpritePreview } from '../sprite/svg-generator.js';
import { generateScss, generateMixins, type ScssGenerationOptions } from './scss-generator.js';
import { generateSpriteJson, type JsonGenerationOptions } from './json-generator.js';
import { parseViewBox } from '../sprite/viewbox-extractor.js';

/**
 * Default padding for SVG preview sprite (matches svg-generator.ts)
 */
const DEFAULT_PREVIEW_PADDING = 8;

/**
 * SVG preview icon coordinate
 */
interface SvgPreviewIconCoordinate {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Calculate SVG preview grid layout coordinates
 *
 * Reuses the same grid layout logic as generateSvgSpritePreview():
 * - Grid layout with uniform cells
 * - Sequential placement by index
 * - Column-major ordering
 *
 * @param icons - SVG icon data
 * @param options - Layout options (padding, columns)
 * @returns Array of icon coordinates in grid layout
 */
function calculateSvgPreviewCoordinates(
  icons: Array<{ id: string; width: number; height: number; viewBox: string }>,
  options: { padding?: number; columns?: number } = {}
): SvgPreviewIconCoordinate[] {
  const padding = Math.max(0, options.padding ?? DEFAULT_PREVIEW_PADDING);
  const columns = Math.max(1, options.columns ?? Math.ceil(Math.sqrt(icons.length)));

  // Calculate cell size based on maximum icon dimensions
  const maxWidth = Math.max(...icons.map((icon) => {
    try {
      const parsed = parseViewBox(icon.viewBox);
      return Math.max(1, Math.ceil(parsed.width));
    } catch {
      return icon.width;
    }
  }));

  const maxHeight = Math.max(...icons.map((icon) => {
    try {
      const parsed = parseViewBox(icon.viewBox);
      return Math.max(1, Math.ceil(parsed.height));
    } catch {
      return icon.height;
    }
  }));

  const cellWidth = Math.max(1, maxWidth + padding * 2);
  const cellHeight = Math.max(1, maxHeight + padding * 2);

  // Calculate grid position for each icon
  return icons.map((icon, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = col * cellWidth + padding;
    const y = row * cellHeight + padding;

    // Use viewBox for accurate dimensions
    let width = icon.width;
    let height = icon.height;
    try {
      const parsed = parseViewBox(icon.viewBox);
      width = Math.max(1, Math.ceil(parsed.width));
      height = Math.max(1, Math.ceil(parsed.height));
    } catch {
      // Fall back to declared dimensions
    }

    return {
      id: icon.id,
      x,
      y,
      w: width,
      h: height,
    };
  });
}

/**
 * Output file paths
 */
export interface OutputFilePaths {
  /** PNG sprite file path (1x) */
  png: string;
  /** PNG sprite file path (2x) */
  png2x: string;
  /** PNG preview file path (from SVG sprite) */
  pngPreview: string;
  /** SVG sprite file path */
  svg: string;
  /** SVG sprite preview file path */
  svgPreview: string;
  /** SCSS mixin file path */
  scss: string;
  /** SCSS mixins file path */
  mixins: string;
  /** JSON metadata file path */
  json: string;
}

/**
 * Output result with file information
 */
export interface OutputResult {
  /** Generated file paths */
  files: OutputFilePaths;
  /** Actual output name used (collision-safe) */
  effectiveOutputName: string;
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
      pngPreview: number;
      svg: number;
      svgPreview: number;
      scss: number;
      mixins: number;
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
  /** PNG preview from SVG sprite (optional) */
  pngPreview?: {
    buffer: Buffer;
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
  /** Failed assets during export (optional) */
  failedAssets?: Array<{
    format: 'png' | 'svg';
    exportId: string;
    iconIds: string[];
    nodeIds: string[];
    reason: string;
  }>;
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
    pngPreview: normalizePath(joinPath(dir, `${outputName}.preview.png`)),
    svg: normalizePath(joinPath(dir, `${outputName}.svg`)),
    svgPreview: normalizePath(joinPath(dir, `${outputName}.preview.svg`)),
    scss: normalizePath(joinPath(dir, `${outputName}.scss`)),
    mixins: normalizePath(joinPath(dir, `mixins.scss`)),
    json: normalizePath(joinPath(dir, `${outputName}.json`)),
  };
}

async function hasCollision(paths: OutputFilePaths): Promise<boolean> {
  const candidates = [paths.png, paths.png2x, paths.svg, paths.svgPreview, paths.scss, paths.json];
  for (const filePath of candidates) {
    if (await fileExists(filePath)) {
      return true;
    }
  }
  return false;
}

async function resolveAvailableOutputName(outputDir: string, outputName: string): Promise<string> {
  let index = 0;

  while (true) {
    const candidateName = index === 0 ? outputName : `${outputName}(${index})`;
    const candidatePaths = buildOutputPaths(outputDir, candidateName);
    if (!(await hasCollision(candidatePaths))) {
      return candidateName;
    }
    index += 1;
  }
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
 * Write SVG preview file
 *
 * @param path - SVG preview file path
 * @param svgSprite - SVG sprite data
 * @returns File size in bytes
 */
async function writeSvgPreviewFile(path: string, svgSprite: SvgSpriteSheet): Promise<number> {
  const preview = generateSvgSpritePreview(svgSprite);
  await writeFile(path, preview);
  return Buffer.byteLength(preview, 'utf-8');
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
 * Write SCSS mixins file
 *
 * @param path - SCSS mixins file path
 * @param options - SCSS generation options
 * @returns File size in bytes
 */
async function writeMixinsFile(path: string, options: ScssGenerationOptions): Promise<number> {
  const scss = await generateMixins(options);
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

  const effectiveOutputName = await resolveAvailableOutputName(options.outputDir, options.outputName);

  // Build output file paths
  const paths = buildOutputPaths(options.outputDir, effectiveOutputName);

  // Write PNG files
  const pngSizes = await writePngFiles(
    paths,
    options.pngSprite.buffer,
    options.pngSprite2x?.buffer
  );

  // Write PNG preview file (from SVG sprite)
  let pngPreviewSize = 0;
  if (options.pngPreview) {
    await writeFile(paths.pngPreview, options.pngPreview.buffer);
    pngPreviewSize = options.pngPreview.buffer.length;
  }

  // Write SVG file
  const svgSize = await writeSvgFile(paths.svg, options.svgSprite);
  const svgPreviewSize = await writeSvgPreviewFile(paths.svgPreview, options.svgSprite);

  // Calculate SVG preview grid layout coordinates
  const svgPreviewCoords = calculateSvgPreviewCoordinates(
    options.svgSprite.icons,
    {
      padding: DEFAULT_PREVIEW_PADDING,
      columns: Math.ceil(Math.sqrt(options.svgSprite.icons.length)),
    }
  );

  // Extract SVG preview dimensions from sprite content
  const svgPreviewViewBoxMatch = options.svgSprite.content.match(/viewBox=["']([^"']+)["']/);
  const svgPreviewViewBox = svgPreviewViewBoxMatch
    ? parseViewBox(svgPreviewViewBoxMatch[1])
    : { x: 0, y: 0, width: 0, height: 0 };

  // Write SCSS file
  const scssSize = await writeScssFile(paths.scss, {
    spriteImage: `./${effectiveOutputName}.png`,
    spriteImage2x: `./${effectiveOutputName}@2x.png`,
    spriteWidth: options.pngSprite.sheet.width,
    spriteHeight: options.pngSprite.sheet.height,
    icons: options.pngSprite.sheet.icons,
    svgPreview: {
      spriteImage: `./${effectiveOutputName}.preview.png`,
      spriteWidth: svgPreviewViewBox.width,
      spriteHeight: svgPreviewViewBox.height,
      icons: svgPreviewCoords,
    },
  });
  const mixinsSize = await writeMixinsFile(paths.mixins, {
    spriteImage: `./${effectiveOutputName}.png`,
    spriteImage2x: `./${effectiveOutputName}@2x.png`,
    spriteWidth: options.pngSprite.sheet.width,
    spriteHeight: options.pngSprite.sheet.height,
    icons: options.pngSprite.sheet.icons,
    svgPreview: {
      spriteImage: `./${effectiveOutputName}.preview.png`,
      spriteWidth: svgPreviewViewBox.width,
      spriteHeight: svgPreviewViewBox.height,
      icons: svgPreviewCoords,
    },
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
    svgPreview: {
      width: svgPreviewViewBox.width,
      height: svgPreviewViewBox.height,
      icons: svgPreviewCoords,
    },
    failedAssets: options.failedAssets,
  });

  // Build result
  return {
    files: paths,
    effectiveOutputName,
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
        pngPreview: pngPreviewSize,
        svg: svgSize,
        svgPreview: svgPreviewSize,
        scss: scssSize,
        mixins: mixinsSize,
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
