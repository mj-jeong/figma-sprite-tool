/**
 * Configuration loader with validation and error handling
 */

import { readFile, fileExists, findFileUp } from '../../utils/fs.js';
import { resolvePath } from '../../utils/path.js';
import { ErrorCode, createConfigError } from '../../utils/errors.js';
import { parseConfig, type SpriteConfigSchemaType } from './schema.js';
import { DEFAULT_CONFIG_NAMES, mergeWithDefaults } from './defaults.js';
import { resolveIdFormat } from './presets.js';
import type { SpriteConfig, ConfigPathOptions } from '../types/config.js';

/**
 * Load configuration from file
 */
export async function loadConfig(options: ConfigPathOptions = {}): Promise<SpriteConfig> {
  const configPath = await resolveConfigPath(options);

  if (!configPath) {
    throw createConfigError(
      ErrorCode.CONFIG_NOT_FOUND,
      'Configuration file not found',
      {
        searchedPaths: DEFAULT_CONFIG_NAMES,
        cwd: options.cwd ?? process.cwd(),
      },
    );
  }

  return await loadConfigFromPath(configPath);
}

/**
 * Load configuration from specific path
 */
export async function loadConfigFromPath(configPath: string): Promise<SpriteConfig> {
  const resolvedPath = resolvePath(configPath);

  // Check if file exists
  if (!(await fileExists(resolvedPath))) {
    throw createConfigError(
      ErrorCode.CONFIG_NOT_FOUND,
      `Configuration file not found: ${resolvedPath}`,
      {
        configPath: resolvedPath,
      },
    );
  }

  // Read file content
  let content: string;
  try {
    content = await readFile(resolvedPath);
  } catch (error) {
    throw createConfigError(
      ErrorCode.CONFIG_PARSE_FAILED,
      `Failed to read configuration file: ${resolvedPath}`,
      {
        configPath: resolvedPath,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }

  // Parse JSON
  let rawConfig: unknown;
  try {
    rawConfig = JSON.parse(content);
  } catch (error) {
    throw createConfigError(
      ErrorCode.CONFIG_PARSE_FAILED,
      `Invalid JSON in configuration file: ${resolvedPath}`,
      {
        configPath: resolvedPath,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }

  // Validate with Zod schema
  let validatedConfig: SpriteConfigSchemaType;
  try {
    validatedConfig = parseConfig(rawConfig);
  } catch (error) {
    throw createConfigError(
      ErrorCode.CONFIG_INVALID,
      `Configuration validation failed`,
      {
        configPath: resolvedPath,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }

  // Merge with defaults
  const config = mergeWithDefaults(validatedConfig);

  // Resolve preset to template if needed
  config.naming.idFormat = resolveIdFormat(config.naming.idFormat);

  return config;
}

/**
 * Resolve configuration file path
 */
async function resolveConfigPath(options: ConfigPathOptions): Promise<string | null> {
  const cwd = options.cwd ?? process.cwd();

  // If explicit path provided, use it
  if (options.configPath) {
    return resolvePath(options.configPath, cwd);
  }

  // Search for default config files
  for (const configName of DEFAULT_CONFIG_NAMES) {
    const found = await findFileUp(configName, cwd);
    if (found) {
      return found;
    }
  }

  return null;
}

/**
 * Validate configuration without loading
 */
export async function validateConfigFile(configPath: string): Promise<{
  valid: boolean;
  errors?: Array<{ path: string; message: string }>;
}> {
  try {
    await loadConfigFromPath(configPath);
    return { valid: true };
  } catch (error) {
    if (error instanceof Error) {
      // Try to extract validation errors from message
      const errorMessage = error.message;
      const errors: Array<{ path: string; message: string }> = [];

      if (errorMessage.includes('Configuration validation failed')) {
        const lines = errorMessage.split('\n').slice(1); // Skip first line
        for (const line of lines) {
          const match = line.match(/^\s*-\s*(.+?):\s*(.+)$/);
          if (match && match[1] && match[2]) {
            errors.push({
              path: match[1],
              message: match[2],
            });
          }
        }
      }

      return {
        valid: false,
        errors: errors.length > 0 ? errors : [{ path: '', message: errorMessage }],
      };
    }

    const errorMsg = error instanceof Error ? error.message : 'Unknown error during validation';
    return {
      valid: false,
      errors: [{ path: '', message: errorMsg }],
    };
  }
}

/**
 * Check if config file exists at path
 */
export async function configExists(options: ConfigPathOptions = {}): Promise<boolean> {
  const configPath = await resolveConfigPath(options);
  return configPath !== null;
}

/**
 * Get config file path without loading
 */
export async function getConfigPath(options: ConfigPathOptions = {}): Promise<string | null> {
  return await resolveConfigPath(options);
}
