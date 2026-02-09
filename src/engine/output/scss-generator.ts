/**
 * SCSS mixin generator using Handlebars templates
 * Generates sprite.scss with legacy @import support and retina media queries
 */

import Handlebars from 'handlebars';
import { readFile } from '../../utils/fs.js';
import { createOutputError, ErrorCode } from '../../utils/errors.js';
import { resolvePath, getDirname } from '../../utils/path.js';
import { fileURLToPath } from 'node:url';
import type { PackedIcon } from '../types/sprite.js';

/**
 * SCSS generation options
 */
export interface ScssGenerationOptions {
  /** Sprite image filename (e.g., "./sprite.png") */
  spriteImage: string;
  /** Retina sprite image filename (e.g., "./sprite@2x.png") */
  spriteImage2x: string;
  /** Total sprite width in pixels */
  spriteWidth: number;
  /** Total sprite height in pixels */
  spriteHeight: number;
  /** Packed icons with positions */
  icons: PackedIcon[];
}

/**
 * SCSS template data
 */
interface ScssTemplateData {
  spriteImage: string;
  spriteImage2x: string;
  spriteWidth: number;
  spriteHeight: number;
  icons: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
}

// Cache compiled template
let compiledTemplate: HandlebarsTemplateDelegate<ScssTemplateData> | null = null;

/**
 * Load and compile SCSS template
 *
 * Template is loaded from src/templates/scss/sprite.scss.hbs
 * and cached for reuse.
 *
 * @returns Compiled Handlebars template
 * @throws SpriteError if template loading fails
 */
async function loadTemplate(): Promise<HandlebarsTemplateDelegate<ScssTemplateData>> {
  if (compiledTemplate) {
    return compiledTemplate;
  }

  try {
    // Get template path relative to this file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = getDirname(__filename);
    const candidatePaths = [
      // When running from built dist (templates copied next to dist)
      resolvePath('./templates/scss/sprite.scss.hbs', process.cwd()),
      // When running from source tree
      resolvePath('./src/templates/scss/sprite.scss.hbs', process.cwd()),
      // Fallback to relative path from this file (dev)
      resolvePath('../../templates/scss/sprite.scss.hbs', __dirname),
    ];

    let templateContent: string | null = null;
    let lastError: unknown = null;
    for (const candidate of candidatePaths) {
      try {
        templateContent = await readFile(candidate);
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!templateContent) {
      throw lastError instanceof Error ? lastError : new Error('Template not found');
    }

    // Compile template
    compiledTemplate = Handlebars.compile(templateContent, {
      strict: true,
      noEscape: true, // SCSS doesn't need HTML escaping
    });

    return compiledTemplate;
  } catch (error) {
    throw createOutputError(
      ErrorCode.TEMPLATE_ERROR,
      'Failed to load SCSS template',
      {
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
}

/**
 * Transform icon data for template rendering
 *
 * Converts PackedIcon[] to template format with numeric values.
 * Icons are sorted alphabetically by ID for deterministic output.
 *
 * @param icons - Packed icons with positions
 * @returns Template-ready icon data
 */
function transformIconData(icons: PackedIcon[]): ScssTemplateData['icons'] {
  return icons
    .map((icon) => ({
      id: icon.id,
      x: icon.x,
      y: icon.y,
      w: icon.width,
      h: icon.height,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Generate SCSS sprite file content
 *
 * Creates sprite.scss following the specification:
 * - Legacy @import support (no @use)
 * - SCSS map for icon coordinates
 * - @mixin sprite-icon with error handling
 * - Retina media query support
 * - Relative paths for sprite images
 *
 * @param options - SCSS generation options
 * @returns Generated SCSS content
 * @throws SpriteError on template errors
 *
 * @example
 * ```typescript
 * const scss = await generateScss({
 *   spriteImage: './sprite.png',
 *   spriteImage2x: './sprite@2x.png',
 *   spriteWidth: 1024,
 *   spriteHeight: 512,
 *   icons: packedIcons,
 * });
 * ```
 */
export async function generateScss(options: ScssGenerationOptions): Promise<string> {
  try {
    // Load template
    const template = await loadTemplate();

    // Transform icon data
    const icons = transformIconData(options.icons);

    // Prepare template data
    const data: ScssTemplateData = {
      spriteImage: options.spriteImage,
      spriteImage2x: options.spriteImage2x,
      spriteWidth: options.spriteWidth,
      spriteHeight: options.spriteHeight,
      icons,
    };

    // Render template
    const scss = template(data);

    return scss;
  } catch (error) {
    if (error instanceof Error && error.name === 'SpriteError') {
      throw error;
    }

    throw createOutputError(
      ErrorCode.TEMPLATE_ERROR,
      'Failed to generate SCSS',
      {
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
}

/**
 * Validate SCSS generation options
 *
 * @param options - Options to validate
 * @throws SpriteError if options are invalid
 */
export function validateScssOptions(options: ScssGenerationOptions): void {
  if (!options.spriteImage) {
    throw createOutputError(ErrorCode.TEMPLATE_ERROR, 'spriteImage is required');
  }

  if (!options.spriteImage2x) {
    throw createOutputError(ErrorCode.TEMPLATE_ERROR, 'spriteImage2x is required');
  }

  if (options.spriteWidth <= 0 || options.spriteHeight <= 0) {
    throw createOutputError(ErrorCode.TEMPLATE_ERROR, 'Sprite dimensions must be positive');
  }

  if (!options.icons || options.icons.length === 0) {
    throw createOutputError(ErrorCode.TEMPLATE_ERROR, 'Icons array cannot be empty');
  }
}
