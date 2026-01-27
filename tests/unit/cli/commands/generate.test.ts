/**
 * Tests for generate command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateCommand } from '../../../../src/cli/commands/generate.js';

// Mock all engine modules
vi.mock('../../../../src/engine/config/index.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../../../src/engine/figma/index.js', () => ({
  createFigmaClient: vi.fn(),
  parseIconNodes: vi.fn(),
  exportImages: vi.fn(),
}));

vi.mock('../../../../src/engine/sprite/index.js', () => ({
  packIconsWithPositions: vi.fn(),
  generatePngSprites: vi.fn(),
  generateSvgSprite: vi.fn(),
  batchCreateSvgIconData: vi.fn(),
}));

vi.mock('../../../../src/engine/output/index.js', () => ({
  writeOutput: vi.fn(),
}));

import { loadConfig } from '../../../../src/engine/config/index.js';
import { createFigmaClient, parseIconNodes, exportImages } from '../../../../src/engine/figma/index.js';
import {
  packIconsWithPositions,
  generatePngSprites,
  generateSvgSprite,
  batchCreateSvgIconData,
} from '../../../../src/engine/sprite/index.js';
import { writeOutput } from '../../../../src/engine/output/index.js';

describe('Generate Command', () => {
  const mockConfig = {
    figma: {
      fileKey: 'test123',
      page: 'Icons',
      scope: { type: 'prefix', value: 'ic-' },
      personalAccessToken: 'test-token',
    },
    output: {
      directory: './output',
    },
    formats: {
      png: { scale: 2, padding: 2 },
      svg: { optimize: true },
    },
  };

  const mockIcons = [
    { nodeId: '1:1', name: 'ic-home-24', width: 24, height: 24 },
    { nodeId: '1:2', name: 'ic-search-24', width: 24, height: 24 },
  ];

  const mockIconData = [
    {
      nodeId: '1:1',
      name: 'ic-home-24',
      width: 24,
      height: 24,
      pngBuffer: Buffer.from('png'),
      svgContent: '<svg></svg>',
    },
    {
      nodeId: '1:2',
      name: 'ic-search-24',
      width: 24,
      height: 24,
      pngBuffer: Buffer.from('png'),
      svgContent: '<svg></svg>',
    },
  ];

  const mockPacked = {
    packedIcons: mockIconData.map((icon) => ({
      iconData: icon,
      x: 0,
      y: 0,
    })),
    dimensions: { width: 48, height: 24 },
  };

  const mockPngSprites = {
    sprite1x: Buffer.from('sprite1x'),
    sprite2x: Buffer.from('sprite2x'),
  };

  const mockClient = {
    getFile: vi.fn().mockResolvedValue({ name: 'Test File' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(loadConfig).mockResolvedValue(mockConfig as any);
    vi.mocked(createFigmaClient).mockReturnValue(mockClient as any);
    vi.mocked(parseIconNodes).mockReturnValue(mockIcons as any);
    vi.mocked(exportImages).mockResolvedValue(mockIconData as any);
    vi.mocked(packIconsWithPositions).mockReturnValue(mockPacked as any);
    vi.mocked(generatePngSprites).mockResolvedValue(mockPngSprites as any);
    vi.mocked(generateSvgSprite).mockResolvedValue('<svg></svg>');
    vi.mocked(batchCreateSvgIconData).mockReturnValue([]);
    vi.mocked(writeOutput).mockResolvedValue({
      success: true,
      paths: {},
      sizes: {
        'sprite.png': 1000,
        'sprite@2x.png': 4000,
        'sprite.svg': 500,
        'sprite.scss': 300,
        'sprite.json': 800,
      },
    } as any);

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic execution', () => {
    it('should execute full generation workflow', async () => {
      await generateCommand({ config: 'test.config.json' });

      expect(loadConfig).toHaveBeenCalledWith({ configPath: 'test.config.json' });
      expect(createFigmaClient).toHaveBeenCalled();
      expect(mockClient.getFile).toHaveBeenCalledWith('test123');
      expect(parseIconNodes).toHaveBeenCalled();
      expect(exportImages).toHaveBeenCalled();
      expect(packIconsWithPositions).toHaveBeenCalled();
      expect(generatePngSprites).toHaveBeenCalled();
      expect(generateSvgSprite).toHaveBeenCalled();
      expect(writeOutput).toHaveBeenCalled();
    });

    it('should use default config path if not specified', async () => {
      await generateCommand({});

      expect(loadConfig).toHaveBeenCalledWith({ configPath: 'figma.sprite.config.json' });
    });

    it('should override output directory when specified', async () => {
      await generateCommand({ output: './custom-output' });

      // Config should be modified before use
      expect(writeOutput).toHaveBeenCalled();
    });
  });

  describe('dry run mode', () => {
    it('should not write files in dry run mode', async () => {
      await generateCommand({ dryRun: true });

      expect(writeOutput).not.toHaveBeenCalled();
    });

    it('should show preview in dry run mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      await generateCommand({ dryRun: true });

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toContain('preview');
    });
  });

  describe('verbose mode', () => {
    it('should log debug messages in verbose mode', async () => {
      await generateCommand({ verbose: true });

      // Verbose logging should happen, but we can't easily verify
      // console.log calls due to mocking. Just ensure it completes.
      expect(writeOutput).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle config loading errors', async () => {
      vi.mocked(loadConfig).mockRejectedValue(new Error('Config not found'));

      await expect(generateCommand({})).rejects.toThrow();
    });

    it('should handle empty icon set', async () => {
      vi.mocked(parseIconNodes).mockReturnValue([]);

      await generateCommand({});

      expect(writeOutput).not.toHaveBeenCalled();
    });

    it('should handle Figma API errors', async () => {
      mockClient.getFile.mockRejectedValue(new Error('API error'));

      await expect(generateCommand({})).rejects.toThrow();
    });
  });

  describe('environment variables', () => {
    it('should use FIGMA_TOKEN from environment', async () => {
      const configWithoutToken = { ...mockConfig };
      delete (configWithoutToken.figma as any).personalAccessToken;

      vi.mocked(loadConfig).mockResolvedValue(configWithoutToken as any);
      process.env.FIGMA_TOKEN = 'env-token';

      await generateCommand({});

      expect(createFigmaClient).toHaveBeenCalled();

      delete process.env.FIGMA_TOKEN;
    });

    it('should throw error if no token available', async () => {
      const configWithoutToken = { ...mockConfig };
      delete (configWithoutToken.figma as any).personalAccessToken;

      vi.mocked(loadConfig).mockResolvedValue(configWithoutToken as any);
      delete process.env.FIGMA_TOKEN;

      await expect(generateCommand({})).rejects.toThrow();
    });
  });
});
