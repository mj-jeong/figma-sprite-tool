/**
 * Tests for Figma file tree parser
 */

import { describe, it, expect } from 'vitest';
import {
  parseIconNodes,
  parseIconVariants,
  generateIconId,
  sanitizeIconId,
  createIconMetadata,
} from '../../../../src/engine/figma/parser.js';
import type { SpriteConfig } from '../../../../src/engine/types/config.js';
import { SpriteError, ErrorCode } from '../../../../src/utils/errors.js';
import fileResponse from '../../../fixtures/figma/file-response.json';

// Mock config for testing
const mockConfig: SpriteConfig = {
  figma: {
    fileKey: 'test-file',
    page: 'Design System / Icons',
    scope: {
      type: 'prefix',
      value: 'ic/',
    },
    personalAccessToken: undefined,
  },
  output: {
    dir: './assets/sprite',
    name: 'sprite',
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
    idFormat: '{name}-{size}-{style}{theme?--{theme}}',
    sanitize: true,
  },
};

describe('Figma parser', () => {
  describe('parseIconNodes', () => {
    it('should parse icon nodes from file response', () => {
      const nodes = parseIconNodes(fileResponse as any, mockConfig);

      expect(nodes.length).toBe(4); // 4 visible icons with ic/ prefix
      expect(nodes.every((node) => node.name.startsWith('ic/'))).toBe(true);
      expect(nodes.every((node) => node.visible)).toBe(true);
    });

    it('should filter by page path', () => {
      const nodes = parseIconNodes(fileResponse as any, mockConfig);

      // All nodes should be from the specified page
      expect(nodes.length).toBeGreaterThan(0);
    });

    it('should filter by prefix', () => {
      const nodes = parseIconNodes(fileResponse as any, mockConfig);

      // All nodes should start with ic/
      expect(nodes.every((node) => node.name.startsWith('ic/'))).toBe(true);

      // Should not include "other/not-icon"
      expect(nodes.find((node) => node.name === 'other/not-icon')).toBeUndefined();
    });

    it('should exclude invisible nodes', () => {
      const nodes = parseIconNodes(fileResponse as any, mockConfig);

      // Should not include "ic/hidden-24-line" (visible: false)
      expect(nodes.find((node) => node.name === 'ic/hidden-24-line')).toBeUndefined();
    });

    it('should throw error if page not found', () => {
      const configWithInvalidPage = {
        ...mockConfig,
        figma: {
          ...mockConfig.figma,
          page: 'Non-Existent Page',
        },
      };

      expect(() => parseIconNodes(fileResponse as any, configWithInvalidPage)).toThrow(
        SpriteError,
      );
      expect(() => parseIconNodes(fileResponse as any, configWithInvalidPage)).toThrow(
        /Page not found/,
      );
    });

    it('should throw error if no icons match filter', () => {
      const configWithInvalidPrefix = {
        ...mockConfig,
        figma: {
          ...mockConfig.figma,
          scope: {
            type: 'prefix' as const,
            value: 'nonexistent/',
          },
        },
      };

      expect(() => parseIconNodes(fileResponse as any, configWithInvalidPrefix)).toThrow(
        SpriteError,
      );
      expect(() => parseIconNodes(fileResponse as any, configWithInvalidPrefix)).toThrow(
        /No icons found/,
      );
    });

    it('should include bounding box information', () => {
      const nodes = parseIconNodes(fileResponse as any, mockConfig);

      nodes.forEach((node) => {
        expect(node.bounds).toBeDefined();
        expect(node.bounds.width).toBeGreaterThan(0);
        expect(node.bounds.height).toBeGreaterThan(0);
      });
    });
  });

  describe('parseIconVariants', () => {
    it('should parse standard icon name format', () => {
      const variants = parseIconVariants('ic/home-24-line', mockConfig);

      expect(variants).toEqual({
        name: 'home',
        size: '24',
        style: 'line',
      });
    });

    it('should parse icon name with theme', () => {
      const variants = parseIconVariants('ic/user-32-line--dark', mockConfig);

      expect(variants).toEqual({
        name: 'user',
        size: '32',
        style: 'line',
        theme: 'dark',
      });
    });

    it('should parse multi-word icon names', () => {
      const variants = parseIconVariants('ic/arrow-up-right-24-filled', mockConfig);

      expect(variants).toEqual({
        name: 'arrow-up-right',
        size: '24',
        style: 'filled',
      });
    });

    it('should handle icon names with hyphens', () => {
      const variants = parseIconVariants('ic/double-arrow-left-16-line', mockConfig);

      expect(variants).toEqual({
        name: 'double-arrow-left',
        size: '16',
        style: 'line',
      });
    });

    it('should fallback for non-standard format', () => {
      const variants = parseIconVariants('ic/simple', mockConfig);

      expect(variants.name).toBe('simple');
    });
  });

  describe('generateIconId', () => {
    it('should generate ID from standard variants', () => {
      const variants = {
        name: 'home',
        size: '24',
        style: 'line',
      };

      const id = generateIconId(variants, '{name}-{size}-{style}', false);
      expect(id).toBe('home-24-line');
    });

    it('should handle optional theme variant', () => {
      const variantsWithTheme = {
        name: 'user',
        size: '32',
        style: 'line',
        theme: 'dark',
      };

      const id = generateIconId(
        variantsWithTheme,
        '{name}-{size}-{style}{theme?--{theme}}',
        false,
      );
      expect(id).toBe('user-32-line--dark');
    });

    it('should omit optional variant if not present', () => {
      const variantsWithoutTheme = {
        name: 'search',
        size: '24',
        style: 'filled',
      };

      const id = generateIconId(
        variantsWithoutTheme,
        '{name}-{size}-{style}{theme?--{theme}}',
        false,
      );
      expect(id).toBe('search-24-filled');
    });

    it('should sanitize ID when enabled', () => {
      const variants = {
        name: 'Home & User',
        size: '24',
        style: 'line',
      };

      const id = generateIconId(variants, '{name}-{size}-{style}', true);
      expect(id).toBe('home-user-24-line');
    });
  });

  describe('sanitizeIconId', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeIconId('HOME-24-Line')).toBe('home-24-line');
    });

    it('should replace spaces with hyphens', () => {
      expect(sanitizeIconId('home icon 24')).toBe('home-icon-24');
    });

    it('should remove special characters', () => {
      expect(sanitizeIconId('home@icon#24')).toBe('homeicon24');
    });

    it('should collapse multiple hyphens', () => {
      expect(sanitizeIconId('home---icon--24')).toBe('home-icon-24');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(sanitizeIconId('-home-icon-24-')).toBe('home-icon-24');
    });

    it('should add prefix if starts with number', () => {
      expect(sanitizeIconId('24-home')).toBe('icon-24-home');
    });

    it('should handle mixed case with special chars', () => {
      expect(sanitizeIconId('Home & User / Settings')).toBe('home-user-settings');
    });
  });

  describe('createIconMetadata', () => {
    it('should create metadata map with unique IDs', () => {
      const nodes = parseIconNodes(fileResponse as any, mockConfig);
      const metadata = createIconMetadata(nodes, mockConfig);

      expect(metadata.size).toBe(4);
      expect(metadata.has('home-24-line')).toBe(true);
      expect(metadata.has('search-24-line')).toBe(true);
      expect(metadata.has('settings-16-filled')).toBe(true);
      expect(metadata.has('user-32-line--dark')).toBe(true);
    });

    it('should keep only first occurrence on duplicate icon IDs', () => {
      const duplicateNodes: ParsedIconNode[] = [
        {
          nodeId: '10:1',
          exportId: '10:1',
          name: 'ic/home-24-line',
          type: 'COMPONENT',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
        {
          nodeId: '10:2',
          exportId: '10:2',
          name: 'ic/home-24-line', // Duplicate name -> same icon ID
          type: 'COMPONENT',
          bounds: { x: 30, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ];

      const metadata = createIconMetadata(duplicateNodes, mockConfig);

      // Should keep only the first occurrence
      expect(metadata.size).toBe(1);
      expect(metadata.has('home-24-line')).toBe(true);
      expect(metadata.get('home-24-line')?.nodeId).toBe('10:1'); // First one
    });

    it('should handle multiple INSTANCE nodes with same componentId', () => {
      const instanceNodes: ParsedIconNode[] = [
        {
          nodeId: '10:1',
          exportId: '10:1',
          name: 'ic/home-24-line',
          type: 'INSTANCE',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
        {
          nodeId: '10:2',
          exportId: '10:2',
          name: 'ic/home-24-line-copy', // Different Figma name
          type: 'INSTANCE',
          bounds: { x: 30, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ];

      const metadata = createIconMetadata(instanceNodes, mockConfig);

      // Both should be included with different icon IDs (due to different Figma names)
      // But if they generate the same ID, only first is kept
      expect(metadata.size).toBeGreaterThanOrEqual(1);

      // Verify first instance is included
      const entries = Array.from(metadata.values());
      expect(entries[0].exportId).toBe('10:1');
    });

    it('should preserve node metadata in map', () => {
      const nodes = parseIconNodes(fileResponse as any, mockConfig);
      const metadata = createIconMetadata(nodes, mockConfig);

      const homeIcon = metadata.get('home-24-line');
      expect(homeIcon).toBeDefined();
      expect(homeIcon!.nodeId).toBe('10:1');
      expect(homeIcon!.name).toBe('ic/home-24-line');
      expect(homeIcon!.bounds).toMatchObject({
        x: 0,
        y: 0,
        width: 24,
        height: 24,
      });
    });
  });

  describe('sanitizeSingleVariantValue usage validation', () => {
    it('should correctly sanitize individual variant values', () => {
      // This test verifies correct usage patterns
      const variants = {
        name: 'Home Icon',
        size: '24',
        style: 'filled/bold',
      };

      const id = generateIconId(variants, '{name}-{size}-{style}', true);

      // Expected: 'home-icon-24-filled-bold'
      // Each variant value is sanitized individually before combination
      expect(id).toBe('home-icon-24-filled-bold');
    });

    it('should handle unicode characters in variant values', () => {
      const variants = {
        name: '홈',
        size: '24',
      };

      const id = generateIconId(variants, '{name}-{size}', true);
      expect(id).toBe('홈-24'); // Korean characters preserved
    });

    it('should handle special characters in variant values', () => {
      const variants = {
        name: 'home@icon!',
        size: '24x24',
      };

      const id = generateIconId(variants, '{name}-{size}', true);
      expect(id).toBe('homeicon-24x24'); // Special chars removed
    });

    it('should collapse multiple hyphens in variant values', () => {
      const variants = {
        name: 'home---icon',
        size: '24',
      };

      const id = generateIconId(variants, '{name}-{size}', true);
      expect(id).toBe('home-icon-24'); // Multiple hyphens collapsed
    });

    it('should handle empty string variant values', () => {
      const variants = {
        name: 'home',
        size: '',
        style: 'filled',
      };

      const id = generateIconId(variants, '{name}-{size}-{style}', true);
      expect(id).toBe('home--filled'); // Empty value results in double hyphen
    });

    it('should NOT sanitize template structure (like --)', () => {
      // This verifies that only VALUES are sanitized, not the template
      const variants = {
        name: 'home',
        theme: 'dark',
      };

      const id = generateIconId(variants, '{name}{theme?--{theme}}', true);
      expect(id).toBe('home--dark'); // Template's '--' is preserved
    });
  });

  describe('instance export ID behavior', () => {
    it('should use INSTANCE nodeId as exportId', () => {
      const instanceFile = {
        document: {
          id: '0:0',
          name: 'Document',
          type: 'DOCUMENT',
          children: [
            {
              id: '1:1',
              name: 'Design System',
              type: 'CANVAS',
              children: [
                {
                  id: '2:1',
                  name: 'Icons',
                  type: 'FRAME',
                  children: [
                    {
                      id: '3:1',
                      name: 'ic/home-24-line',
                      type: 'INSTANCE',
                      componentId: 'comp:123',
                      absoluteBoundingBox: { x: 0, y: 0, width: 24, height: 24 },
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
        components: {
          'comp:123': {
            key: 'k',
            name: 'Component',
            description: '',
          },
        },
      };

      const nodes = parseIconNodes(instanceFile as any, mockConfig);
      expect(nodes).toHaveLength(1);
      expect(nodes[0].nodeId).toBe('3:1');
      expect(nodes[0].exportId).toBe('3:1');
    });
  });
});
