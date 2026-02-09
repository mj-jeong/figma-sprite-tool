import { describe, it, expect } from 'vitest';

describe('Figma URL parsing', () => {
  it('should extract fileKey from standard /file/ URL', () => {
    const url = 'https://www.figma.com/file/AbCdEf123456/File-Name';
    const match = url.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
    expect(match?.[1]).toBe('AbCdEf123456');
  });

  it('should extract fileKey from /design/ URL', () => {
    const url = 'https://figma.com/design/XyZ789/Another-File';
    const match = url.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
    expect(match?.[1]).toBe('XyZ789');
  });

  it('should extract fileKey without www subdomain', () => {
    const url = 'https://figma.com/file/Test123/My-File';
    const match = url.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
    expect(match?.[1]).toBe('Test123');
  });

  it('should handle fileKey with mixed case', () => {
    const url = 'https://www.figma.com/file/AbCd123EfGh/File';
    const match = url.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
    expect(match?.[1]).toBe('AbCd123EfGh');
  });

  it('should return null for invalid URL', () => {
    const url = 'https://example.com/not-figma';
    const match = url.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
    expect(match).toBeNull();
  });

  it('should return null for incomplete Figma URL', () => {
    const url = 'https://figma.com/other-path';
    const match = url.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
    expect(match).toBeNull();
  });
});
