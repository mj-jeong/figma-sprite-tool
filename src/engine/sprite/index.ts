/**
 * Sprite generation module
 * Exports all sprite-related functionality
 */

// Packing
export { packIcons, packIconsWithPositions, calculateSpriteDimensions } from './packer.js';

// PNG generation
export {
  generatePngSprite,
  generatePngSprites,
  generatePngSpriteSheet,
  type PngGenerationOptions,
} from './png-generator.js';

// SVG generation
export {
  generateSvgSprite,
  createSvgIconData,
  batchCreateSvgIconData,
  validateSvgIcons,
  type SvgGenerationOptions,
} from './svg-generator.js';

// ViewBox utilities
export {
  extractViewBox,
  parseViewBox,
  validateViewBox,
  extractSvgInnerContent,
  extractSvgDimensions,
  createViewBox,
} from './viewbox-extractor.js';
