/**
 * Tests for configuration loader
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { loadConfigFromPath, validateConfigFile, configExists, getConfigPath } from '../../../../src/engine/config/loader.js';
import { ErrorCode } from '../../../../src/utils/errors.js';

const fixturesDir = join(process.cwd(), 'tests', 'fixtures', 'configs');
const validConfigPath = join(fixturesDir, 'valid.config.json');
const invalidConfigPath = join(fixturesDir, 'invalid.config.json');
const minimalConfigPath = join(fixturesDir, 'minimal.config.json');
const nonexistentPath = join(fixturesDir, 'nonexistent.json');
const presetSimpleConfigPath = join(fixturesDir, 'preset.config.json');
const presetWithSizeConfigPath = join(fixturesDir, 'preset-with-size.config.json');
const presetWithVariantsConfigPath = join(fixturesDir, 'preset-with-variants.config.json');
const legacyOutputDirectoryConfigPath = join(fixturesDir, 'legacy-output-directory.config.json');

describe('loadConfigFromPath', () => {
  it('should load valid config file', async () => {
    const config = await loadConfigFromPath(validConfigPath);

    expect(config.figma.fileKey).toBe('AbCdEf123456');
    expect(config.figma.page).toBe('Design System / Icons');
    expect(config.figma.scope.type).toBe('prefix');
    expect(config.figma.scope.value).toBe('ic/');
  });

  it('should apply defaults to minimal config', async () => {
    const config = await loadConfigFromPath(minimalConfigPath);

    expect(config.figma.fileKey).toBe('TestFileKey123');
    expect(config.output.dir).toBe('assets/sprite');
    expect(config.output.name).toBe('sprite');
    expect(config.formats.png.scale).toBe(2);
    expect(config.formats.png.padding).toBe(2);
  });

  it('should throw error for nonexistent file', async () => {
    await expect(loadConfigFromPath(nonexistentPath)).rejects.toThrow();

    try {
      await loadConfigFromPath(nonexistentPath);
    } catch (error: any) {
      expect(error.code).toBe(ErrorCode.CONFIG_NOT_FOUND);
    }
  });

  it('should throw error for invalid config', async () => {
    await expect(loadConfigFromPath(invalidConfigPath)).rejects.toThrow();

    try {
      await loadConfigFromPath(invalidConfigPath);
    } catch (error: any) {
      expect(error.code).toBe(ErrorCode.CONFIG_INVALID);
    }
  });
});

describe('validateConfigFile', () => {
  it('should return valid for correct config', async () => {
    const result = await validateConfigFile(validConfigPath);

    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should return errors for invalid config', async () => {
    const result = await validateConfigFile(invalidConfigPath);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('should return error for nonexistent file', async () => {
    const result = await validateConfigFile(nonexistentPath);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });
});

describe('configExists', () => {
  it('should return true for existing config', async () => {
    const exists = await configExists({
      configPath: validConfigPath,
    });

    expect(exists).toBe(true);
  });

  it('should return false for nonexistent config in empty directory', async () => {
    const emptyDir = join(process.cwd(), 'tests', 'fixtures', 'empty');
    const exists = await configExists({
      cwd: emptyDir,
    });

    expect(exists).toBe(false);
  });
});

describe('getConfigPath', () => {
  it('should return path when explicit path provided', async () => {
    const path = await getConfigPath({
      configPath: validConfigPath,
    });

    expect(path).toContain('valid.config.json');
  });

  it('should search for default config names', async () => {
    const path = await getConfigPath({
      cwd: fixturesDir,
    });

    // Should find figma.sprite.config.json in fixtures directory
    expect(path).toBeTruthy();
    if (path) {
      expect(path).toContain('figma.sprite.config.json');
    }
  });
});

describe('Config loading with different formats', () => {
  it('should handle config with all optional fields', async () => {
    const config = await loadConfigFromPath(validConfigPath);

    expect(config.output).toBeDefined();
    expect(config.formats).toBeDefined();
    expect(config.naming).toBeDefined();
  });

  it('should preserve user-specified values', async () => {
    const config = await loadConfigFromPath(validConfigPath);

    expect(config.formats.png.scale).toBe(2);
    expect(config.formats.png.padding).toBe(2);
    expect(config.naming.idFormat).toBe('{name}-{size}-{style}{theme?--{theme}}');
  });

  it('should support legacy output.directory key', async () => {
    const config = await loadConfigFromPath(legacyOutputDirectoryConfigPath);

    expect(config.output.dir).toBe('./legacy-sprites');
    expect(config.output.name).toBe('sprite');
  });
});

describe('Preset resolution', () => {
  it('should resolve simple preset to template', async () => {
    const config = await loadConfigFromPath(presetSimpleConfigPath);

    expect(config.naming.idFormat).toBe('{name}');
  });

  it('should resolve with-size preset to template', async () => {
    const config = await loadConfigFromPath(presetWithSizeConfigPath);

    expect(config.naming.idFormat).toBe('{name}-{size}');
  });

  it('should resolve with-variants preset to template', async () => {
    const config = await loadConfigFromPath(presetWithVariantsConfigPath);

    expect(config.naming.idFormat).toBe('{name}-{size}-{style}{theme?--{theme}}');
  });

  it('should preserve custom template strings', async () => {
    const config = await loadConfigFromPath(validConfigPath);

    // valid.config.json uses legacy template string
    expect(config.naming.idFormat).toBe('{name}-{size}-{style}{theme?--{theme}}');
  });

  it('should apply default preset when not specified', async () => {
    const config = await loadConfigFromPath(minimalConfigPath);

    // minimal.config.json doesn't specify idFormat, should use default 'simple' preset
    expect(config.naming.idFormat).toBe('{name}');
  });

  it('should handle preset in merged config', async () => {
    const config = await loadConfigFromPath(presetSimpleConfigPath);

    // Check that other defaults are still applied
    expect(config.output.dir).toBe('assets/sprite');
    expect(config.formats.png.scale).toBe(2);
    expect(config.naming.idFormat).toBe('{name}');
  });
});
