/**
 * TypeScript type definitions for Sprite Tool configuration
 * These types are inferred from the Zod schema for type safety
 */

/**
 * Scope filter types for selecting icons from Figma
 */
export type ScopeType = 'prefix';

/**
 * Scope configuration for filtering icons
 */
export interface ScopeConfig {
  /** Filter type (currently only 'prefix' is supported) */
  type: ScopeType;
  /** Filter value (e.g., "ic/" for prefix filtering) */
  value: string;
}

/**
 * Figma connection configuration
 */
export interface FigmaConfig {
  /** Figma file identifier (from URL) */
  fileKey: string;
  /** Page path where icons are located (e.g., "Design System / Icons") */
  page: string;
  /** Icon filtering rules */
  scope: ScopeConfig;
}

/**
 * Output configuration
 */
export interface OutputConfig {
  /** Output directory path (relative or absolute) */
  dir: string;
  /** Base name for output files (e.g., "sprite" -> sprite.png, sprite.scss) */
  name: string;
}

/**
 * PNG sprite configuration
 */
export interface PngFormatConfig {
  /** Enable PNG sprite generation */
  enabled: boolean;
  /** Scale factor (1 for standard, 2 for retina) */
  scale: 1 | 2;
  /** Padding between icons in pixels */
  padding: number;
}

/**
 * SVG sprite configuration
 */
export interface SvgFormatConfig {
  /** Enable SVG sprite generation */
  enabled: boolean;
  /** Enable SVGO optimization */
  svgo: boolean;
}

/**
 * Output format configuration
 */
export interface FormatsConfig {
  /** PNG sprite settings */
  png: PngFormatConfig;
  /** SVG sprite settings */
  svg: SvgFormatConfig;
}

/**
 * Icon naming configuration
 */
export interface NamingConfig {
  /**
   * Template for generating icon IDs
   * Supports placeholders: {name}, {size}, {style}, {theme?--{theme}}
   * Example: "{name}-{size}-{style}{theme?--{theme}}"
   */
  idFormat: string;
  /** Enable name sanitization (remove special chars, convert to kebab-case) */
  sanitize: boolean;
}

/**
 * Complete sprite tool configuration
 */
export interface SpriteConfig {
  /** Figma connection settings */
  figma: FigmaConfig;
  /** Output file settings */
  output: OutputConfig;
  /** Sprite format settings */
  formats: FormatsConfig;
  /** Icon naming rules */
  naming: NamingConfig;
}

/**
 * Partial configuration for overrides
 */
export type PartialSpriteConfig = Partial<SpriteConfig>;

/**
 * Configuration file path options
 */
export interface ConfigPathOptions {
  /** Path to config file (relative or absolute) */
  configPath?: string;
  /** Current working directory for resolving relative paths */
  cwd?: string;
}

/**
 * Config validation result
 */
export interface ConfigValidationResult {
  /** Whether config is valid */
  valid: boolean;
  /** Validated and normalized config (if valid) */
  config?: SpriteConfig;
  /** Validation errors (if invalid) */
  errors?: Array<{
    path: string;
    message: string;
  }>;
}
