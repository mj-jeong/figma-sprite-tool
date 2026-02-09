/**
 * Default configuration values
 * Used when values are not specified in user config
 */

import type { SpriteConfig } from '../types/config.js';

/**
 * Default configuration file names to search for
 */
export const DEFAULT_CONFIG_NAMES = [
  'figma.sprite.config.json',
  'sprite.config.json',
  '.spriterc.json',
  '.spriterc',
] as const;

/**
 * Default output directory
 */
export const DEFAULT_OUTPUT_DIR = 'assets/sprite';

/**
 * Default output file name prefix
 */
export const DEFAULT_OUTPUT_NAME = 'sprite';

/**
 * Default PNG scale (retina)
 */
export const DEFAULT_PNG_SCALE = 2;

/**
 * Default padding between icons in sprite
 */
export const DEFAULT_PADDING = 2;

/**
 * Default icon ID format (preset name)
 */
export const DEFAULT_ID_FORMAT = 'simple';

/**
 * Get default configuration object
 */
export function getDefaults(): Partial<SpriteConfig> {
  return {
    output: {
      dir: DEFAULT_OUTPUT_DIR,
      name: DEFAULT_OUTPUT_NAME,
    },
    formats: {
      png: {
        enabled: true,
        scale: DEFAULT_PNG_SCALE,
        padding: DEFAULT_PADDING,
      },
      svg: {
        enabled: true,
        svgo: true,
      },
    },
    naming: {
      idFormat: DEFAULT_ID_FORMAT,
      sanitize: true,
    },
  };
}

/**
 * Merge user config with defaults
 */
export function mergeWithDefaults(userConfig: Partial<SpriteConfig>): SpriteConfig {
  const defaults = getDefaults();

  return {
    figma: {
      fileKey: userConfig.figma?.fileKey ?? '',
      page: userConfig.figma?.page ?? '',
      scope: {
        type: userConfig.figma?.scope?.type ?? 'prefix',
        value: userConfig.figma?.scope?.value ?? '',
      },
    },
    output: {
      dir: userConfig.output?.dir ?? defaults.output!.dir,
      name: userConfig.output?.name ?? defaults.output!.name,
    },
    formats: {
      png: {
        enabled: userConfig.formats?.png?.enabled ?? defaults.formats!.png.enabled,
        scale: userConfig.formats?.png?.scale ?? defaults.formats!.png.scale,
        padding: userConfig.formats?.png?.padding ?? defaults.formats!.png.padding,
      },
      svg: {
        enabled: userConfig.formats?.svg?.enabled ?? defaults.formats!.svg.enabled,
        svgo: userConfig.formats?.svg?.svgo ?? defaults.formats!.svg.svgo,
      },
    },
    naming: {
      idFormat: userConfig.naming?.idFormat ?? defaults.naming!.idFormat,
      sanitize: userConfig.naming?.sanitize ?? defaults.naming!.sanitize,
    },
  };
}

/**
 * Environment variable names
 */
export const ENV_VARS = {
  FIGMA_TOKEN: 'FIGMA_TOKEN',
  CONFIG_PATH: 'SPRITE_CONFIG_PATH',
} as const;

/**
 * Get Figma token from environment
 */
export function getFigmaToken(): string | undefined {
  return process.env[ENV_VARS.FIGMA_TOKEN];
}

/**
 * Get config path from environment
 */
export function getConfigPathFromEnv(): string | undefined {
  return process.env[ENV_VARS.CONFIG_PATH];
}
