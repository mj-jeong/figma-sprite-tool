/**
 * Tests for retry utility with exponential backoff
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, isRetryableError, createFigmaRetryOptions, withRateLimitRetry } from '../../../src/utils/retry.js';
import { SpriteError, ErrorCode } from '../../../src/utils/errors.js';

describe('retry utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  describe('withRetry', () => {
    it('should return result on first successful attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const promise = withRetry(fn, { maxRetries: 3, initialDelay: 100 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.value).toBe('success');
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');

      const promise = withRetry(fn, { maxRetries: 3, initialDelay: 100 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.value).toBe('success');
      expect(result.attempts).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw SpriteError after max retries exhausted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('persistent error'));

      const promise = withRetry(fn, { maxRetries: 2, initialDelay: 100 });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(SpriteError);
      await expect(promise).rejects.toMatchObject({
        code: ErrorCode.FIGMA_NETWORK_ERROR,
      });
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('non-retryable error'));

      const promise = withRetry(fn, {
        maxRetries: 3,
        initialDelay: 100,
        shouldRetry: () => false,
      });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(SpriteError);
      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should apply exponential backoff delays', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      vi.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      }) as typeof setTimeout);

      const promise = withRetry(fn, {
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        jitter: 0, // Disable jitter for predictable testing
      });
      await vi.runAllTimersAsync();
      await promise;

      // Delays should be: 1000, 2000 (exponential backoff)
      expect(delays[0]).toBe(1000);
      expect(delays[1]).toBe(2000);
    });

    it('should respect maxDelay cap', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValue('success');

      const delays: number[] = [];
      vi.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void, delay: number) => {
        delays.push(delay);
        return setTimeout(callback, 0);
      }) as typeof setTimeout);

      const promise = withRetry(fn, {
        maxRetries: 3,
        initialDelay: 10000,
        backoffMultiplier: 2,
        maxDelay: 15000,
        jitter: 0,
      });
      await vi.runAllTimersAsync();
      await promise;

      // Second delay should be capped at maxDelay
      expect(delays[0]).toBe(10000);
      expect(delays[1]).toBe(15000); // Capped (would be 20000)
    });
  });

  describe('isRetryableError', () => {
    it('should identify network error codes as retryable', () => {
      const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];

      for (const code of networkErrors) {
        const error = new Error('network error') as NodeJS.ErrnoException;
        error.code = code;
        expect(isRetryableError(error)).toBe(true);
      }
    });

    it('should identify rate limit (429) as retryable', () => {
      const error = new Error('Rate limited') as Error & { statusCode: number };
      error.statusCode = 429;
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify server errors (5xx) as retryable', () => {
      for (const status of [500, 502, 503, 504]) {
        const error = new Error('Server error') as Error & { statusCode: number };
        error.statusCode = status;
        expect(isRetryableError(error)).toBe(true);
      }
    });

    it('should identify timeout messages as retryable', () => {
      const timeoutMessages = [
        'Request timeout',
        'Operation timed out',
        'ETIMEDOUT',
        'socket hang up',
      ];

      for (const message of timeoutMessages) {
        const error = new Error(message);
        expect(isRetryableError(error)).toBe(true);
      }
    });

    it('should not identify client errors as retryable', () => {
      const error = new Error('Client error') as Error & { statusCode: number };
      error.statusCode = 400;
      expect(isRetryableError(error)).toBe(false);
    });

    it('should not identify auth errors as retryable', () => {
      const error = new Error('Unauthorized') as Error & { statusCode: number };
      error.statusCode = 401;
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('createFigmaRetryOptions', () => {
    it('should create default Figma retry options', () => {
      const options = createFigmaRetryOptions();

      expect(options).toEqual({
        maxRetries: 3,
        initialDelay: 2000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        jitter: 0.2,
      });
    });

    it('should merge custom options with defaults', () => {
      const options = createFigmaRetryOptions({ maxRetries: 5, initialDelay: 1000 });

      expect(options).toEqual({
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        jitter: 0.2,
      });
    });
  });

  describe('withRateLimitRetry', () => {
    it('should handle successful response', async () => {
      const mockResponse = {
        status: 200,
        headers: new Headers(),
      } as Response;

      const fn = vi.fn().mockResolvedValue(mockResponse);
      const processor = vi.fn().mockResolvedValue({ data: 'success' });

      const promise = withRateLimitRetry(fn, processor, { maxRetries: 3, initialDelay: 100 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.value).toEqual({ data: 'success' });
      expect(processor).toHaveBeenCalledWith(mockResponse);
    });

    it('should retry on 429 rate limit', async () => {
      const rateLimitResponse = {
        status: 429,
        headers: new Headers({ 'Retry-After': '2' }),
      } as Response;

      const successResponse = {
        status: 200,
        headers: new Headers(),
      } as Response;

      const fn = vi
        .fn()
        .mockResolvedValueOnce(rateLimitResponse)
        .mockResolvedValue(successResponse);

      const processor = vi.fn().mockResolvedValue({ data: 'success' });

      const promise = withRateLimitRetry(fn, processor, { maxRetries: 3, initialDelay: 100 });
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.value).toEqual({ data: 'success' });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw SpriteError after max retries on persistent 429', async () => {
      const rateLimitResponse = {
        status: 429,
        headers: new Headers({ 'Retry-After': '1' }),
      } as Response;

      const fn = vi.fn().mockResolvedValue(rateLimitResponse);
      const processor = vi.fn();

      const promise = withRateLimitRetry(fn, processor, { maxRetries: 2, initialDelay: 100 });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(SpriteError);
      await expect(promise).rejects.toMatchObject({
        code: ErrorCode.FIGMA_RATE_LIMITED,
      });
    });

    it('should use Retry-After header for delay calculation', async () => {
      const rateLimitResponse = {
        status: 429,
        headers: new Headers({ 'Retry-After': '5' }),
      } as Response;

      const successResponse = {
        status: 200,
        headers: new Headers(),
      } as Response;

      const fn = vi
        .fn()
        .mockResolvedValueOnce(rateLimitResponse)
        .mockResolvedValue(successResponse);

      const processor = vi.fn().mockResolvedValue({ data: 'success' });

      const delays: number[] = [];
      vi.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void, delay: number) => {
        delays.push(delay);
        return setTimeout(callback, 0);
      }) as typeof setTimeout);

      const promise = withRateLimitRetry(fn, processor, { maxRetries: 3 });
      await vi.runAllTimersAsync();
      await promise;

      // Should use Retry-After value (5 seconds = 5000ms)
      expect(delays[0]).toBe(5000);
    });
  });
});
