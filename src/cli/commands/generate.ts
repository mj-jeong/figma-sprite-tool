/**
 * Generate command implementation
 * Orchestrates all phases of sprite generation
 */

import { loadConfig } from '../../engine/config/index.js';
import { createFigmaClient, parseIconNodes, exportImages } from '../../engine/figma/index.js';
import {
  packIconsWithPositions,
  generatePngSprites,
  generateSvgSprite,
  batchCreateSvgIconData,
} from '../../engine/sprite/index.js';
import { writeOutput } from '../../engine/output/index.js';
import { createLogger, createProgressTracker, handleError, formatSize, formatDuration, formatPercentage } from '../output/index.js';
import type { SpriteConfig } from '../../engine/types/index.js';
import pc from 'picocolors';

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

    // Override output directory if specified
    if (options.output) {
      config.output.directory = options.output;
    }

    // Get Figma token
    const token = getFigmaToken(config);

    // Phase 2: Fetch from Figma API
    progress.start('Fetching from Figma API');
    const client = createFigmaClient({ personalAccessToken: token });

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
    const iconData = await exportImages(client, icons, config);

    if (options.verbose) {
      const totalSize = iconData.reduce((sum, icon) => {
        return sum + (icon.pngBuffer?.length ?? 0) + (icon.svgContent?.length ?? 0);
      }, 0);
      logger.debug(`Total exported size: ${formatSize(totalSize)}`);
    }

    progress.succeed(`Exported ${iconData.length} icons`);

    // Phase 4: Generate PNG sprites
    progress.start('Generating PNG sprites');
    const packed = packIconsWithPositions(iconData, config.formats.png.padding ?? 2);

    const pngSprites = await generatePngSprites(iconData, packed, {
      scale: config.formats.png.scale ?? 2,
      padding: config.formats.png.padding ?? 2,
      background: config.formats.png.background,
    });

    const { width, height } = packed.dimensions;
    const totalPixels = width * height;
    const usedPixels = packed.packedIcons.reduce((sum, icon) => {
      return sum + icon.iconData.width * icon.iconData.height;
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
    const svgIconData = batchCreateSvgIconData(iconData);
    const svgSprite = await generateSvgSprite(svgIconData, {
      optimize: config.formats.svg.optimize ?? true,
    });

    if (options.verbose) {
      logger.debug(`SVG sprite size: ${formatSize(svgSprite.length)}`);
    }

    progress.succeed('SVG sprite generated');

    // Dry run mode - preview only
    if (options.dryRun) {
      logger.info('Dry run mode - no files will be written');
      console.log();
      console.log(pc.bold('Output preview:'));

      const outputDir = config.output.directory;
      console.log(
        pc.dim(`  ${outputDir}/sprite.png`),
        pc.green(`(${formatSize(pngSprites.sprite1x.length)})`),
      );
      console.log(
        pc.dim(`  ${outputDir}/sprite@2x.png`),
        pc.green(`(${formatSize(pngSprites.sprite2x.length)})`),
      );
      console.log(
        pc.dim(`  ${outputDir}/sprite.svg`),
        pc.green(`(${formatSize(svgSprite.length)})`),
      );
      console.log(pc.dim(`  ${outputDir}/sprite.scss`), pc.green('(~3-5 KB)'));
      console.log(pc.dim(`  ${outputDir}/sprite.json`), pc.green('(~5-10 KB)'));

      console.log();
      const duration = Date.now() - startTime;
      logger.success(`Dry run complete! (${formatDuration(duration)})`);
      return;
    }

    // Phase 6: Write output files
    progress.start('Writing output files');
    const result = await writeOutput({
      config,
      pngSprites,
      svgSprite,
      icons: packed.packedIcons.map((p) => p.iconData),
    });

    if (options.verbose) {
      logger.debug(`Files written to: ${config.output.directory}`);
    }

    // Display file sizes
    console.log();
    for (const [filename, size] of Object.entries(result.sizes)) {
      logger.success(`${filename} ${pc.green(`(${formatSize(size)}`)}`);
    }

    console.log();
    const duration = Date.now() - startTime;
    logger.success(`Sprite generation complete! ${pc.dim(`(${formatDuration(duration)})`)}`);
  } catch (error) {
    progress.fail('Generation failed');
    handleError(error);
  }
}
