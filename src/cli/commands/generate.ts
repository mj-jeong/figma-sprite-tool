/**
 * Generate command implementation
 * Orchestrates all phases of sprite generation
 */

import { loadConfig } from '../../engine/config/index.js';
import {
  createFigmaClient,
  parseIconNodes,
  createIconMetadata,
  exportPngImages,
  exportSvgImages,
} from '../../engine/figma/index.js';
import {
  packIconsWithPositions,
  calculateSpriteDimensions,
  generatePngSpriteSheet,
  generateSvgSprite,
  generateSvgSpritePreview,
  parseViewBox,
} from '../../engine/sprite/index.js';
import { writeOutput } from '../../engine/output/index.js';
import { createLogger, createProgressTracker, handleError, formatSize, formatDuration, formatPercentage } from '../output/index.js';
import type { SpriteConfig } from '../../engine/types/index.js';
import type { IconData, SvgIconData } from '../../engine/types/sprite.js';
import type { ParsedIconNode } from '../../engine/types/figma.js';
import pc from 'picocolors';
import sharp from 'sharp';

/**
 * Options for generate command
 */
export interface GenerateOptions {
  config?: string;
  output?: string;
  verbose?: boolean;
  dryRun?: boolean;
}

/**
 * Sanitize page name for safe directory usage across platforms.
 */
export function sanitizePageDir(page: string): string {
  const trimmed = page.trim();
  if (!trimmed) {
    return 'unknown-page';
  }

  return trimmed
    .replace(/[\\/]+/g, ' ')
    .replace(/[:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown-page';
}

/**
 * Resolve final output directory as {baseDir}/{sanitizedPage}
 */
export function resolvePageOutputDir(baseDir: string, page: string): string {
  const safePage = sanitizePageDir(page);
  return `${baseDir}/${safePage}`;
}

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  const epsilon = 0.01;
  return (
    a.x < b.x + b.width - epsilon &&
    a.x + a.width > b.x + epsilon &&
    a.y < b.y + b.height - epsilon &&
    a.y + a.height > b.y + epsilon
  );
}

function assertNoPackedOverlap(icons: Array<{ id: string; x: number; y: number; width: number; height: number }>): void {
  const overlaps: string[] = [];
  for (let i = 0; i < icons.length; i += 1) {
    for (let j = i + 1; j < icons.length; j += 1) {
      const a = icons[i];
      const b = icons[j];
      if (!a || !b) {
        continue;
      }
      if (intersects(a, b)) {
        overlaps.push(
          `"${a.id}" (${a.x},${a.y},${a.width}x${a.height}) and "${b.id}" (${b.x},${b.y},${b.width}x${b.height})`,
        );
      }
    }
  }

  if (overlaps.length > 0) {
    const preview = overlaps.slice(0, 5).join('; ');
    console.warn(
      `Packed icon overlap warning (${overlaps.length}): ${preview}${overlaps.length > 5 ? ' ...' : ''}`,
    );
  }
}

function normalizeSize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Math.ceil(value);
}

function getSvgRenderSize(icon: SvgIconData): { width: number; height: number } {
  try {
    const parsed = parseViewBox(icon.viewBox);
    return {
      width: normalizeSize(parsed.width),
      height: normalizeSize(parsed.height),
    };
  } catch {
    return {
      width: normalizeSize(icon.width),
      height: normalizeSize(icon.height),
    };
  }
}

export async function rasterizeSvgIconsForPng(
  svgIcons: SvgIconData[],
  iconMetadata: Map<string, ParsedIconNode>,
  scale: number,
): Promise<IconData[]> {
  const normalizedScale = Math.max(1, Math.ceil(scale));

  const pngIcons = await Promise.all(
    svgIcons.map(async (svgIcon) => {
      const metadata = iconMetadata.get(svgIcon.id);
      if (!metadata) {
        throw new Error(`Missing metadata for icon: ${svgIcon.id}`);
      }

      const renderSize = getSvgRenderSize(svgIcon);
      const renderWidth = normalizeSize(renderSize.width * normalizedScale);
      const renderHeight = normalizeSize(renderSize.height * normalizedScale);

      const buffer = await sharp(Buffer.from(svgIcon.content, 'utf-8'))
        .resize(renderWidth, renderHeight, { fit: 'fill' })
        .png()
        .toBuffer();

      return {
        id: svgIcon.id,
        name: metadata.name,
        nodeId: metadata.nodeId,
        variants: {},
        width: renderSize.width,
        height: renderSize.height,
        buffer,
      };
    }),
  );

  return pngIcons;
}

/**
 * Get Figma token from environment or config
 */
function getFigmaToken(config: SpriteConfig): string {
  // Check config first
  if (config.figma.personalAccessToken) {
    return config.figma.personalAccessToken;
  }

  // Check environment variable
  const token = process.env.FIGMA_TOKEN;
  if (!token) {
    throw new Error(
      'Figma token not found. Set FIGMA_TOKEN environment variable or add personalAccessToken to config.',
    );
  }

  return token;
}

/**
 * Generate command handler
 * Main entry point for sprite generation
 */
export async function generateCommand(options: GenerateOptions): Promise<void> {
  const startTime = Date.now();
  const logger = createLogger(options.verbose ?? false);
  const progress = createProgressTracker();

  try {
    // Phase 1: Load configuration
    progress.start('Loading configuration');
    const configPath = options.config ?? 'figma.sprite.config.json';
    const config = await loadConfig({ configPath });

    if (options.verbose) {
      logger.debug(`Config path: ${configPath}`);
      logger.debug(`Figma file key: ${config.figma.fileKey}`);
      logger.debug(`Target page: ${config.figma.page}`);
      logger.debug(`Scope: ${config.figma.scope.type} = "${config.figma.scope.value}"`);
    }

    progress.succeed(`Configuration loaded from ${configPath}`);

    // Resolve output base directory with backward compatibility
    const outputBaseDir = options.output || config.output.dir || 'assets/sprite';
    const outputName = config.output.name || 'sprite';
    const outputDir = resolvePageOutputDir(outputBaseDir, config.figma.page);

    // Get Figma token
    const token = getFigmaToken(config);

    // Phase 2: Fetch from Figma API
    progress.start('Fetching from Figma API');
    const client = createFigmaClient(token);

    if (options.verbose) {
      logger.debug(`Requesting file: ${config.figma.fileKey}`);
    }

    const fileData = await client.getFile(config.figma.fileKey);
    progress.update('Parsing icon nodes');

    const icons = parseIconNodes(fileData, config);

    if (icons.length === 0) {
      progress.fail('No icons found matching the scope criteria');
      logger.warn('Check your config: figma.page and figma.scope settings');
      return;
    }

    if (options.verbose) {
      logger.debug(`Icons found: ${icons.length}`);
    }

    progress.succeed(`Fetched ${icons.length} icons from "${config.figma.page}"`);

    // Phase 3: Export images
    progress.start('Exporting images from Figma');
    const iconMetadata = createIconMetadata(icons, config);
    let iconData: IconData[] = [];
    let svgIconData: SvgIconData[] = [];
    let pngFailures: Array<{
      format: 'png' | 'svg';
      exportId: string;
      iconIds: string[];
      nodeIds: string[];
      reason: string;
    }> = [];
    let svgFailures: Array<{
      format: 'png' | 'svg';
      exportId: string;
      iconIds: string[];
      nodeIds: string[];
      reason: string;
    }> = [];

    // Export SVG first when enabled so PNG can be rasterized from same source
    if (config.formats.svg.enabled) {
      const svgResult = await exportSvgImages(client, config.figma.fileKey, icons, iconMetadata);
      svgIconData = svgResult.items;
      svgFailures = svgResult.failures;
    }

    if (config.formats.png.enabled) {
      if (config.formats.svg.enabled && svgIconData.length > 0) {
        iconData = await rasterizeSvgIconsForPng(
          svgIconData,
          iconMetadata,
          config.formats.png.scale ?? 1,
        );
      } else {
        const pngResult = await exportPngImages(
          client,
          config.figma.fileKey,
          icons,
          iconMetadata,
          config.formats.png.scale,
        );
        iconData = pngResult.items;
        pngFailures = pngResult.failures;
      }
    }

    const allFailures = [...pngFailures, ...svgFailures];

    if (options.verbose) {
      const pngSize = iconData.reduce((sum, icon) => sum + icon.buffer.length, 0);
      const svgSize = svgIconData.reduce((sum, icon) => sum + icon.content.length, 0);
      logger.debug(`Total exported size: ${formatSize(pngSize + svgSize)}`);

      const playSvg = svgIconData.find((icon) => icon.id === 'h80-play');
      const playPng = iconData.find((icon) => icon.id === 'h80-play');
      if (playSvg) {
        logger.debug(`h80-play SVG viewBox: ${playSvg.viewBox}`);
      }
      if (playPng) {
        logger.debug(`h80-play PNG size: ${playPng.width}x${playPng.height}`);
      }
    }

    progress.succeed(`Exported ${iconData.length} icons`);

    if (allFailures.length > 0) {
      logger.warn(`Some assets failed to export (${allFailures.length}).`);
      for (const failure of allFailures.slice(0, 10)) {
        const iconLabel = failure.iconIds.length > 0 ? failure.iconIds.join(', ') : '(unknown icon)';
        logger.warn(
          `[${failure.format}] exportId=${failure.exportId} icons=${iconLabel} reason=${failure.reason}`,
        );
      }
      if (allFailures.length > 10) {
        logger.warn(`... and ${allFailures.length - 10} more failed asset(s).`);
      }
    }

    // Phase 4: Generate PNG sprites
    progress.start('Generating PNG sprites');
    const padding = config.formats.png.padding ?? 2;
    const packedIcons = packIconsWithPositions(iconData, padding);
    assertNoPackedOverlap(packedIcons);
    const { width, height } = calculateSpriteDimensions(iconData, padding);

    const inputScale = config.formats.png.scale ?? 1;
    const standardSprite = await generatePngSpriteSheet(packedIcons, width, height, 1, inputScale);
    const retinaSprite = config.formats.png.scale === 2
      ? await generatePngSpriteSheet(packedIcons, width, height, 2, inputScale)
      : undefined;

    const totalPixels = width * height;
    const usedPixels = packedIcons.reduce((sum, icon) => {
      return sum + icon.width * icon.height;
    }, 0);
    const efficiency = (usedPixels / totalPixels) * 100;

    if (options.verbose) {
      logger.debug(`Sprite dimensions: ${width}x${height}`);
      logger.debug(`Packing efficiency: ${formatPercentage(efficiency)}`);
    }

    progress.succeed(
      `PNG sprites generated (${width}x${height}, ${formatPercentage(efficiency)} efficiency)`,
    );

    // Phase 5: Generate SVG sprite
    progress.start('Generating SVG sprite');
    const svgSprite = await generateSvgSprite(svgIconData, {
      optimize: config.formats.svg.svgo ?? true,
    });

    if (options.verbose) {
      logger.debug(`SVG sprite size: ${formatSize(svgSprite.content.length)}`);
    }

    progress.succeed('SVG sprite generated');

    // Dry run mode - preview only
    if (options.dryRun) {
      logger.info('Dry run mode - no files will be written');
      console.log();
      console.log(pc.bold('Output preview:'));

      console.log(
        pc.dim(`  ${outputDir}/${outputName}.png`),
        pc.green(`(${formatSize(standardSprite.buffer.length)})`),
      );
      if (retinaSprite) {
        console.log(
          pc.dim(`  ${outputDir}/${outputName}@2x.png`),
          pc.green(`(${formatSize(retinaSprite.buffer.length)})`),
        );
      }
      console.log(
        pc.dim(`  ${outputDir}/${outputName}.svg`),
        pc.green(`(${formatSize(svgSprite.content.length)})`),
      );
      const svgPreview = generateSvgSpritePreview(svgSprite);
      console.log(
        pc.dim(`  ${outputDir}/${outputName}.preview.svg`),
        pc.green(`(${formatSize(svgPreview.length)})`),
      );
      console.log(pc.dim(`  ${outputDir}/${outputName}.scss`), pc.green('(~3-5 KB)'));
      console.log(pc.dim(`  ${outputDir}/mixins.scss`), pc.green('(~3-8 KB)'));
      console.log(pc.dim(`  ${outputDir}/${outputName}.json`), pc.green('(~5-10 KB)'));

      console.log();
      const duration = Date.now() - startTime;
      logger.success(`Dry run complete! (${formatDuration(duration)})`);
      return;
    }

    // Phase 6: Write output files
    progress.start('Writing output files');
    const result = await writeOutput({
      outputDir,
      outputName,
      pngSprite: {
        buffer: standardSprite.buffer,
        sheet: standardSprite,
      },
      pngSprite2x: retinaSprite
        ? {
            buffer: retinaSprite.buffer,
            sheet: retinaSprite,
          }
        : undefined,
      svgSprite,
      fileKey: config.figma.fileKey,
      page: config.figma.page,
      pngConfig: {
        scale: inputScale,
        padding,
      },
      svgConfig: {
        svgo: config.formats.svg.svgo,
      },
      failedAssets: allFailures.map((failure) => ({
        format: failure.format,
        exportId: failure.exportId,
        iconIds: failure.iconIds,
        nodeIds: failure.nodeIds,
        reason: failure.reason,
      })),
    });

    if (options.verbose) {
      logger.debug(`Files written to: ${outputDir}`);
    }

    if (result.effectiveOutputName !== outputName) {
      logger.warn(
        `Output name "${outputName}" already existed. Generated with "${result.effectiveOutputName}".`,
      );
    }

    // Display file sizes
    console.log();
    for (const [filename, size] of Object.entries(result.stats.fileSize)) {
      logger.success(`${filename} ${pc.green(`(${formatSize(size)})`)}`);
    }

    console.log();
    const duration = Date.now() - startTime;
    logger.success(`Sprite generation complete! ${pc.dim(`(${formatDuration(duration)})`)}`);
  } catch (error) {
    progress.fail('Generation failed');
    handleError(error);
  }
}
