/**
 * ID format presets for common naming conventions
 * Provides pre-defined templates for icon ID generation
 */

/**
 * ID format preset definition
 */
export interface IdFormatPreset {
  /** Template string for ID generation */
  template: string;
  /** Human-readable description of the preset */
  description: string;
  /** Example output using this preset */
  example: string;
}

/**
 * Preset name type (for type safety)
 */
export type PresetName = 'simple' | 'with-size' | 'with-variants';

/**
 * Pre-defined ID format presets
 *
 * @example
 * // Using simple preset
 * ID_FORMAT_PRESETS.simple.template // '{name}'
 *
 * // Using with-variants preset
 * ID_FORMAT_PRESETS['with-variants'].template // '{name}-{size}-{style}{theme?--{theme}}'
 */
export const ID_FORMAT_PRESETS: Record<PresetName, IdFormatPreset> = {
  /**
   * Simple preset - Use full icon name as-is
   * Suitable for: Simple icon libraries without variants
   */
  simple: {
    template: '{name}',
    description: 'Use full icon name as-is',
    example: 'ic-home-24-line → ic-home-24-line',
  },

  /**
   * With Size preset - Include size variant
   * Suitable for: Icons with multiple sizes but consistent style
   */
  'with-size': {
    template: '{name}-{size}',
    description: 'Include size in ID',
    example: 'ic-home-24-line → home-24',
  },

  /**
   * With Variants preset - Full variant information
   * Suitable for: Complex icon systems with multiple variant dimensions
   */
  'with-variants': {
    template: '{name}-{size}-{style}{theme?--{theme}}',
    description: 'Full variant information',
    example: 'ic-home-24-line → home-24-line',
  },
} as const;

/**
 * Check if a string is a valid preset name
 */
export function isPresetName(value: string): value is PresetName {
  return value in ID_FORMAT_PRESETS;
}

/**
 * Get preset by name
 * Returns undefined if preset not found
 */
export function getPreset(name: string): IdFormatPreset | undefined {
  if (isPresetName(name)) {
    return ID_FORMAT_PRESETS[name];
  }
  return undefined;
}

/**
 * Get all preset names
 */
export function getPresetNames(): PresetName[] {
  return Object.keys(ID_FORMAT_PRESETS) as PresetName[];
}

/**
 * Resolve ID format from preset name or custom template
 *
 * @param format - Preset name or custom template string
 * @returns Template string
 *
 * @example
 * resolveIdFormat('simple') // '{name}'
 * resolveIdFormat('{name}-{size}') // '{name}-{size}' (custom template)
 */
export function resolveIdFormat(format: string): string {
  const preset = getPreset(format);
  return preset ? preset.template : format;
}
