import { describe, it, expect } from 'vitest';
import { sanitizePageDir, resolvePageOutputDir } from '../../../../src/cli/commands/generate.js';

describe('generate output path helpers', () => {
  describe('sanitizePageDir', () => {
    it('should replace slashes and spaces safely', () => {
      expect(sanitizePageDir('Design System / Icons')).toBe('Design-System-Icons');
    });

    it('should remove forbidden path characters', () => {
      expect(sanitizePageDir('A:B*C?"D<E>F|G')).toBe('ABCDEFG');
    });

    it('should return fallback for empty page', () => {
      expect(sanitizePageDir('   ')).toBe('unknown-page');
    });

    it('should preserve unicode letters', () => {
      expect(sanitizePageDir('아이콘 가이드 / 다크')).toBe('아이콘-가이드-다크');
    });
  });

  describe('resolvePageOutputDir', () => {
    it('should append sanitized page to base dir', () => {
      expect(resolvePageOutputDir('assets/sprite', 'FRO_MAI_001_02')).toBe(
        'assets/sprite/FRO_MAI_001_02',
      );
    });

    it('should work with custom output base', () => {
      expect(resolvePageOutputDir('./tmp-output', 'Design System / Icons')).toBe(
        './tmp-output/Design-System-Icons',
      );
    });
  });
});
