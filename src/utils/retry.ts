/**
 * Retry utility with exponential backoff
 * Handles network errors, timeouts, and rate limiting
 */

import { SpriteError, ErrorCode } from './errors.js';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Jitter factor to randomize delays (0-1, default: 0.1) */
  jitter?: number;
  /** Function to determine if error is retryable */
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: 0.1,
};

/**
 * Retry result containing attempt information
 */
export interface RetryResult<T> {
  /** Result value */
  value: T;
  /** Number of attempts made */
  attempts: number;
  /** Total time spent retrying in milliseconds */
  totalTime: number;
}

/**
 * Execute a function with exponential backoff retry logic
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Promise with retry result
 * @throws SpriteError if all retries exhausted
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => fetch('https://api.figma.com/...'),
 *   { maxRetries: 3, initialDelay: 1000 }
 * );
 * ```
 */
export async function withRetry<T>(fn: () => Promise<T>, options: Partial<RetryOptions> = {}): Promise<RetryResult<T>> {
  const opts: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const startTime = Date.now();

  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt <= opts.maxRetries) {
    try {
      const value = await fn();
      return {
        value,
        attempts: attempt + 1,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempt++;

      // Check if we should retry
      const shouldRetry = opts.shouldRetry ? opts.shouldRetry(lastError, attempt) : isRetryableError(lastError);

      if (!shouldRetry || attempt > opts.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = calculateDelay(attempt, opts);

      // Wait before next attempt
      await sleep(delay);
    }
  }

  // All retries exhausted - preserve original error if it's a SpriteError
  // Non-retryable errors (401, 404) should keep their original error codes
  if (lastError instanceof SpriteError) {
    throw lastError;
  }

  // For generic errors, wrap in FIGMA_NETWORK_ERROR
  throw new SpriteError(
    ErrorCode.FIGMA_NETWORK_ERROR,
    `Operation failed after ${attempt} attempts`,
    {
      attempts: attempt,
      totalTime: Date.now() - startTime,
      lastError: lastError?.message,
    },
    false,
  );
}

/**
 * Calculate delay for retry attempt using exponential backoff with jitter
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const { initialDelay, maxDelay, backoffMultiplier = 2, jitter = 0.1 } = options;

  // Exponential backoff: initialDelay * (multiplier ^ (attempt - 1))
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter: random value between (1 - jitter) and (1 + jitter) times the delay
  const jitterRange = cappedDelay * jitter;
  const jitteredDelay = cappedDelay + (Math.random() * 2 - 1) * jitterRange;

  return Math.max(0, jitteredDelay);
}

/**
 * Sleep for specified milliseconds
 * Note: Use vi.runAllTimersAsync() in tests with fake timers to advance time
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Determine if an error is retryable
 *
 * Strategy:
 * - SpriteError: Use `recoverable` flag (false for 401, 404, etc.)
 * - Errors with HTTP 4xx status codes: Non-retryable (client errors)
 * - Errors with HTTP 429, 5xx status codes: Retryable (rate limit, server errors)
 * - All other errors: Retry by default (network errors, timeouts, unknown failures)
 *
 * This ensures:
 * - Non-retryable business errors (401, 404) throw immediately
 * - Transient failures (network, timeout, server errors) are retried
 * - Unknown errors are retried (safe default for resilience)
 */
export function isRetryableError(error: Error): boolean {
  // Check if it's a SpriteError - use recoverable flag to determine retry
  // Non-retryable SpriteErrors: 401 FIGMA_AUTH_FAILED, 404 FIGMA_FILE_NOT_FOUND
  if (error instanceof SpriteError) {
    return error.recoverable;
  }

  // Check for HTTP status codes (if error has statusCode property)
  if ('statusCode' in error) {
    const statusCode = (error as { statusCode: number }).statusCode;
    // Non-retryable: 4xx client errors (except 429 rate limiting)
    if (statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
      return false;
    }
    // Retryable: 429 rate limiting and 5xx server errors
    if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
      return true;
    }
  }

  // For all other errors (generic Error, network errors, etc.):
  // Default to RETRYABLE for resilience against transient failures
  // This includes: network errors, timeouts, unknown failures
  return true;
}

/**
 * Create a retry options configuration for Figma API calls
 * Optimized for Figma's rate limiting (30 requests/minute)
 */
export function createFigmaRetryOptions(overrides?: Partial<RetryOptions>): RetryOptions {
  return {
    maxRetries: 3,
    initialDelay: 2000, // Start with 2 seconds for rate limiting
    maxDelay: 60000, // Up to 1 minute for severe rate limiting
    backoffMultiplier: 2,
    jitter: 0.2, // More jitter for distributed requests
    ...overrides,
  };
}

/**
 * Retry with specific handling for rate limit errors
 * Extracts Retry-After header if available
 *
 * Error preservation rules:
 * - 429 exhausted → FIGMA_RATE_LIMITED
 * - Non-retryable SpriteError (401, 404) → preserve original error code
 * - Retryable errors exhausted → FIGMA_NETWORK_ERROR
 */
export async function withRateLimitRetry<T>(
  fn: () => Promise<Response>,
  processor: (response: Response) => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<RetryResult<T>> {
  const opts = createFigmaRetryOptions(options);
  const startTime = Date.now();

  let lastError: Error | undefined;
  let attempt = 0;
  let wasRateLimited = false;

  while (attempt <= opts.maxRetries) {
    try {
      const response = await fn();

      // Handle rate limiting
      if (response.status === 429) {
        wasRateLimited = true;
        attempt++;

        if (attempt > opts.maxRetries) {
          throw new SpriteError(
            ErrorCode.FIGMA_RATE_LIMITED,
            'Rate limit exceeded after maximum retries',
            {
              attempts: attempt,
              retryAfter: response.headers.get('Retry-After'),
            },
            false,
          );
        }

        // Use Retry-After header if available
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : calculateDelay(attempt, opts);

        await sleep(delay);
        continue;
      }

      // Process successful response
      const value = await processor(response);
      return {
        value,
        attempts: attempt + 1,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempt++;

      // Check if error is retryable
      const shouldRetry = isRetryableError(lastError);

      // For non-retryable errors (401, 404), throw immediately without wrapping
      if (!shouldRetry) {
        throw lastError;
      }

      // If all retries exhausted, break to handle error below
      if (attempt > opts.maxRetries) {
        break;
      }

      const delay = calculateDelay(attempt, opts);
      await sleep(delay);
    }
  }

  // All retries exhausted
  // If rate limited, throw specific rate limit error
  if (wasRateLimited) {
    throw new SpriteError(
      ErrorCode.FIGMA_RATE_LIMITED,
      `Rate limit exceeded after ${attempt} attempts`,
      {
        attempts: attempt,
        totalTime: Date.now() - startTime,
      },
      false,
    );
  }

  // Preserve original SpriteError if present (should be retryable errors only)
  if (lastError instanceof SpriteError) {
    throw lastError;
  }

  // For generic errors, wrap in FIGMA_NETWORK_ERROR
  throw new SpriteError(
    ErrorCode.FIGMA_NETWORK_ERROR,
    `Operation failed after ${attempt} attempts: ${lastError?.message}`,
    {
      attempts: attempt,
      totalTime: Date.now() - startTime,
      lastError: lastError?.message,
    },
    false,
  );
}
