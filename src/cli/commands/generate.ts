/**
 * Generate command implementation
 * Orchestrates all phases of sprite generation
 */

import { loadConfig } from '../../engine/config/index.js';
import { createFigmaClient, parseIconNodes, createIconMetadata, exportImages } from '../../engine/figma/index.js';
import {
  packIconsWithPositions,
  calculateSpriteDimensions,
  generatePngSpriteSheet,
  generateSvgSprite,
  generateSvgSpritePreview,
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
    const exportResults = await exportImages(client, config.figma.fileKey, icons, iconMetadata, config);

    // Extract PNG and SVG data from export results
    const iconData = exportResults.png?.items || [];
    const svgIconData = exportResults.svg?.items || [];

    if (options.verbose) {
      const pngSize = iconData.reduce((sum, icon) => sum + icon.buffer.length, 0);
      const svgSize = svgIconData.reduce((sum, icon) => sum + icon.content.length, 0);
      logger.debug(`Total exported size: ${formatSize(pngSize + svgSize)}`);
    }

    progress.succeed(`Exported ${iconData.length} icons`);

    // Phase 4: Generate PNG sprites
    progress.start('Generating PNG sprites');
    const padding = config.formats.png.padding ?? 2;
    const packedIcons = packIconsWithPositions(iconData, padding);
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

      const outputDir = config.output.dir;
      const outputName = config.output.name;
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
      console.log(pc.dim(`  ${outputDir}/${outputName}.json`), pc.green('(~5-10 KB)'));

      console.log();
      const duration = Date.now() - startTime;
      logger.success(`Dry run complete! (${formatDuration(duration)})`);
      return;
    }

    // Phase 6: Write output files
    progress.start('Writing output files');
    const result = await writeOutput({
      outputDir: config.output.dir,
      outputName: config.output.name,
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
    });

    if (options.verbose) {
      logger.debug(`Files written to: ${config.output.dir}`);
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
