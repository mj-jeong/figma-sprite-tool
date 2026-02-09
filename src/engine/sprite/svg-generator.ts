/**
 * SVG symbol sprite generator
 * Creates SVG sprite sheets using the symbol/use pattern with optional SVGO optimization
 */

import { optimize } from 'svgo';
import type { SvgIconData, SvgSpriteSheet } from '../types/sprite.js';
import { createProcessingError, ErrorCode } from '../../utils/errors.js';
import { createHash } from 'node:crypto';
import {
  extractViewBox,
  extractSvgInnerContent,
  parseViewBox,
  validateViewBox,
} from './viewbox-extractor.js';

/**
 * SVG sprite generation options
 */
export interface SvgGenerationOptions {
  /** Enable SVGO optimization (default: true) */
  optimize: boolean;
  /** SVGO plugins configuration */
  svgoPlugins?: any[];
  /** Pretty print output (default: false) */
  pretty?: boolean;
}

/**
 * Default SVG generation options
 */
const DEFAULT_SVG_OPTIONS: SvgGenerationOptions = {
  optimize: true,
  pretty: false,
};

const DEFAULT_PREVIEW_PADDING = 8;

/**
 * Default SVGO configuration for symbol sprites
 * Preserves viewBox and IDs needed for symbol usage
 */
const DEFAULT_SVGO_CONFIG = {
  plugins: [
    'preset-default',
    'removeDimensions',
    'removeStyleElement',
    'removeScriptElement',
    {
      name: 'removeViewBox',
      active: false, // CRITICAL: Preserve viewBox for symbols
    },
    {
      name: 'cleanupIds',
      params: {
        minify: false, // Preserve symbol IDs
      },
    },
  ],
};

/**
 * Generate SVG symbol sprite from icon data
 *
 * Creates an SVG sprite using the <symbol> element pattern,
 * which allows efficient reuse via <use href="#symbol-id"/>.
 *
 * @param svgIcons - SVG icon data with content and viewBox
 * @param options - Generation options
 * @returns SVG sprite sheet with content and hash
 * @throws SpriteError on generation failures
 *
 * @example
 * ```typescript
 * const sprite = await generateSvgSprite(svgIcons, { optimize: true });
 * await fs.writeFile('sprite.svg', sprite.content);
 * console.log(`Hash: ${sprite.hash}`);
 * ```
 */
export async function generateSvgSprite(
  svgIcons: SvgIconData[],
  options: Partial<SvgGenerationOptions> = {}
): Promise<SvgSpriteSheet> {
  const opts = { ...DEFAULT_SVG_OPTIONS, ...options };

  if (svgIcons.length === 0) {
    throw createProcessingError(
      ErrorCode.SVG_OPTIMIZATION_FAILED,
      'Cannot generate sprite from empty icon array',
      { iconCount: 0 }
    );
  }

  try {
    // Sort icons deterministically by ID
    const sortedIcons = [...svgIcons].sort((a, b) => a.id.localeCompare(b.id));
    const canvas = calculateSpriteCanvas(sortedIcons, {
      padding: DEFAULT_PREVIEW_PADDING,
    });

    // Build symbol elements
    const symbols = sortedIcons.map((icon) => {
      // Validate viewBox
      if (!validateViewBox(icon.viewBox)) {
        throw new Error(`Invalid viewBox for icon "${icon.id}": ${icon.viewBox}`);
      }

      // Extract inner SVG content (remove outer <svg> tag)
      const innerContent = extractSvgInnerContent(icon.content);

      // Create symbol element
      return `  <symbol id="${escapeXml(icon.id)}" viewBox="${escapeXml(icon.viewBox)}">\n    ${innerContent}\n  </symbol>`;
    });

    // Build complete SVG sprite
    const spriteContent = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`,
      ...symbols,
      '</svg>',
    ].join('\n');

    // Optimize if enabled
    let finalContent = spriteContent;

    if (opts.optimize) {
      try {
        const optimized = optimize(spriteContent, {
          ...DEFAULT_SVGO_CONFIG,
          plugins: opts.svgoPlugins || DEFAULT_SVGO_CONFIG.plugins,
        });

        finalContent = optimized.data;

        // If optimization removed all symbols, fall back to unoptimized content
        if (!finalContent.includes('<symbol')) {
          console.warn('SVGO removed all symbols; using unoptimized SVG sprite');
          finalContent = spriteContent;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // SVGO optimization failure is non-critical - use unoptimized version
        console.warn(`SVGO optimization failed: ${errorMessage}`);
        console.warn('Using unoptimized SVG sprite');
      }
    }

    // Pretty print if requested
    if (opts.pretty) {
      finalContent = formatSvgXml(finalContent);
    }

    // Calculate hash for change detection
    const hash = createHash('sha256').update(finalContent, 'utf-8').digest('hex').slice(0, 8);

    return {
      icons: sortedIcons,
      content: finalContent,
      hash,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw createProcessingError(
      ErrorCode.SVG_OPTIMIZATION_FAILED,
      `Failed to generate SVG sprite: ${errorMessage}`,
      {
        iconCount: svgIcons.length,
        error: errorMessage,
      }
    );
  }
}

/**
 * Generate an SVG preview document for a symbol sprite
 *
 * This creates a grid of <use> elements so the sprite can be previewed
 * in standard SVG viewers that do not render <symbol> directly.
 */
export function generateSvgSpritePreview(
  sprite: SvgSpriteSheet,
  options: { padding?: number; columns?: number } = {}
): string {
  const icons = sprite.icons;
  if (icons.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
  }

  const canvas = calculateSpriteCanvas(icons, options);

  const symbols = extractSvgInnerContent(sprite.content);

  const uses = icons.map((icon, index) => {
    const col = index % canvas.columns;
    const row = Math.floor(index / canvas.columns);
    const x = col * canvas.cellWidth + canvas.padding;
    const y = row * canvas.cellHeight + canvas.padding;
    const id = icon.id;
    const visual = getIconVisualSize(icon);
    const width = visual.width;
    const height = visual.height;
    return `  <use href="#${escapeXml(id)}" x="${x}" y="${y}" width="${width}" height="${height}" />`;
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`,
    '  <defs>',
    symbols,
    '  </defs>',
    ...uses,
    '</svg>',
  ].join('\n');
}

/**
 * Create SVG icon data from raw SVG buffer and metadata
 *
 * This is a helper function to convert exported SVG files
 * into the SvgIconData format required for sprite generation.
 *
 * @param id - Icon ID
 * @param buffer - SVG content buffer
 * @param width - Icon width
 * @param height - Icon height
 * @returns SVG icon data
 *
 * @example
 * ```typescript
 * const buffer = await fs.readFile('icon.svg');
 * const iconData = createSvgIconData('ic-home-24', buffer, 24, 24);
 * ```
 */
export function createSvgIconData(
  id: string,
  buffer: Buffer,
  width: number,
  height: number
): SvgIconData {
  const content = buffer.toString('utf-8');
  const viewBox = extractViewBox(content, width, height);

  return {
    id,
    content,
    viewBox,
    width,
    height,
  };
}

/**
 * Batch create SVG icon data from multiple buffers
 *
 * @param icons - Array of icon metadata with buffers
 * @returns Array of SVG icon data
 *
 * @example
 * ```typescript
 * const svgIcons = batchCreateSvgIconData([
 *   { id: 'ic-home-24', buffer, width: 24, height: 24 },
 *   { id: 'ic-search-24', buffer, width: 24, height: 24 }
 * ]);
 * ```
 */
export function batchCreateSvgIconData(
  icons: Array<{ id: string; buffer: Buffer; width: number; height: number }>
): SvgIconData[] {
  return icons.map((icon) =>
    createSvgIconData(icon.id, icon.buffer, icon.width, icon.height)
  );
}

/**
 * Validate SVG icon data before sprite generation
 *
 * Checks for common issues that would prevent successful sprite generation.
 *
 * @param svgIcons - Icons to validate
 * @returns Validation result with errors
 *
 * @example
 * ```typescript
 * const validation = validateSvgIcons(svgIcons);
 * if (!validation.valid) {
 *   console.error('Validation errors:', validation.errors);
 * }
 * ```
 */
export function validateSvgIcons(svgIcons: SvgIconData[]): {
  valid: boolean;
  errors: Array<{ id: string; message: string }>;
} {
  const errors: Array<{ id: string; message: string }> = [];

  for (const icon of svgIcons) {
    // Check ID
    if (!icon.id || icon.id.trim().length === 0) {
      errors.push({ id: icon.id, message: 'Icon ID is empty' });
    }

    // Check viewBox
    if (!validateViewBox(icon.viewBox)) {
      errors.push({
        id: icon.id,
        message: `Invalid viewBox: "${icon.viewBox}"`,
      });
    }

    // Check content
    if (!icon.content || icon.content.trim().length === 0) {
      errors.push({ id: icon.id, message: 'SVG content is empty' });
    }

    // Check dimensions
    if (icon.width <= 0 || icon.height <= 0) {
      errors.push({
        id: icon.id,
        message: `Invalid dimensions: ${icon.width}x${icon.height}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Escape XML special characters
 *
 * @param text - Text to escape
 * @returns Escaped text safe for XML attributes
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface SpriteCanvas {
  padding: number;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  width: number;
  height: number;
}

function calculateSpriteCanvas(
  icons: Array<{ width: number; height: number }>,
  options: { padding?: number; columns?: number } = {}
): SpriteCanvas {
  const padding = Math.max(0, options.padding ?? DEFAULT_PREVIEW_PADDING);
  const columns = Math.max(1, options.columns ?? Math.ceil(Math.sqrt(icons.length)));

  const maxWidth = Math.max(
    ...icons.map((icon) => getIconVisualSize(icon).width)
  );
  const maxHeight = Math.max(
    ...icons.map((icon) => getIconVisualSize(icon).height)
  );
  const cellWidth = Math.max(1, maxWidth + padding * 2);
  const cellHeight = Math.max(1, maxHeight + padding * 2);
  const rows = Math.max(1, Math.ceil(icons.length / columns));
  const width = columns * cellWidth;
  const height = rows * cellHeight;

  return {
    padding,
    columns,
    rows,
    cellWidth,
    cellHeight,
    width,
    height,
  };
}

function getIconVisualSize(icon: { width: number; height: number; viewBox?: string }): {
  width: number;
  height: number;
} {
  if (icon.viewBox) {
    try {
      const parsed = parseViewBox(icon.viewBox);
      return {
        width: Math.max(1, Math.ceil(parsed.width)),
        height: Math.max(1, Math.ceil(parsed.height)),
      };
    } catch {
      // Fall back to declared width/height
    }
  }

  return {
    width: Math.max(1, Math.ceil(icon.width)),
    height: Math.max(1, Math.ceil(icon.height)),
  };
}

/**
 * Format SVG XML with proper indentation (basic pretty print)
 *
 * @param xml - XML content to format
 * @returns Formatted XML
 */
function formatSvgXml(xml: string): string {
  // Basic XML formatting - add newlines after tags
  return xml
    .replace(/></g, '>\n<')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}
