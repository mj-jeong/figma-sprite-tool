/**
 * Hash calculator unit tests
 */

import { describe, it, expect } from 'vitest';
import {
  calculateHash,
  calculatePngHash,
  calculateSvgHash,
  calculateCombinedHash,
} from '../../../../src/engine/output/hash-calculator.js';

describe('hash-calculator', () => {
  describe('calculateHash', () => {
    it('should calculate SHA-256 hash for Buffer', () => {
      const buffer = Buffer.from('test content');
      const hash = calculateHash(buffer);

      expect(hash).toBe('6ae8a755'); // First 8 chars of SHA-256
      expect(hash).toHaveLength(8);
    });

    it('should calculate SHA-256 hash for string', () => {
      const content = 'test content';
      const hash = calculateHash(content);

      expect(hash).toHaveLength(8);
      expect(hash).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should produce same hash for same content', () => {
      const content = 'deterministic test';
      const hash1 = calculateHash(content);
      const hash2 = calculateHash(content);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different content', () => {
      const hash1 = calculateHash('content A');
      const hash2 = calculateHash('content B');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty content', () => {
      const hash = calculateHash('');

      expect(hash).toHaveLength(8);
      expect(hash).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should handle large content', () => {
      const largeContent = 'x'.repeat(1000000); // 1MB
      const hash = calculateHash(largeContent);

      expect(hash).toHaveLength(8);
      expect(hash).toMatch(/^[a-f0-9]{8}$/);
    });
  });

  describe('calculatePngHash', () => {
    it('should calculate hash for PNG buffer', () => {
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG signature
      const hash = calculatePngHash(buffer);

      expect(hash).toHaveLength(8);
      expect(hash).toMatch(/^[a-f0-9]{8}$/);
    });
  });

  describe('calculateSvgHash', () => {
    it('should calculate hash for SVG content', () => {
      const svg = '<svg><path d="M0 0"/></svg>';
      const hash = calculateSvgHash(svg);

      expect(hash).toHaveLength(8);
      expect(hash).toMatch(/^[a-f0-9]{8}$/);
    });
  });

  describe('calculateCombinedHash', () => {
    it('should calculate combined hash for multiple contents', () => {
      const contents = [Buffer.from('part1'), 'part2', Buffer.from('part3')];
      const hash = calculateCombinedHash(contents);

      expect(hash).toHaveLength(8);
      expect(hash).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should produce deterministic hash', () => {
      const contents = ['a', 'b', 'c'];
      const hash1 = calculateCombinedHash(contents);
      const hash2 = calculateCombinedHash(contents);

      expect(hash1).toBe(hash2);
    });

    it('should handle empty array', () => {
      const hash = calculateCombinedHash([]);

      expect(hash).toHaveLength(8);
      expect(hash).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should be order-dependent', () => {
      const hash1 = calculateCombinedHash(['a', 'b']);
      const hash2 = calculateCombinedHash(['b', 'a']);

      expect(hash1).not.toBe(hash2);
    });
  });
});
