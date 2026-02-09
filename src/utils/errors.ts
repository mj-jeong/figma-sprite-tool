/**
 * Error handling system for the Figma Sprite Tool
 * Provides structured error codes and context-rich error messages
 */

/**
 * Structured error codes following E1xx-E5xx naming convention
 */
export enum ErrorCode {
  // Configuration errors (1xx)
  CONFIG_NOT_FOUND = 'E101',
  CONFIG_INVALID = 'E102',
  CONFIG_MISSING_REQUIRED = 'E103',
  CONFIG_PARSE_FAILED = 'E104',

  // Figma API errors (2xx)
  FIGMA_AUTH_FAILED = 'E201',
  FIGMA_FILE_NOT_FOUND = 'E202',
  FIGMA_RATE_LIMITED = 'E203',
  FIGMA_NODE_NOT_FOUND = 'E204',
  FIGMA_EXPORT_FAILED = 'E205',
  FIGMA_NETWORK_ERROR = 'E206',

  // Validation errors (3xx)
  DUPLICATE_ICON_ID = 'E301',
  INVALID_ICON_ID = 'E302',
  EMPTY_ICON_SET = 'E303',
  INVALID_NAMING_FORMAT = 'E304',

  // Processing errors (4xx)
  IMAGE_PROCESSING_FAILED = 'E401',
  SVG_OPTIMIZATION_FAILED = 'E402',
  PACKING_FAILED = 'E403',
  SPRITE_GENERATION_FAILED = 'E404',

  // Output errors (5xx)
  WRITE_FAILED = 'E501',
  TEMPLATE_ERROR = 'E502',
  PERMISSION_DENIED = 'E503',
  OUTPUT_DIR_INVALID = 'E504',
}

/**
 * Context for orphaned INSTANCE nodes (missing component reference)
 */
export interface OrphanedInstanceContext {
  instanceName: string;
  instanceId: string;
  missingComponentId: string;
  suggestion: string;
}

/**
 * Context for duplicate icon IDs
 */
export interface DuplicateInfo {
  id: string;
  names: string[];
  nodeIds: string[];
}

/**
 * Context for file operation errors
 */
export interface FileErrorContext {
  filePath: string;
  error?: string;
}

/**
 * Context for directory operation errors
 */
export interface DirectoryErrorContext {
  dirPath: string;
  error?: string;
}

/**
 * Context for file copy errors
 */
export interface FileCopyErrorContext {
  src: string;
  dest: string;
  error?: string;
}

/**
 * Context for Figma export errors
 */
export interface FigmaExportErrorContext {
  fileKey?: string;
  nodeIds?: string[];
  failedNodes?: string[];
  format?: string;
  error?: string;
}

/**
 * Context for image download errors
 */
export interface ImageDownloadErrorContext {
  url: string;
  status?: number;
}

/**
 * Context for network errors
 */
export interface NetworkErrorContext {
  url: string;
  timeout?: number;
  originalError?: string;
}

/**
 * Context for page not found errors
 */
export interface PageNotFoundContext {
  availablePages: string[];
  suggestion: string;
}

/**
 * Context for empty icon set errors
 */
export interface EmptyIconSetContext {
  page: string;
  scopeType: string;
  scopeValue: string;
  suggestion?: string;
}

/**
 * Context for all export failures
 */
export interface AllExportsFailedContext {
  total: number;
  errors: string[];
}

/**
 * Context for config file not found errors
 */
export interface ConfigNotFoundContext {
  searchedPaths?: string[];
  configPath?: string;
  cwd?: string;
}

/**
 * Context for config validation errors
 */
export interface ConfigValidationContext {
  configPath?: string;
  error?: string;
  validationErrors?: string[];
}

/**
 * Context for generic errors with suggestion
 */
export interface GenericErrorContext {
  suggestion?: string;
  retryAfter?: string;
  status?: number;
  statusText?: string;
  recoverable?: boolean;
  docs?: string;
  [key: string]: unknown;
}

/**
 * Context for duplicate icon errors (contains array of DuplicateInfo)
 */
export interface DuplicateIconsContext {
  duplicates: DuplicateInfo[];
}

/**
 * Context for orphaned instance errors (wrapper for OrphanedInstanceContext)
 */
export interface OrphanedInstanceErrorContext {
  orphanedInstance: OrphanedInstanceContext;
}

/**
 * Union type for all possible error contexts
 */
export type ErrorContext =
  | OrphanedInstanceContext
  | OrphanedInstanceErrorContext
  | DuplicateInfo
  | DuplicateIconsContext
  | FileErrorContext
  | DirectoryErrorContext
  | FileCopyErrorContext
  | FigmaExportErrorContext
  | ImageDownloadErrorContext
  | NetworkErrorContext
  | PageNotFoundContext
  | EmptyIconSetContext
  | AllExportsFailedContext
  | ConfigNotFoundContext
  | ConfigValidationContext
  | GenericErrorContext
  | Record<string, never>; // for empty context

/**
 * Base error class for all sprite tool errors
 */
export class SpriteError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly context?: ErrorContext,
    public readonly recoverable: boolean = false,
  ) {
    super(`[${code}] ${message}`);
    this.name = 'SpriteError';
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts error to user-friendly message with actionable suggestions
   */
  toUserMessage(): string {
    const suggestions = this.getSuggestions();
    const contextInfo = this.formatContext();

    let message = `Error ${this.code}: ${this.message}`;

    if (contextInfo) {
      message += `\n\nDetails:\n${contextInfo}`;
    }

    if (suggestions.length > 0) {
      message += `\n\nSuggested actions:\n${suggestions.map((s) => `  • ${s}`).join('\n')}`;
    }

    return message;
  }

  /**
   * Get context-aware suggestions for resolving the error
   */
  private getSuggestions(): string[] {
    const suggestions: string[] = [];

    switch (this.code) {
      case ErrorCode.CONFIG_NOT_FOUND:
        suggestions.push('Create a figma.sprite.config.json file in your project root');
        suggestions.push('Or specify the config path with -c flag');
        break;

      case ErrorCode.CONFIG_INVALID:
        suggestions.push('Check your config file against the schema');
        suggestions.push('Ensure all required fields are present');
        break;

      case ErrorCode.FIGMA_AUTH_FAILED:
        suggestions.push('Set FIGMA_TOKEN environment variable');
        suggestions.push('Get your token from https://www.figma.com/developers/api#access-tokens');
        break;

      case ErrorCode.FIGMA_FILE_NOT_FOUND:
        suggestions.push('Verify the fileKey in your config');
        suggestions.push('Ensure you have access to the Figma file');
        break;

      case ErrorCode.FIGMA_RATE_LIMITED:
        suggestions.push('Wait a few minutes before retrying');
        suggestions.push('Consider reducing the number of icons being processed');
        break;

      case ErrorCode.FIGMA_EXPORT_FAILED:
        suggestions.push('Check if this is an external library component (from another Figma file)');
        suggestions.push('Ensure all INSTANCE nodes reference components within the same file');
        suggestions.push('Consider using COMPONENT nodes instead of INSTANCE for icons');
        break;

      case ErrorCode.DUPLICATE_ICON_ID:
        suggestions.push('Use unique icon names in your Figma design system');
        suggestions.push('Or adjust the naming.idFormat to create unique IDs');
        break;

      case ErrorCode.PERMISSION_DENIED:
        suggestions.push('Check file permissions for the output directory');
        suggestions.push('Ensure the directory is writable');
        break;
    }

    return suggestions;
  }

  /**
   * Format context information for display
   */
  private formatContext(): string {
    if (!this.context || Object.keys(this.context).length === 0) {
      return '';
    }

    return Object.entries(this.context)
      .map(([key, value]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
        const formattedValue = Array.isArray(value)
          ? value.join(', ')
          : typeof value === 'object'
            ? JSON.stringify(value, null, 2)
            : String(value);

        return `  ${formattedKey}: ${formattedValue}`;
      })
      .join('\n');
  }
}

/**
 * Create a configuration error
 */
export function createConfigError(
  code: ErrorCode.CONFIG_NOT_FOUND | ErrorCode.CONFIG_INVALID | ErrorCode.CONFIG_MISSING_REQUIRED | ErrorCode.CONFIG_PARSE_FAILED,
  message: string,
  context?: ErrorContext,
): SpriteError {
  return new SpriteError(code, message, context, false);
}

/**
 * Create a Figma API error
 */
export function createFigmaError(
  code:
    | ErrorCode.FIGMA_AUTH_FAILED
    | ErrorCode.FIGMA_FILE_NOT_FOUND
    | ErrorCode.FIGMA_RATE_LIMITED
    | ErrorCode.FIGMA_NODE_NOT_FOUND
    | ErrorCode.FIGMA_EXPORT_FAILED
    | ErrorCode.FIGMA_NETWORK_ERROR,
  message: string,
  context?: ErrorContext,
): SpriteError {
  const recoverable = code === ErrorCode.FIGMA_RATE_LIMITED || code === ErrorCode.FIGMA_NETWORK_ERROR;
  return new SpriteError(code, message, context, recoverable);
}

/**
 * Create a validation error
 */
export function createValidationError(
  code: ErrorCode.DUPLICATE_ICON_ID | ErrorCode.INVALID_ICON_ID | ErrorCode.EMPTY_ICON_SET | ErrorCode.INVALID_NAMING_FORMAT,
  message: string,
  context?: ErrorContext,
): SpriteError {
  return new SpriteError(code, message, context, false);
}

/**
 * Create a processing error
 */
export function createProcessingError(
  code:
    | ErrorCode.IMAGE_PROCESSING_FAILED
    | ErrorCode.SVG_OPTIMIZATION_FAILED
    | ErrorCode.PACKING_FAILED
    | ErrorCode.SPRITE_GENERATION_FAILED,
  message: string,
  context?: ErrorContext,
): SpriteError {
  return new SpriteError(code, message, context, false);
}

/**
 * Create an output error
 */
export function createOutputError(
  code: ErrorCode.WRITE_FAILED | ErrorCode.TEMPLATE_ERROR | ErrorCode.PERMISSION_DENIED | ErrorCode.OUTPUT_DIR_INVALID,
  message: string,
  context?: ErrorContext,
): SpriteError {
  return new SpriteError(code, message, context, false);
}
