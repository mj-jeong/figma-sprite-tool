/**
 * Error formatting for CLI output
 * Provides user-friendly error messages with context and suggestions
 */

import pc from 'picocolors';
import {
  SpriteError,
  type ErrorContext,
  type OrphanedInstanceContext,
  type OrphanedInstanceErrorContext,
  type DuplicateInfo,
  type DuplicateIconsContext,
} from '../../utils/errors.js';

/**
 * Format error context for display
 */
function formatContext(context: ErrorContext): string {
  // Empty context check
  if (!context || Object.keys(context).length === 0) {
    return '';
  }

  // Type-specific formatting for OrphanedInstanceContext (direct)
  if ('instanceName' in context && 'instanceId' in context && 'missingComponentId' in context) {
    const orphaned = context as OrphanedInstanceContext;
    return [
      `  Instance: ${orphaned.instanceName} (${orphaned.instanceId})`,
      `  Missing Component ID: ${orphaned.missingComponentId}`,
      `  ${pc.cyan('ℹ')} ${orphaned.suggestion}`,
    ].join('\n');
  }

  // Type-specific formatting for OrphanedInstanceErrorContext (wrapped)
  if ('orphanedInstance' in context) {
    const wrapped = context as OrphanedInstanceErrorContext;
    const orphaned = wrapped.orphanedInstance;
    return [
      `  Instance: ${orphaned.instanceName} (${orphaned.instanceId})`,
      `  Missing Component ID: ${orphaned.missingComponentId}`,
      `  ${pc.cyan('ℹ')} ${orphaned.suggestion}`,
    ].join('\n');
  }

  // Type-specific formatting for DuplicateInfo (single item)
  if ('id' in context && 'names' in context && Array.isArray((context as DuplicateInfo).names)) {
    const d = context as DuplicateInfo;
    return [
      `  ${pc.yellow('•')} ${pc.bold(d.id)}`,
      `  Figma names: ${d.names.join(', ')}`,
      `  Node IDs: ${d.nodeIds.join(', ')}`,
    ].join('\n');
  }

  // Type-specific formatting for DuplicateIconsContext (array of duplicates)
  if ('duplicates' in context && Array.isArray((context as DuplicateIconsContext).duplicates)) {
    const duplicatesContext = context as DuplicateIconsContext;
    return duplicatesContext.duplicates
      .map((d) => {
        const lines = [
          `  ${pc.yellow('•')} ${pc.bold(d.id)}`,
          `    Figma names: ${d.names.join(', ')}`,
          `    Node IDs: ${d.nodeIds.join(', ')}`,
        ];
        return lines.join('\n');
      })
      .join('\n');
  }

  // Handle generic context (fallback)
  return Object.entries(context)
    .map(([key, value]) => {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
      let formattedValue: string;

      // Regular array
      if (Array.isArray(value)) {
        formattedValue = value
          .map((v) => {
            if (typeof v === 'object' && v !== null) {
              return `  • ${JSON.stringify(v)}`;
            }
            return `  • ${v}`;
          })
          .join('\n');
      }
      // Object
      else if (typeof value === 'object' && value !== null) {
        formattedValue = JSON.stringify(value, null, 2);
      }
      // Primitive
      else {
        formattedValue = String(value);
      }

      return `  ${pc.dim(formattedKey)}:\n${formattedValue}`;
    })
    .join('\n\n');
}

/**
 * Get suggestions from SpriteError using reflection
 * Since getSuggestions is private, we use the toUserMessage method
 * and parse it, or we can extract suggestions based on error code
 */
function getSuggestionsFromError(error: SpriteError): string[] {
  // This is a simplified version - in practice, the SpriteError class
  // already has getSuggestions as a private method that we can't access
  // So we'll extract from the full user message
  const userMessage = error.toUserMessage();
  const suggestionsMatch = userMessage.match(/Suggested actions:\n((?:  • .+\n?)+)/);

  if (suggestionsMatch && suggestionsMatch[1]) {
    return suggestionsMatch[1]
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.replace(/^\s*•\s*/, ''));
  }

  return [];
}

/**
 * Format a SpriteError for CLI output
 */
export function formatSpriteError(error: SpriteError): void {
  // Error message
  console.error();
  console.error(pc.red('✗'), pc.bold(error.message));

  // Context
  if (error.context && Object.keys(error.context).length > 0) {
    console.error();
    console.error(pc.dim('Context:'));
    console.error(formatContext(error.context));
  }

  // Suggestions
  const suggestions = getSuggestionsFromError(error);
  if (suggestions.length > 0) {
    console.error();
    console.error(pc.cyan('Suggestions:'));
    suggestions.forEach((suggestion) => {
      console.error(pc.cyan('  •'), suggestion);
    });
  }

  // Error code
  console.error();
  console.error(pc.dim(`Error code: ${error.code}`));
}

/**
 * Format a generic error for CLI output
 */
export function formatGenericError(error: Error): void {
  console.error();
  console.error(pc.red('✗'), pc.bold(error.message));

  if (error.stack) {
    console.error();
    console.error(pc.dim('Stack trace:'));
    console.error(pc.dim(error.stack));
  }
}

/**
 * Format any error for CLI output
 * Detects error type and formats appropriately
 */
export function formatError(error: unknown): void {
  if (error instanceof SpriteError) {
    formatSpriteError(error);
  } else if (error instanceof Error) {
    formatGenericError(error);
  } else {
    console.error();
    console.error(pc.red('✗'), pc.bold('An unknown error occurred'));
    console.error(pc.dim(String(error)));
  }
}

/**
 * Handle CLI error and exit
 * Formats error and exits with appropriate code
 */
export function handleError(error: unknown): never {
  formatError(error);
  process.exit(1);
}
