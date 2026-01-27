/**
 * Test fixtures and mock helpers for Figma API testing
 */

/**
 * Generate a simple mock PNG buffer (1x1 transparent pixel)
 * Useful for testing image processing without actual image dependencies
 */
export function createMockPngBuffer(width: number = 24, height: number = 24): Buffer {
  // Simple 1x1 transparent PNG in base64
  // This is a minimal valid PNG file
  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(base64Png, 'base64');
}

/**
 * Generate mock SVG content
 */
export function createMockSvg(width: number = 24, height: number = 24, id: string = 'mock-icon'): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="currentColor"/>
</svg>`;
}

/**
 * Mock fetch response helper
 */
export function createMockResponse(
  body: unknown,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {},
): Response {
  const { status = 200, statusText = 'OK', headers = {} } = options;

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers(headers),
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    arrayBuffer: async () => {
      if (body instanceof Buffer) {
        return body.buffer;
      }
      if (typeof body === 'string') {
        return Buffer.from(body).buffer;
      }
      return Buffer.from(JSON.stringify(body)).buffer;
    },
  } as Response;
}

/**
 * Mock rate limit headers
 */
export function createRateLimitHeaders(remaining: number = 50, limit: number = 100): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
  };
}

/**
 * Create mock Figma error response
 */
export function createMockErrorResponse(
  status: number,
  errorMessage: string,
): Response {
  return createMockResponse(
    { status, err: errorMessage },
    { status, statusText: errorMessage },
  );
}
