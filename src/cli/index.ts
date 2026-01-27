#!/usr/bin/env node

/**
 * Figma Sprite Tool CLI Entry Point
 * Command-line interface for generating sprite sheets from Figma
 */

import { Command } from 'commander';
import { generateCommand } from './commands/index.js';
import { handleError } from './output/index.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

// Get package version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find package.json - works in both src and dist
function findPackageJson(): string {
  let currentDir = __dirname;
  for (let i = 0; i < 5; i++) {
    const packagePath = join(currentDir, 'package.json');
    try {
      if (readFileSync(packagePath, 'utf-8')) {
        return packagePath;
      }
    } catch {
      currentDir = resolve(currentDir, '..');
    }
  }
  // Fallback to hardcoded version if package.json not found
  return '';
}

const packageJsonPath = findPackageJson();
const packageJson = packageJsonPath
  ? JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  : { version: '0.1.0' };

// Create CLI program
const program = new Command();

program
  .name('figma-sprite')
  .description('Generate sprite sheets from Figma design systems')
  .version(packageJson.version);

// Generate command (with alias 'build')
program
  .command('generate')
  .alias('build')
  .description('Generate sprite sheets from Figma')
  .option('-c, --config <path>', 'Path to config file', 'figma.sprite.config.json')
  .option('-o, --output <dir>', 'Output directory (overrides config)')
  .option('--verbose', 'Enable verbose logging')
  .option('--dry-run', 'Preview without writing files')
  .action(async (options) => {
    try {
      await generateCommand(options);
    } catch (error) {
      handleError(error);
    }
  });

// Default to generate command if no command specified
if (process.argv.length === 2) {
  process.argv.push('generate');
}

// Parse CLI arguments
program.parse();

export {};
