/**
 * File writer unit tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir } from 'node:fs/promises';
import { fileExists, readFile, readFileBuffer } from '../../../../src/utils/fs.js';
import {
  writeOutput,
  buildOutputPaths,
  validateWriteOptions,
  type WriteOutputOptions,
} from '../../../../src/engine/output/file-writer.js';
import type { PackedIcon, SpriteSheet, SvgSpriteSheet } from '../../../../src/engine/types/sprite.js';

describe('file-writer', () => {
  const testOutputDir = 'D:\\poc\\figma-sprite-tool\\tests\\fixtures\\output\\test-output';

  beforeEach(async () => {
    // Clean test output directory
    await rm(testOutputDir, { recursive: true, force: true });
    await mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up
    await rm(testOutputDir, { recursive: true, force: true });
  });

  const mockIcon: PackedIcon = {
    id: 'ic-home-24-line',
    name: 'Home',
    nodeId: '123:456',
    variants: { size: 24, style: 'line', name: 'Home' },
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]), // PNG signature
    width: 24,
    height: 24,
    x: 12,
    y: 8,
  };

  const mockSpriteSheet: SpriteSheet = {
    width: 1024,
    height: 512,
    icons: [mockIcon],
    hash: 'abc12345',
  };

  const mockSvgSprite: SvgSpriteSheet = {
    icons: [
      {
        id: 'ic-home-24-line',
        content: '<path d="M0 0"/>',
        viewBox: '0 0 24 24',
        width: 24,
        height: 24,
      },
    ],
    content: '<svg><symbol id="ic-home-24-line" viewBox="0 0 24 24"><path d="M0 0"/></symbol></svg>',
    hash: 'def45678',
  };

  describe('buildOutputPaths', () => {
    it('should build correct output paths', () => {
      const paths = buildOutputPaths('D:\\poc\\output', 'sprite');

      expect(paths.png).toContain('sprite.png');
      expect(paths.png2x).toContain('sprite@2x.png');
      expect(paths.svg).toContain('sprite.svg');
      expect(paths.scss).toContain('sprite.scss');
      expect(paths.json).toContain('sprite.json');
    });

    it('should normalize Windows paths', () => {
      const paths = buildOutputPaths('D:\\poc\\output', 'sprite');

      // Paths should use forward slashes after normalization
      expect(paths.png).toMatch(/\//);
    });

    it('should handle custom output names', () => {
      const paths = buildOutputPaths('D:\\poc\\output', 'custom-icons');

      expect(paths.png).toContain('custom-icons.png');
      expect(paths.scss).toContain('custom-icons.scss');
    });
  });

  describe('writeOutput', () => {
    it('should write all output files', async () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const pngBuffer2x = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

      const options: WriteOutputOptions = {
        outputDir: testOutputDir,
        outputName: 'sprite',
        pngSprite: {
          buffer: pngBuffer,
          sheet: mockSpriteSheet,
        },
        pngSprite2x: {
          buffer: pngBuffer2x,
          sheet: { ...mockSpriteSheet, hash: 'xyz78901' },
        },
        svgSprite: mockSvgSprite,
        fileKey: 'AbCdEf123456',
        page: 'Design System / Icons',
        pngConfig: { scale: 2, padding: 2 },
        svgConfig: { svgo: true },
      };

      const result = await writeOutput(options);

      // Check files were created
      expect(await fileExists(result.files.png)).toBe(true);
      expect(await fileExists(result.files.png2x)).toBe(true);
      expect(await fileExists(result.files.svg)).toBe(true);
      expect(await fileExists(result.files.scss)).toBe(true);
      expect(await fileExists(result.files.json)).toBe(true);

      // Check PNG content
      const pngContent = await readFileBuffer(result.files.png);
      expect(pngContent).toEqual(pngBuffer);

      // Check SVG content
      const svgContent = await readFile(result.files.svg);
      expect(svgContent).toBe(mockSvgSprite.content);

      // Check SCSS content
      const scssContent = await readFile(result.files.scss);
      expect(scssContent).toContain('$sprite-image:');
      expect(scssContent).toContain('@mixin sprite-icon');

      // Check JSON content
      const jsonContent = await readFile(result.files.json);
      const json = JSON.parse(jsonContent);
      expect(json.meta.fileKey).toBe('AbCdEf123456');
      expect(json.icons['ic-home-24-line']).toBeDefined();
    });

    it('should return correct statistics', async () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

      const options: WriteOutputOptions = {
        outputDir: testOutputDir,
        outputName: 'sprite',
        pngSprite: {
          buffer: pngBuffer,
          sheet: mockSpriteSheet,
        },
        svgSprite: mockSvgSprite,
        fileKey: 'test',
        page: 'test',
        pngConfig: { scale: 2, padding: 2 },
        svgConfig: { svgo: true },
      };

      const result = await writeOutput(options);

      // Check statistics
      expect(result.stats.iconCount).toBe(1);
      expect(result.stats.spriteWidth).toBe(1024);
      expect(result.stats.spriteHeight).toBe(512);
      expect(result.stats.fileSize.png).toBeGreaterThan(0);
      expect(result.stats.fileSize.svg).toBeGreaterThan(0);
      expect(result.stats.fileSize.scss).toBeGreaterThan(0);
      expect(result.stats.fileSize.json).toBeGreaterThan(0);

      // Check hashes
      expect(result.hashes.png).toBe('abc12345');
      expect(result.hashes.svg).toBe('def45678');
    });

    it('should create output directory if not exists', async () => {
      const newDir = 'D:\\poc\\figma-sprite-tool\\tests\\fixtures\\output\\new-dir';
      await rm(newDir, { recursive: true, force: true });

      const options: WriteOutputOptions = {
        outputDir: newDir,
        outputName: 'sprite',
        pngSprite: {
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
          sheet: mockSpriteSheet,
        },
        svgSprite: mockSvgSprite,
        fileKey: 'test',
        page: 'test',
        pngConfig: { scale: 2, padding: 2 },
        svgConfig: { svgo: true },
      };

      await writeOutput(options);

      // Check directory was created
      expect(await fileExists(newDir)).toBe(true);

      // Clean up
      await rm(newDir, { recursive: true, force: true });
    });

    it('should write without 2x sprite if not provided', async () => {
      const options: WriteOutputOptions = {
        outputDir: testOutputDir,
        outputName: 'sprite',
        pngSprite: {
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
          sheet: mockSpriteSheet,
        },
        svgSprite: mockSvgSprite,
        fileKey: 'test',
        page: 'test',
        pngConfig: { scale: 1, padding: 2 },
        svgConfig: { svgo: true },
      };

      const result = await writeOutput(options);

      // 1x sprite should exist
      expect(await fileExists(result.files.png)).toBe(true);

      // 2x sprite file size should be 0 (not written)
      expect(result.stats.fileSize.png2x).toBe(0);
    });

    it('should handle Windows path separators', async () => {
      const windowsPath = 'D:\\poc\\figma-sprite-tool\\tests\\fixtures\\output\\windows-test';

      const options: WriteOutputOptions = {
        outputDir: windowsPath,
        outputName: 'sprite',
        pngSprite: {
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
          sheet: mockSpriteSheet,
        },
        svgSprite: mockSvgSprite,
        fileKey: 'test',
        page: 'test',
        pngConfig: { scale: 2, padding: 2 },
        svgConfig: { svgo: true },
      };

      await writeOutput(options);

      // Clean up
      await rm(windowsPath, { recursive: true, force: true });
    });
  });

  describe('validateWriteOptions', () => {
    it('should pass for valid options', () => {
      const options: WriteOutputOptions = {
        outputDir: testOutputDir,
        outputName: 'sprite',
        pngSprite: {
          buffer: Buffer.from([]),
          sheet: mockSpriteSheet,
        },
        svgSprite: mockSvgSprite,
        fileKey: 'test',
        page: 'test',
        pngConfig: { scale: 2, padding: 2 },
        svgConfig: { svgo: true },
      };

      expect(() => validateWriteOptions(options)).not.toThrow();
    });

    it('should throw if outputDir is missing', () => {
      const options = {
        outputName: 'sprite',
      } as WriteOutputOptions;

      expect(() => validateWriteOptions(options)).toThrow('outputDir is required');
    });

    it('should throw if outputName is missing', () => {
      const options = {
        outputDir: testOutputDir,
      } as WriteOutputOptions;

      expect(() => validateWriteOptions(options)).toThrow('outputName is required');
    });

    it('should throw if pngSprite is missing', () => {
      const options = {
        outputDir: testOutputDir,
        outputName: 'sprite',
        svgSprite: mockSvgSprite,
      } as WriteOutputOptions;

      expect(() => validateWriteOptions(options)).toThrow('pngSprite is required');
    });

    it('should throw if svgSprite is missing', () => {
      const options = {
        outputDir: testOutputDir,
        outputName: 'sprite',
        pngSprite: {
          buffer: Buffer.from([]),
          sheet: mockSpriteSheet,
        },
      } as WriteOutputOptions;

      expect(() => validateWriteOptions(options)).toThrow('svgSprite is required');
    });
  });
});
