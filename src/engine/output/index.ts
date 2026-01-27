/**
 * Output generation module
 * Exports all output-related functionality for sprite files
 */

// Hash calculator
export {
  calculateHash,
  calculatePngHash,
  calculateSvgHash,
  calculateCombinedHash,
} from './hash-calculator.js';

// SCSS generator
export {
  generateScss,
  validateScssOptions,
  type ScssGenerationOptions,
} from './scss-generator.js';

// JSON generator
export {
  generateSpriteJson,
  generateTimestamp,
  validateJsonOptions,
  type JsonGenerationOptions,
  type SpriteJsonOutput,
} from './json-generator.js';

// File writer
export {
  writeOutput,
  buildOutputPaths,
  validateWriteOptions,
  type WriteOutputOptions,
  type OutputFilePaths,
  type OutputResult,
} from './file-writer.js';
