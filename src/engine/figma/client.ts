/**
 * Figma REST API client
 * Uses native Node.js fetch API for HTTP requests
 */

import {
  type FigmaClientConfig,
  type FigmaFileResponse,
  type FigmaImagesResponse,
  type FigmaExportFormat,
  type FigmaExportOptions,
  type FigmaRateLimitInfo,
} from '../types/figma.js';
import { SpriteError, ErrorCode, createFigmaError } from '../../utils/errors.js';
import { withRateLimitRetry, type RetryOptions } from '../../utils/retry.js';

/**
 * Figma API base URL
 */
const FIGMA_API_BASE_URL = 'https://api.figma.com';

/**
 * Figma API version
 */
const FIGMA_API_VERSION = 'v1';

/**
 * Default request timeout (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Figma REST API client
 *
 * @example
 * ```typescript
 * const client = new FigmaClient({
 *   token: process.env.FIGMA_TOKEN,
 *   timeout: 30000,
 *   retry: { maxRetries: 3, initialDelay: 1000 }
 * });
 *
 * const file = await client.getFile('AbCdEf123456');
 * const images = await client.exportImages('AbCdEf123456', {
 *   ids: ['123:456', '789:012'],
 *   format: 'png',
 *   scale: 2
 * });
 * ```
 */
export class FigmaClient {
  private readonly config: Required<FigmaClientConfig>;
  private rateLimitInfo?: FigmaRateLimitInfo;

  constructor(config: FigmaClientConfig) {
    if (!config.token) {
      throw createFigmaError(
        ErrorCode.FIGMA_AUTH_FAILED,
        'Figma personal access token is required',
        {
          suggestion: 'Set FIGMA_TOKEN environment variable or provide token in config',
        },
      );
    }

    this.config = {
      token: config.token,
      baseUrl: config.baseUrl || FIGMA_API_BASE_URL,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      retry: config.retry || {
        maxRetries: 3,
        initialDelay: 2000,
        maxDelay: 60000,
      },
    };
  }

  /**
   * Get Figma file data including document tree
   *
   * @param fileKey - Figma file key (from file URL)
   * @returns Figma file response with document tree
   * @throws SpriteError on API errors
   *
   * @example
   * ```typescript
   * const file = await client.getFile('AbCdEf123456');
   * console.log(file.name, file.document);
   * ```
   */
  async getFile(fileKey: string): Promise<FigmaFileResponse> {
    const url = this.buildUrl(`/v1/files/${fileKey}`);

    const result = await withRateLimitRetry(
      () => this.fetch(url),
      async (response) => {
        if (!response.ok) {
          await this.handleErrorResponse(response, 'Failed to fetch Figma file');
        }
        return response.json() as Promise<FigmaFileResponse>;
      },
      this.config.retry,
    );

    return result.value;
  }

  /**
   * Export images from Figma file
   * Returns download URLs for specified nodes
   *
   * @param fileKey - Figma file key
   * @param options - Export options (node IDs, format, scale, etc.)
   * @returns Image export response with download URLs
   * @throws SpriteError on API errors
   *
   * @example
   * ```typescript
   * const response = await client.exportImages('AbCdEf123456', {
   *   ids: ['123:456', '789:012'],
   *   format: 'png',
   *   scale: 2,
   *   use_absolute_bounds: true
   * });
   *
   * for (const [nodeId, url] of Object.entries(response.images)) {
   *   if (url) {
   *     // Download image from url
   *   }
   * }
   * ```
   */
  async exportImages(fileKey: string, options: FigmaExportOptions): Promise<FigmaImagesResponse> {
    const params = new URLSearchParams();
    params.set('ids', options.ids.join(','));
    params.set('format', options.format);

    if (options.scale !== undefined) {
      params.set('scale', String(options.scale));
    }

    if (options.svg_include_id !== undefined) {
      params.set('svg_include_id', String(options.svg_include_id));
    }

    if (options.svg_simplify_stroke !== undefined) {
      params.set('svg_simplify_stroke', String(options.svg_simplify_stroke));
    }

    if (options.use_absolute_bounds !== undefined) {
      params.set('use_absolute_bounds', String(options.use_absolute_bounds));
    }

    const url = this.buildUrl(`/v1/images/${fileKey}?${params.toString()}`);

    const result = await withRateLimitRetry(
      () => this.fetch(url),
      async (response) => {
        if (!response.ok) {
          await this.handleErrorResponse(response, 'Failed to export images from Figma');
        }
        return response.json() as Promise<FigmaImagesResponse>;
      },
      this.config.retry,
    );

    const imagesResponse = result.value;

    // Check for export errors
    if (imagesResponse.err) {
      throw createFigmaError(ErrorCode.FIGMA_EXPORT_FAILED, `Figma export failed: ${imagesResponse.err}`, {
        fileKey,
        nodeIds: options.ids,
        format: options.format,
      });
    }

    // Check for null URLs (export failed for specific nodes)
    const failedNodes = Object.entries(imagesResponse.images)
      .filter(([_, url]) => url === null)
      .map(([nodeId]) => nodeId);

    if (failedNodes.length > 0) {
      throw createFigmaError(
        ErrorCode.FIGMA_EXPORT_FAILED,
        `Failed to export ${failedNodes.length} node(s)`,
        {
          fileKey,
          failedNodes,
          format: options.format,
          suggestion: 'Check if nodes exist and are exportable',
        },
      );
    }

    return imagesResponse;
  }

  /**
   * Download image from URL
   *
   * @param url - Image download URL from exportImages
   * @returns Image buffer
   * @throws SpriteError on download errors
   */
  async downloadImage(url: string): Promise<Buffer> {
    const result = await withRateLimitRetry(
      () => fetch(url, { signal: AbortSignal.timeout(this.config.timeout) }),
      async (response) => {
        if (!response.ok) {
          throw createFigmaError(ErrorCode.FIGMA_EXPORT_FAILED, `Failed to download image: ${response.statusText}`, {
            url,
            status: response.status,
          });
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      },
      this.config.retry,
    );

    return result.value;
  }

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): FigmaRateLimitInfo | undefined {
    return this.rateLimitInfo;
  }

  /**
   * Build full API URL
   */
  private buildUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.config.baseUrl}/${cleanPath}`;
  }

  /**
   * Make authenticated fetch request
   */
  private async fetch(url: string): Promise<Response> {
    try {
      const response = await fetch(url, {
        headers: {
          'X-Figma-Token': this.config.token,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      // Update rate limit info from response headers
      this.updateRateLimitInfo(response);

      return response;
    } catch (error) {
      if (error instanceof Error) {
        // Handle timeout
        if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
          throw createFigmaError(ErrorCode.FIGMA_NETWORK_ERROR, 'Request timed out', {
            url,
            timeout: this.config.timeout,
          });
        }

        // Handle network errors
        throw createFigmaError(ErrorCode.FIGMA_NETWORK_ERROR, `Network error: ${error.message}`, {
          url,
          originalError: error.message,
        });
      }

      throw error;
    }
  }

  /**
   * Handle error responses from Figma API
   */
  private async handleErrorResponse(response: Response, context: string): Promise<never> {
    let errorMessage: string;
    let errorDetails: Record<string, unknown> = {
      status: response.status,
      statusText: response.statusText,
    };

    try {
      const errorData = await response.json();
      errorMessage = errorData.err || errorData.message || response.statusText;
      errorDetails = { ...errorDetails, ...errorData };
    } catch {
      errorMessage = response.statusText;
    }

    // Map HTTP status codes to specific error codes
    switch (response.status) {
      case 401:
      case 403:
        throw createFigmaError(ErrorCode.FIGMA_AUTH_FAILED, `Authentication failed: ${errorMessage}`, {
          ...errorDetails,
          suggestion: 'Check your FIGMA_TOKEN is valid and has correct permissions',
        });

      case 404:
        throw createFigmaError(ErrorCode.FIGMA_FILE_NOT_FOUND, `File not found: ${errorMessage}`, {
          ...errorDetails,
          suggestion: 'Verify the fileKey in your config is correct',
        });

      case 429:
        throw createFigmaError(ErrorCode.FIGMA_RATE_LIMITED, `Rate limit exceeded: ${errorMessage}`, {
          ...errorDetails,
          retryAfter: response.headers.get('Retry-After'),
          suggestion: 'Wait before retrying or reduce request frequency',
        });

      case 500:
      case 502:
      case 503:
      case 504:
        throw createFigmaError(ErrorCode.FIGMA_NETWORK_ERROR, `Figma server error: ${errorMessage}`, {
          ...errorDetails,
          recoverable: true,
        });

      default:
        throw createFigmaError(ErrorCode.FIGMA_NETWORK_ERROR, `${context}: ${errorMessage}`, errorDetails);
    }
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(response: Response): void {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const limit = response.headers.get('X-RateLimit-Limit');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (remaining && limit && reset) {
      this.rateLimitInfo = {
        remaining: parseInt(remaining, 10),
        limit: parseInt(limit, 10),
        reset: parseInt(reset, 10),
      };
    }
  }
}

/**
 * Create Figma client from environment variable or config
 *
 * @param token - Optional token override (defaults to FIGMA_TOKEN env var)
 * @param config - Optional client configuration
 * @returns Configured Figma client
 * @throws SpriteError if token not provided
 *
 * @example
 * ```typescript
 * // From environment variable
 * const client = createFigmaClient();
 *
 * // With explicit token
 * const client = createFigmaClient('figd_...');
 *
 * // With custom config
 * const client = createFigmaClient(undefined, {
 *   timeout: 60000,
 *   retry: { maxRetries: 5 }
 * });
 * ```
 */
export function createFigmaClient(
  token?: string,
  config?: Partial<Omit<FigmaClientConfig, 'token'>>,
): FigmaClient {
  const accessToken = token || process.env.FIGMA_TOKEN;

  if (!accessToken) {
    throw createFigmaError(
      ErrorCode.FIGMA_AUTH_FAILED,
      'Figma personal access token is required',
      {
        suggestion: 'Set FIGMA_TOKEN environment variable or provide token parameter',
        docs: 'https://www.figma.com/developers/api#access-tokens',
      },
    );
  }

  return new FigmaClient({
    token: accessToken,
    ...config,
  });
}
