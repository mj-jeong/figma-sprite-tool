/**
 * Interactive configuration file generator
 * Creates figma.sprite.config.json with user-provided settings
 */

import inquirer from 'inquirer';
import { writeFile } from 'node:fs/promises';
import pc from 'picocolors';

/**
 * Interactive configuration file generator
 * Creates figma.sprite.config.json with user-provided settings
 */
export async function initCommand(): Promise<void> {
  console.log(pc.cyan('🎨 Figma Sprite Tool - Configuration Setup\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'figmaUrl',
      message: 'Figma file URL:',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Please enter a Figma file URL';
        }

        const match = input.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
        if (!match) {
          return 'Please enter a valid Figma file URL (e.g., https://figma.com/file/AbCdEf123456/...)';
        }

        return true;
      },
    },
    {
      type: 'input',
      name: 'page',
      message: 'Page name containing icons:',
      default: 'Icons',
      validate: (input: string) => {
        return input.trim().length > 0 ? true : 'Page name cannot be empty';
      },
    },
    {
      type: 'input',
      name: 'prefix',
      message: 'Icon name prefix (filter):',
      default: 'ic/',
      validate: (input: string) => {
        return input.trim().length > 0 ? true : 'Prefix cannot be empty';
      },
    },
    {
      type: 'list',
      name: 'idFormat',
      message: 'Icon ID format:',
      choices: [
        {
          name: 'Simple - Use full name as-is (e.g., ic-home-24-line)',
          value: 'simple',
          short: 'Simple',
        },
        {
          name: 'With Size - Include size variant (e.g., home-24)',
          value: 'with-size',
          short: 'With Size',
        },
        {
          name: 'With Variants - Full variant info (e.g., home-24-line--dark)',
          value: 'with-variants',
          short: 'With Variants',
        },
      ],
      default: 'simple',
    },
    {
      type: 'input',
      name: 'outputDir',
      message: 'Output directory:',
      default: './sprites',
    },
  ]);

  // Extract fileKey from URL
  const match = answers.figmaUrl.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
  if (!match) {
    throw new Error('Failed to parse Figma file key from URL');
  }
  const fileKey = match[1];

  // Build configuration object
  const config = {
    figma: {
      fileKey,
      page: answers.page,
      scope: {
        type: 'prefix' as const,
        value: answers.prefix,
      },
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
      idFormat: answers.idFormat,
      sanitize: true,
    },
    output: {
      directory: answers.outputDir,
    },
  };

  // Write configuration file
  const configPath = 'figma.sprite.config.json';
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

  console.log(pc.green('\n✅ Configuration saved to figma.sprite.config.json'));
  console.log(pc.cyan('\n📝 Next steps:'));
  console.log('  1. Set FIGMA_TOKEN environment variable:');
  console.log(pc.dim('     export FIGMA_TOKEN="your-figma-token"'));
  console.log('     Get your token from: https://www.figma.com/developers/api#access-tokens');
  console.log('  2. Run generation:');
  console.log(pc.dim('     figma-sprite generate'));
  console.log('');
}
