/**
 * Figma image exporter with parallel downloads
 * Exports PNG and SVG images from Figma nodes
 */

import type { ParsedIconNode } from '../types/figma.js';
import type { IconData, SvgIconData } from '../types/sprite.js';
import type { SpriteConfig } from '../types/config.js';
import { FigmaClient } from './client.js';
import { SpriteError, ErrorCode, createFigmaError } from '../../utils/errors.js';
import { groupByExportId } from './utils.js';

/**
 * Parallel download configuration
 */
export interface ParallelDownloadOptions {
  /** Maximum concurrent downloads */
  maxConcurrency: number;
  /** Batch size for export requests */
  batchSize: number;
}

/**
 * Default parallel download configuration
 */
const DEFAULT_PARALLEL_OPTIONS: ParallelDownloadOptions = {
  maxConcurrency: 5, // Respect Figma rate limits
  batchSize: 50, // Max node IDs per export request
};

/**
 * Export result with statistics
 */
export interface ExportResult<T> {
  /** Exported items */
  items: T[];
  /** Export statistics */
  stats: {
    total: number;
    successful: number;
    failed: number;
    duration: number;
  };
}

/**
 * Export PNG images from Figma nodes with parallel downloads
 *
 * @param client - Figma API client
 * @param fileKey - Figma file key
 * @param iconNodes - Icon nodes to export
 * @param iconMetadata - Icon ID to node mapping
 * @param scale - PNG scale factor (1 or 2)
 * @param options - Parallel download options
 * @returns Export result with icon data
 * @throws SpriteError on export failures
 *
 * @example
 * ```typescript
 * const result = await exportPngImages(
 *   client,
 *   'AbCdEf123456',
 *   iconNodes,
 *   iconMetadata,
 *   2, // 2x scale for retina
 *   { maxConcurrency: 5 }
 * );
 * console.log(`Exported ${result.stats.successful}/${result.stats.total} icons`);
 * ```
 */
export async function exportPngImages(
  client: FigmaClient,
  fileKey: string,
  iconNodes: ParsedIconNode[],
  iconMetadata: Map<string, ParsedIconNode>,
  scale: number,
  options: Partial<ParallelDownloadOptions> = {},
): Promise<ExportResult<IconData>> {
  const opts = { ...DEFAULT_PARALLEL_OPTIONS, ...options };
  const startTime = Date.now();

  // Group icons by exportId to avoid duplicate API calls
  const exportIdMap = groupByExportId(iconMetadata);

  // Create batches of unique export IDs only
  const uniqueExportIds = Array.from(exportIdMap.keys());
  const batches = createBatches(uniqueExportIds, opts.batchSize);

  const iconDataList: IconData[] = [];
  const errors: Array<{ nodeId: string; error: string }> = [];

  // Process batches sequentially to respect rate limits
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    try {
      // Request export URLs for batch
      const imagesResponse = await client.exportImages(fileKey, {
        ids: batch,
        format: 'png',
        scale,
        use_absolute_bounds: true,
      });

      // Download images in parallel (within batch)
      const downloadPromises = Object.entries(imagesResponse.images).map(async ([exportId, url]) => {
        if (!url) {
          errors.push({ nodeId: exportId, error: 'Export URL is null' });
          return [];
        }

        try {
          const buffer = await client.downloadImage(url);

          // Find ALL icons that share this exportId (multiple instances of same component)
          const iconIds = exportIdMap.get(exportId) || [];

          if (iconIds.length === 0) {
            errors.push({ nodeId: exportId, error: 'No icons found for this exportId' });
            return [];
          }

          // Create IconData for each icon sharing this exportId
          const iconDataArray: IconData[] = iconIds
            .map((iconId) => {
              const metadata = iconMetadata.get(iconId);
              if (!metadata) {
                // This should never happen as we built exportIdMap from iconMetadata
                console.warn(`⚠️  Icon metadata missing for ${iconId}`);
                return null;
              }
              return {
                id: iconId,
                name: metadata.name,
                nodeId: metadata.nodeId,
                variants: {}, // Will be populated by parser
                width: metadata.bounds.width,
                height: metadata.bounds.height,
                buffer,
              };
            })
            .filter((item): item is IconData => item !== null);

          return iconDataArray;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ nodeId: exportId, error: errorMessage });
          return [];
        }
      });

      // Wait for batch downloads with concurrency limit
      const batchResults = await parallelLimit(downloadPromises, opts.maxConcurrency);
      // Flatten the array of arrays (each download can return multiple IconData)
      const flatResults = batchResults.flat().filter((item): item is IconData => item !== null);
      iconDataList.push(...flatResults);
    } catch (error) {
      // Batch export failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      for (const nodeId of batch) {
        errors.push({ nodeId, error: errorMessage });
      }
    }
  }

  const duration = Date.now() - startTime;
  const stats = {
    total: iconMetadata.size,
    successful: iconDataList.length,
    failed: errors.length,
    duration,
  };

  // Log errors if any
  if (errors.length > 0) {
    console.warn(`Failed to export ${errors.length} icon(s):`);
    for (const { nodeId, error } of errors.slice(0, 5)) {
      console.warn(`  - ${nodeId}: ${error}`);
    }
    if (errors.length > 5) {
      console.warn(`  ... and ${errors.length - 5} more`);
    }
  }

  // Fail if all exports failed
  if (iconDataList.length === 0) {
    throw createFigmaError(ErrorCode.FIGMA_EXPORT_FAILED, 'All PNG exports failed', {
      total: stats.total,
      errors: errors.slice(0, 10),
    });
  }

  return {
    items: iconDataList,
    stats,
  };
}

/**
 * Export SVG images from Figma nodes with parallel downloads
 *
 * @param client - Figma API client
 * @param fileKey - Figma file key
 * @param iconNodes - Icon nodes to export
 * @param iconMetadata - Icon ID to node mapping
 * @param options - Parallel download options
 * @returns Export result with SVG icon data
 * @throws SpriteError on export failures
 *
 * @example
 * ```typescript
 * const result = await exportSvgImages(
 *   client,
 *   'AbCdEf123456',
 *   iconNodes,
 *   iconMetadata,
 *   { maxConcurrency: 5 }
 * );
 * ```
 */
export async function exportSvgImages(
  client: FigmaClient,
  fileKey: string,
  iconNodes: ParsedIconNode[],
  iconMetadata: Map<string, ParsedIconNode>,
  options: Partial<ParallelDownloadOptions> = {},
): Promise<ExportResult<SvgIconData>> {
  const opts = { ...DEFAULT_PARALLEL_OPTIONS, ...options };
  const startTime = Date.now();

  // Group icons by exportId to avoid duplicate API calls
  const exportIdMap = groupByExportId(iconMetadata);

  // Create batches of unique export IDs only
  const uniqueExportIds = Array.from(exportIdMap.keys());
  const batches = createBatches(uniqueExportIds, opts.batchSize);

  const svgDataList: SvgIconData[] = [];
  const errors: Array<{ nodeId: string; error: string }> = [];

  // Process batches sequentially
  for (const batch of batches) {
    try {
      // Request export URLs for batch
      const imagesResponse = await client.exportImages(fileKey, {
        ids: batch,
        format: 'svg',
        svg_include_id: true,
        svg_simplify_stroke: true,
      });

      // Download SVGs in parallel (within batch)
      const downloadPromises = Object.entries(imagesResponse.images).map(async ([exportId, url]) => {
        if (!url) {
          errors.push({ nodeId: exportId, error: 'Export URL is null' });
          return [];
        }

        try {
          const buffer = await client.downloadImage(url);
          const svgContent = buffer.toString('utf-8');

          // Find ALL icons that share this exportId (multiple instances of same component)
          const iconIds = exportIdMap.get(exportId) || [];

          if (iconIds.length === 0) {
            errors.push({ nodeId: exportId, error: 'No icons found for this exportId' });
            return [];
          }

          // Create SvgIconData for each icon sharing this exportId
          const svgDataArray: SvgIconData[] = iconIds
            .map((iconId) => {
              const metadata = iconMetadata.get(iconId);
              if (!metadata) {
                // This should never happen as we built exportIdMap from iconMetadata
                console.warn(`⚠️  Icon metadata missing for ${iconId}`);
                return null;
              }
              // Extract viewBox from SVG
              const viewBox = extractViewBox(svgContent, metadata.bounds.width, metadata.bounds.height);

              return {
                id: iconId,
                content: svgContent,
                viewBox,
                width: metadata.bounds.width,
                height: metadata.bounds.height,
              };
            })
            .filter((item): item is SvgIconData => item !== null);

          return svgDataArray;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ nodeId: exportId, error: errorMessage });
          return [];
        }
      });

      // Wait for batch downloads with concurrency limit
      const batchResults = await parallelLimit(downloadPromises, opts.maxConcurrency);
      // Flatten the array of arrays (each download can return multiple SvgIconData)
      const flatResults = batchResults.flat().filter((item): item is SvgIconData => item !== null);
      svgDataList.push(...flatResults);
    } catch (error) {
      // Batch export failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      for (const nodeId of batch) {
        errors.push({ nodeId, error: errorMessage });
      }
    }
  }

  const duration = Date.now() - startTime;
  const stats = {
    total: iconMetadata.size,
    successful: svgDataList.length,
    failed: errors.length,
    duration,
  };

  // Log errors if any
  if (errors.length > 0) {
    console.warn(`Failed to export ${errors.length} SVG(s):`);
    for (const { nodeId, error } of errors.slice(0, 5)) {
      console.warn(`  - ${nodeId}: ${error}`);
    }
    if (errors.length > 5) {
      console.warn(`  ... and ${errors.length - 5} more`);
    }
  }

  // Fail if all exports failed
  if (svgDataList.length === 0) {
    throw createFigmaError(ErrorCode.FIGMA_EXPORT_FAILED, 'All SVG exports failed', {
      total: stats.total,
      errors: errors.slice(0, 10),
    });
  }

  return {
    items: svgDataList,
    stats,
  };
}

/**
 * Create batches of items
 */
function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Execute promises in parallel with concurrency limit
 */
async function parallelLimit<T>(promises: Promise<T>[], limit: number): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const promise of promises) {
    const p = promise.then((result) => {
      results.push(result);
      executing.splice(executing.indexOf(p), 1);
    });

    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Extract viewBox attribute from SVG content
 * Falls back to dimensions if viewBox not found
 */
function extractViewBox(svgContent: string, width: number, height: number): string {
  const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/);

  if (viewBoxMatch) {
    return viewBoxMatch[1];
  }

  // Fallback: create viewBox from dimensions
  return `0 0 ${Math.round(width)} ${Math.round(height)}`;
}

/**
 * Export both PNG and SVG images based on config
 *
 * @param client - Figma API client
 * @param fileKey - Figma file key
 * @param iconNodes - Icon nodes to export
 * @param iconMetadata - Icon ID to node mapping
 * @param config - Sprite configuration
 * @returns Export results for both formats
 *
 * @example
 * ```typescript
 * const { png, svg } = await exportImages(
 *   client,
 *   'AbCdEf123456',
 *   iconNodes,
 *   iconMetadata,
 *   config
 * );
 * ```
 */
export async function exportImages(
  client: FigmaClient,
  fileKey: string,
  iconNodes: ParsedIconNode[],
  iconMetadata: Map<string, ParsedIconNode>,
  config: SpriteConfig,
): Promise<{
  png?: ExportResult<IconData>;
  svg?: ExportResult<SvgIconData>;
}> {
  const results: {
    png?: ExportResult<IconData>;
    svg?: ExportResult<SvgIconData>;
  } = {};

  // Export PNG if enabled
  if (config.formats.png.enabled) {
    results.png = await exportPngImages(
      client,
      fileKey,
      iconNodes,
      iconMetadata,
      config.formats.png.scale,
    );
  }

  // Export SVG if enabled
  if (config.formats.svg.enabled) {
    results.svg = await exportSvgImages(
      client,
      fileKey,
      iconNodes,
      iconMetadata,
    );
  }

  return results;
}
