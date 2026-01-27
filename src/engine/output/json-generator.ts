/**
 * JSON metadata generator for sprite.json
 * Creates machine-readable sprite metadata for change detection and CI automation
 */

import type { PackedIcon, SvgIconData, IconVariants } from '../types/sprite.js';

/**
 * JSON generation options
 */
export interface JsonGenerationOptions {
  /** Figma file key */
  fileKey: string;
  /** Figma page path */
  page: string;
  /** PNG configuration */
  png?: {
    scale: number;
    padding: number;
  };
  /** SVG configuration */
  svg?: {
    svgo: boolean;
  };
  /** PNG sprite information */
  pngSprite?: {
    width: number;
    height: number;
    hash: string;
    icons: PackedIcon[];
  };
  /** SVG sprite information */
  svgSprite?: {
    hash: string;
    icons: SvgIconData[];
  };
}

/**
 * sprite.json output schema
 * Following docs/1_PLAN.md specification
 */
export interface SpriteJsonOutput {
  meta: {
    fileKey: string;
    page: string;
    generatedAt: string;
    png?: {
      scale: number;
      padding: number;
    };
    svg?: {
      svgo: boolean;
    };
  };
  icons: {
    [id: string]: {
      nodeId: string;
      variants: IconVariants;
      png?: {
        x: number;
        y: number;
        w: number;
        h: number;
      };
      svg?: {
        symbolId: string;
        viewBox: string;
      };
      hash: {
        svg?: string;
        png?: string;
      };
    };
  };
}

/**
 * Generate ISO 8601 timestamp with timezone
 *
 * Format: "2026-01-26T17:30:00+09:00"
 *
 * @returns ISO 8601 timestamp string
 */
export function generateTimestamp(): string {
  const now = new Date();

  // Get timezone offset in minutes
  const timezoneOffset = -now.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
  const offsetMinutes = Math.abs(timezoneOffset) % 60;
  const offsetSign = timezoneOffset >= 0 ? '+' : '-';

  // Format timezone string
  const timezone = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

  // Get date components
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezone}`;
}

/**
 * Build icons manifest from sprite data
 *
 * Combines PNG and SVG icon data into unified manifest.
 * Icons are sorted alphabetically by ID for deterministic output.
 *
 * @param pngIcons - PNG sprite icons (optional)
 * @param svgIcons - SVG sprite icons (optional)
 * @param pngHash - PNG sprite hash (optional)
 * @param svgHash - SVG sprite hash (optional)
 * @returns Icon manifest object
 */
function buildIconsManifest(
  pngIcons: PackedIcon[] | undefined,
  svgIcons: SvgIconData[] | undefined,
  pngHash: string | undefined,
  svgHash: string | undefined
): SpriteJsonOutput['icons'] {
  const manifest: SpriteJsonOutput['icons'] = {};

  // Create map of SVG icons for lookup
  const svgMap = new Map<string, SvgIconData>();
  if (svgIcons) {
    for (const icon of svgIcons) {
      svgMap.set(icon.id, icon);
    }
  }

  // Process PNG icons (primary source of icon list)
  if (pngIcons) {
    for (const icon of pngIcons) {
      const svg = svgMap.get(icon.id);

      manifest[icon.id] = {
        nodeId: icon.nodeId,
        variants: icon.variants,
        png: {
          x: icon.x,
          y: icon.y,
          w: icon.width,
          h: icon.height,
        },
        svg: svg
          ? {
              symbolId: svg.id,
              viewBox: svg.viewBox,
            }
          : undefined,
        hash: {
          png: pngHash,
          svg: svg ? svgHash : undefined,
        },
      };

      // Remove from svgMap to track processed icons
      svgMap.delete(icon.id);
    }
  }

  // Process remaining SVG-only icons
  for (const [id, svg] of svgMap.entries()) {
    manifest[id] = {
      nodeId: '', // SVG-only icons don't have nodeId from PNG
      variants: { name: id }, // Minimal variants
      svg: {
        symbolId: svg.id,
        viewBox: svg.viewBox,
      },
      hash: {
        svg: svgHash,
      },
    };
  }

  return manifest;
}

/**
 * Sort icons manifest by ID
 *
 * Creates a new object with keys sorted alphabetically.
 * Required for deterministic JSON output.
 *
 * @param manifest - Unsorted manifest
 * @returns Sorted manifest
 */
function sortIconsManifest(manifest: SpriteJsonOutput['icons']): SpriteJsonOutput['icons'] {
  const sorted: SpriteJsonOutput['icons'] = {};
  const sortedKeys = Object.keys(manifest).sort((a, b) => a.localeCompare(b));

  for (const key of sortedKeys) {
    sorted[key] = manifest[key];
  }

  return sorted;
}

/**
 * Generate sprite.json metadata file
 *
 * Creates machine-readable metadata following docs/1_PLAN.md schema:
 * - ISO 8601 timestamp with timezone
 * - Alphabetically sorted icon entries
 * - Combined PNG and SVG information
 * - Content hashes for change detection
 * - Pretty printed with 2-space indent
 *
 * @param options - JSON generation options
 * @returns sprite.json content as string
 *
 * @example
 * ```typescript
 * const json = generateSpriteJson({
 *   fileKey: 'AbCdEf123456',
 *   page: 'Design System / Icons',
 *   png: { scale: 2, padding: 2 },
 *   pngSprite: { width: 1024, height: 512, hash: 'abc123', icons: [...] },
 *   svgSprite: { hash: 'def456', icons: [...] },
 * });
 * ```
 */
export function generateSpriteJson(options: JsonGenerationOptions): string {
  // Build metadata
  const metadata: SpriteJsonOutput = {
    meta: {
      fileKey: options.fileKey,
      page: options.page,
      generatedAt: generateTimestamp(),
      png: options.png,
      svg: options.svg,
    },
    icons: {},
  };

  // Build icons manifest
  const iconsManifest = buildIconsManifest(
    options.pngSprite?.icons,
    options.svgSprite?.icons,
    options.pngSprite?.hash,
    options.svgSprite?.hash
  );

  // Sort icons alphabetically
  metadata.icons = sortIconsManifest(iconsManifest);

  // Pretty print with 2-space indent
  return JSON.stringify(metadata, null, 2);
}

/**
 * Validate JSON generation options
 *
 * @param options - Options to validate
 * @throws Error if options are invalid
 */
export function validateJsonOptions(options: JsonGenerationOptions): void {
  if (!options.fileKey) {
    throw new Error('fileKey is required');
  }

  if (!options.page) {
    throw new Error('page is required');
  }

  if (!options.pngSprite && !options.svgSprite) {
    throw new Error('At least one sprite type (PNG or SVG) is required');
  }
}
