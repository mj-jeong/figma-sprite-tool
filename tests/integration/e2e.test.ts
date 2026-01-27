/**
 * E2E Integration Tests
 * Tests the complete sprite generation workflow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateCommand } from '../../src/cli/commands/generate.js';
import type { SpriteConfig } from '../../src/engine/types/index.js';

describe('E2E: Full Sprite Generation', () => {
  let testDir: string;
  let outputDir: string;
  let configPath: string;

  beforeEach(async () => {
    // Create temporary directories
    testDir = join(tmpdir(), `figma-sprite-test-${Date.now()}`);
    outputDir = join(testDir, 'output');
    await mkdir(testDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    configPath = join(testDir, 'figma.sprite.config.json');
  });

  afterEach(async () => {
    // Cleanup
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('with mocked Figma API', () => {
    // Note: This test requires mocking Figma API responses
    // In a real implementation, you would use MSW or similar to mock HTTP requests

    it.skip('should generate all output files', async () => {
      // Create test config
      const config: Partial<SpriteConfig> = {
        figma: {
          fileKey: 'test-file-key',
          page: 'Icons',
          scope: {
            type: 'prefix',
            value: 'ic-',
          },
          personalAccessToken: 'test-token',
        },
        output: {
          directory: outputDir,
        },
        formats: {
          png: {
            scale: 2,
            padding: 2,
          },
          svg: {
            optimize: true,
          },
        },
        naming: {
          idFormat: '{name}',
        },
      };

      // Write config
      await writeFile(configPath, JSON.stringify(config, null, 2));

      // Execute command
      await generateCommand({
        config: configPath,
      });

      // Verify output files exist
      await expect(fileExists(join(outputDir, 'sprite.png'))).resolves.toBe(true);
      await expect(fileExists(join(outputDir, 'sprite@2x.png'))).resolves.toBe(true);
      await expect(fileExists(join(outputDir, 'sprite.svg'))).resolves.toBe(true);
      await expect(fileExists(join(outputDir, 'sprite.scss'))).resolves.toBe(true);
      await expect(fileExists(join(outputDir, 'sprite.json'))).resolves.toBe(true);
    });

    it.skip('should generate valid JSON metadata', async () => {
      // Create and run test
      const config: Partial<SpriteConfig> = {
        figma: {
          fileKey: 'test-file-key',
          page: 'Icons',
          scope: { type: 'prefix', value: 'ic-' },
          personalAccessToken: 'test-token',
        },
        output: {
          directory: outputDir,
        },
        formats: {
          png: { scale: 2, padding: 2 },
          svg: { optimize: true },
        },
        naming: {
          idFormat: '{name}',
        },
      };

      await writeFile(configPath, JSON.stringify(config, null, 2));
      await generateCommand({ config: configPath });

      // Read and validate JSON
      const jsonContent = await readFile(join(outputDir, 'sprite.json'), 'utf-8');
      const json = JSON.parse(jsonContent);

      expect(json).toHaveProperty('meta');
      expect(json).toHaveProperty('icons');
      expect(json.meta).toHaveProperty('fileKey', 'test-file-key');
      expect(json.meta).toHaveProperty('generatedAt');
    });

    it.skip('should generate valid SCSS', async () => {
      // Create and run test
      const config: Partial<SpriteConfig> = {
        figma: {
          fileKey: 'test-file-key',
          page: 'Icons',
          scope: { type: 'prefix', value: 'ic-' },
          personalAccessToken: 'test-token',
        },
        output: {
          directory: outputDir,
        },
        formats: {
          png: { scale: 2, padding: 2 },
          svg: { optimize: true },
        },
        naming: {
          idFormat: '{name}',
        },
      };

      await writeFile(configPath, JSON.stringify(config, null, 2));
      await generateCommand({ config: configPath });

      // Read SCSS
      const scssContent = await readFile(join(outputDir, 'sprite.scss'), 'utf-8');

      // Validate SCSS structure
      expect(scssContent).toContain('$sprite-icons');
      expect(scssContent).toContain('@mixin sprite-icon');
      expect(scssContent).toContain('@media');
    });
  });

  describe('dry run mode', () => {
    it('should not create output files in dry run', async () => {
      const config: Partial<SpriteConfig> = {
        figma: {
          fileKey: 'test-file-key',
          page: 'Icons',
          scope: { type: 'prefix', value: 'ic-' },
          personalAccessToken: process.env.FIGMA_TOKEN || 'test-token',
        },
        output: {
          directory: outputDir,
        },
        formats: {
          png: { scale: 2, padding: 2 },
          svg: { optimize: true },
        },
        naming: {
          idFormat: '{name}',
        },
      };

      await writeFile(configPath, JSON.stringify(config, null, 2));

      // This will fail without real Figma API, but that's expected
      // The test verifies dry-run doesn't create files even on error
      try {
        await generateCommand({
          config: configPath,
          dryRun: true,
        });
      } catch (error) {
        // Expected to fail without real API
      }

      // Verify no files were created
      await expect(fileExists(join(outputDir, 'sprite.png'))).resolves.toBe(false);
      await expect(fileExists(join(outputDir, 'sprite.svg'))).resolves.toBe(false);
    });
  });

  describe('error handling', () => {
    it('should fail gracefully with invalid config', async () => {
      // Write invalid config
      await writeFile(configPath, '{ invalid json }');

      await expect(
        generateCommand({
          config: configPath,
        }),
      ).rejects.toThrow();
    });

    it('should fail gracefully with missing config', async () => {
      await expect(
        generateCommand({
          config: join(testDir, 'nonexistent.json'),
        }),
      ).rejects.toThrow();
    });

    it('should fail gracefully without Figma token', async () => {
      const config: Partial<SpriteConfig> = {
        figma: {
          fileKey: 'test-file-key',
          page: 'Icons',
          scope: { type: 'prefix', value: 'ic-' },
          // No token
        },
        output: {
          directory: outputDir,
        },
        formats: {
          png: { scale: 2, padding: 2 },
          svg: { optimize: true },
        },
        naming: {
          idFormat: '{name}',
        },
      };

      await writeFile(configPath, JSON.stringify(config, null, 2));

      // Temporarily remove env token
      const originalToken = process.env.FIGMA_TOKEN;
      delete process.env.FIGMA_TOKEN;

      await expect(
        generateCommand({
          config: configPath,
        }),
      ).rejects.toThrow(/token/i);

      // Restore token
      if (originalToken) {
        process.env.FIGMA_TOKEN = originalToken;
      }
    });
  });
});

/**
 * Helper: Check if file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper: Write file
 */
async function writeFile(path: string, content: string): Promise<void> {
  const { writeFile: writeFileNode } = await import('node:fs/promises');
  await writeFileNode(path, content, 'utf-8');
}
