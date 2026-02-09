/**
 * Zod schemas for configuration validation
 * Single source of truth for config structure
 */

import { z } from 'zod';

/**
 * Scope filter schema
 */
const ScopeSchema = z.object({
  type: z.enum(['prefix']).describe('Filter type (currently only prefix is supported)'),
  value: z.string().min(1).describe('Filter value (e.g., "ic/" for prefix filtering)'),
});

/**
 * Figma configuration schema
 */
const FigmaSchema = z.object({
  fileKey: z.string().min(1).describe('Figma file identifier from the URL'),
  page: z.string().min(1).describe('Page path where icons are located'),
  scope: ScopeSchema,
});

/**
 * PNG format configuration schema
 */
const PngFormatSchema = z.object({
  enabled: z.boolean().default(true).describe('Enable PNG sprite generation'),
  scale: z.union([z.literal(1), z.literal(2)]).default(2).describe('Scale factor (1 or 2 for retina)'),
  padding: z.number().int().min(0).default(2).describe('Padding between icons in pixels'),
});

/**
 * SVG format configuration schema
 */
const SvgFormatSchema = z.object({
  enabled: z.boolean().default(true).describe('Enable SVG sprite generation'),
  svgo: z.boolean().default(true).describe('Enable SVGO optimization'),
});

/**
 * Output formats configuration schema
 */
const FormatsSchema = z.object({
  png: PngFormatSchema.default({}),
  svg: SvgFormatSchema.default({}),
});

/**
 * Output configuration schema
 */
const OutputSchema = z.object({
  dir: z.string().default('assets/sprite').describe('Output directory path (relative or absolute)'),
  name: z.string().default('sprite').describe('Base name for output files'),
});

/**
 * Naming configuration schema
 */
const NamingSchema = z.object({
  idFormat: z
    .union([
      z.enum(['simple', 'with-size', 'with-variants']),
      z.string(),
    ])
    .default('simple')
    .describe('Preset name (simple, with-size, with-variants) or custom template for generating icon IDs'),
  sanitize: z.boolean().default(true).describe('Enable name sanitization (kebab-case, no special chars)'),
});

/**
 * Main sprite configuration schema
 */
export const SpriteConfigSchema = z.object({
  figma: FigmaSchema,
  output: OutputSchema.default({}),
  formats: FormatsSchema.default({}),
  naming: NamingSchema.default({}),
});

/**
 * Type inference from schema
 */
export type SpriteConfigSchemaType = z.infer<typeof SpriteConfigSchema>;

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Allow unknown fields in config */
  allowUnknown?: boolean;
  /** Coerce types where possible */
  coerce?: boolean;
}

/**
 * Validate configuration object against schema
 */
export function validateConfig(data: unknown, options: ValidationOptions = {}): z.SafeParseReturnType<unknown, SpriteConfigSchemaType> {
  const schema = options.allowUnknown ? SpriteConfigSchema.passthrough() : SpriteConfigSchema.strict();

  return schema.safeParse(data);
}

/**
 * Parse and validate configuration with detailed error messages
 */
export function parseConfig(data: unknown, options: ValidationOptions = {}): SpriteConfigSchemaType {
  const result = validateConfig(data, options);

  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    throw new Error(
      `Configuration validation failed:\n${errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n')}`,
    );
  }

  return result.data;
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Partial<SpriteConfigSchemaType> {
  return {
    output: {
      dir: 'assets/sprite',
      name: 'sprite',
    },
    formats: {
      png: {
        enabled: true,
        scale: 2,
        padding: 2,
      },
      svg: {
        enabled: true,
        svgo: true,
      },
    },
    naming: {
      idFormat: 'simple',
      sanitize: true,
    },
  };
}

/**
 * Validate a single field path in config
 */
export function validateField(config: unknown, fieldPath: string): boolean {
  try {
    const result = validateConfig(config);
    if (!result.success) {
      return !result.error.errors.some((err) => err.path.join('.') === fieldPath);
    }
    return true;
  } catch {
    return false;
  }
}
