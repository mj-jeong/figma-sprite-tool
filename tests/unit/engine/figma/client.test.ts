/**
 * Tests for Figma REST API client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FigmaClient, createFigmaClient } from '../../../../src/engine/figma/client.js';
import { SpriteError, ErrorCode } from '../../../../src/utils/errors.js';
import { createMockResponse, createMockErrorResponse, createRateLimitHeaders, createMockPngBuffer } from '../../../fixtures/figma/mock-helpers.js';
import fileResponse from '../../../fixtures/figma/file-response.json';
import imagesResponse from '../../../fixtures/figma/images-response.json';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('FigmaClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create client with valid token', () => {
      const client = new FigmaClient({ token: 'test-token' });
      expect(client).toBeInstanceOf(FigmaClient);
    });

    it('should throw error if token is missing', () => {
      expect(() => new FigmaClient({ token: '' })).toThrow(SpriteError);
      expect(() => new FigmaClient({ token: '' })).toThrow(/personal access token is required/);
    });

    it('should apply default configuration', () => {
      const client = new FigmaClient({ token: 'test-token' });
      expect(client).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const client = new FigmaClient({
        token: 'test-token',
        baseUrl: 'https://custom-api.figma.com',
        timeout: 60000,
        retry: { maxRetries: 5, initialDelay: 1000, maxDelay: 30000 },
      });
      expect(client).toBeDefined();
    });
  });

  describe('getFile', () => {
    it('should fetch file data successfully', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(fileResponse, {
          headers: createRateLimitHeaders(),
        }),
      );

      const client = new FigmaClient({ token: 'test-token' });

      const promise = client.getFile('AbCdEf123456');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(fileResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/files/AbCdEf123456'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Figma-Token': 'test-token',
          }),
        }),
      );
    });

    it('should update rate limit info from headers', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(fileResponse, {
          headers: createRateLimitHeaders(45, 100),
        }),
      );

      const client = new FigmaClient({ token: 'test-token' });

      const promise = client.getFile('AbCdEf123456');
      await vi.runAllTimersAsync();
      await promise;

      const rateLimit = client.getRateLimitInfo();
      expect(rateLimit).toMatchObject({
        remaining: 45,
        limit: 100,
      });
    });

    it('should throw error on 401 unauthorized', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse(401, 'Invalid token'),
      );

      const client = new FigmaClient({ token: 'invalid-token' });

      const promise = client.getFile('AbCdEf123456');
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(SpriteError);
      await expect(promise).rejects.toMatchObject({
        code: ErrorCode.FIGMA_AUTH_FAILED,
      });
    });

    it('should throw error on 404 not found', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse(404, 'File not found'),
      );

      const client = new FigmaClient({ token: 'test-token' });

      const promise = client.getFile('NonExistentFile');
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(SpriteError);
      await expect(promise).rejects.toMatchObject({
        code: ErrorCode.FIGMA_FILE_NOT_FOUND,
      });
    });

    it('should handle rate limiting with retry', async () => {
      mockFetch
        .mockResolvedValueOnce(
          createMockResponse({ status: 429, err: 'Rate limited' }, {
            status: 429,
            headers: { 'Retry-After': '1' },
          }),
        )
        .mockResolvedValueOnce(
          createMockResponse(fileResponse, {
            headers: createRateLimitHeaders(),
          }),
        );

      const client = new FigmaClient({ token: 'test-token' });

      const promise = client.getFile('AbCdEf123456');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual(fileResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle network timeout', async () => {
      mockFetch.mockRejectedValue(new Error('TimeoutError'));

      const client = new FigmaClient({ token: 'test-token', timeout: 5000 });

      const promise = client.getFile('AbCdEf123456');
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(SpriteError);
      await expect(promise).rejects.toMatchObject({
        code: ErrorCode.FIGMA_NETWORK_ERROR,
      });
    });
  });

  describe('exportImages', () => {
    it('should export PNG images successfully', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(imagesResponse, {
          headers: createRateLimitHeaders(),
        }),
      );

      const client = new FigmaClient({ token: 'test-token' });

      const promise = client.exportImages('AbCdEf123456', {
        ids: ['10:1', '10:2'],
        format: 'png',
        scale: 2,
        use_absolute_bounds: true,
      });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.err).toBeNull();
      expect(result.images).toHaveProperty('10:1');
      expect(result.images).toHaveProperty('10:2');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/images/AbCdEf123456'),
        expect.anything(),
      );
    });

    it('should export SVG images with options', async () => {
      const svgResponse = {
        err: null,
        images: {
          '10:1': 'https://example.com/icon.svg',
        },
      };

      mockFetch.mockResolvedValue(
        createMockResponse(svgResponse, {
          headers: createRateLimitHeaders(),
        }),
      );

      const client = new FigmaClient({ token: 'test-token' });

      const promise = client.exportImages('AbCdEf123456', {
        ids: ['10:1'],
        format: 'svg',
        svg_include_id: true,
        svg_simplify_stroke: true,
      });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.err).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('svg_include_id=true'),
        expect.anything(),
      );
    });

    it('should throw error if export fails with err message', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(
          { err: 'Export failed', images: {} },
          { headers: createRateLimitHeaders() },
        ),
      );

      const client = new FigmaClient({ token: 'test-token' });

      const promise = client.exportImages('AbCdEf123456', {
        ids: ['10:1'],
        format: 'png',
      });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(SpriteError);
      await expect(promise).rejects.toMatchObject({
        code: ErrorCode.FIGMA_EXPORT_FAILED,
      });
    });

    it('should throw error if any node export returns null URL', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(
          {
            err: null,
            images: {
              '10:1': 'https://example.com/valid.png',
              '10:2': null, // Failed export
            },
          },
          { headers: createRateLimitHeaders() },
        ),
      );

      const client = new FigmaClient({ token: 'test-token' });

      const promise = client.exportImages('AbCdEf123456', {
        ids: ['10:1', '10:2'],
        format: 'png',
      });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(SpriteError);
      await expect(promise).rejects.toMatchObject({
        code: ErrorCode.FIGMA_EXPORT_FAILED,
        context: expect.objectContaining({
          failedNodes: ['10:2'],
        }),
      });
    });
  });

  describe('downloadImage', () => {
    it('should download image successfully', async () => {
      const mockBuffer = createMockPngBuffer();

      mockFetch.mockResolvedValue(
        createMockResponse(mockBuffer, {
          headers: { 'Content-Type': 'image/png' },
        }),
      );

      const client = new FigmaClient({ token: 'test-token' });

      const promise = client.downloadImage('https://example.com/image.png');
      await vi.runAllTimersAsync();
      const buffer = await promise;

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should throw error on download failure', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse(404, 'Image not found'),
      );

      const client = new FigmaClient({ token: 'test-token' });

      const promise = client.downloadImage('https://example.com/nonexistent.png');
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(SpriteError);
      await expect(promise).rejects.toMatchObject({
        code: ErrorCode.FIGMA_EXPORT_FAILED,
      });
    });

    it('should retry on network errors', async () => {
      const mockBuffer = createMockPngBuffer();

      mockFetch
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue(createMockResponse(mockBuffer));

      const client = new FigmaClient({ token: 'test-token' });

      const promise = client.downloadImage('https://example.com/image.png');
      await vi.runAllTimersAsync();
      const buffer = await promise;

      expect(buffer).toBeInstanceOf(Buffer);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('createFigmaClient factory', () => {
    it('should create client from environment variable', () => {
      process.env.FIGMA_TOKEN = 'env-token';
      const client = createFigmaClient();
      expect(client).toBeInstanceOf(FigmaClient);
      delete process.env.FIGMA_TOKEN;
    });

    it('should create client with explicit token', () => {
      const client = createFigmaClient('explicit-token');
      expect(client).toBeInstanceOf(FigmaClient);
    });

    it('should throw error if no token available', () => {
      delete process.env.FIGMA_TOKEN;
      expect(() => createFigmaClient()).toThrow(SpriteError);
      expect(() => createFigmaClient()).toThrow(/personal access token is required/);
    });

    it('should merge custom config', () => {
      const client = createFigmaClient('test-token', {
        timeout: 60000,
        retry: { maxRetries: 5, initialDelay: 1000, maxDelay: 30000 },
      });
      expect(client).toBeInstanceOf(FigmaClient);
    });
  });
});
