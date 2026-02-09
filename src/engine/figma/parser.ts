/**
 * Figma file tree parser
 * Extracts and filters icon nodes from Figma document tree
 */

import type {
  FigmaNode,
  FigmaFileResponse,
  FigmaFrameNode,
  FigmaInstanceNode,
  ParsedIconNode,
  IconFilterCriteria,
  FigmaNodeType,
} from '../types/figma.js';
import type { SpriteConfig } from '../types/config.js';
import { SpriteError, ErrorCode, createFigmaError, createValidationError } from '../../utils/errors.js';

/**
 * Parse Figma file and extract icon nodes
 *
 * @param fileResponse - Figma file response from API
 * @param config - Sprite configuration
 * @returns Array of parsed icon nodes
 * @throws SpriteError if page not found or no icons match filter
 *
 * @example
 * ```typescript
 * const file = await client.getFile('AbCdEf123456');
 * const icons = parseIconNodes(file, config);
 * console.log(`Found ${icons.length} icons`);
 * ```
 */
export function parseIconNodes(fileResponse: FigmaFileResponse, config: SpriteConfig): ParsedIconNode[] {
  const { page, scope } = config.figma;

  // Find target page in document tree
  const targetPage = findPageByPath(fileResponse.document, page);

  if (!targetPage) {
    throw createFigmaError(ErrorCode.FIGMA_NODE_NOT_FOUND, `Page not found: "${page}"`, {
      availablePages: listAvailablePages(fileResponse.document),
      suggestion: 'Check the figma.page value in your config matches an existing page',
    });
  }

  // Create filter criteria
  const filterCriteria: IconFilterCriteria = {
    page,
    prefix: scope.type === 'prefix' ? scope.value : undefined,
    nodeTypes: ['FRAME', 'COMPONENT', 'INSTANCE'],
  };

  // Extract and filter icon nodes
  const iconNodes = extractIconNodes(fileResponse, targetPage, filterCriteria);

  if (iconNodes.length === 0) {
    throw createValidationError(ErrorCode.EMPTY_ICON_SET, 'No icons found matching filter criteria', {
      page,
      scopeType: scope.type,
      scopeValue: scope.value,
      suggestion: 'Check that icons exist in the specified page and match the scope filter',
    });
  }

  return iconNodes;
}

/**
 * Find page node by path (supports nested pages with "/" separator)
 *
 * @param document - Root document node
 * @param pagePath - Page path (e.g., "Design System / Icons")
 * @returns Page node or undefined if not found
 */
function findPageByPath(document: FigmaNode, pagePath: string): FigmaNode | undefined {
  const pathParts = pagePath.split('/').map((part) => part.trim());

  let currentNode: FigmaNode = document;

  for (const part of pathParts) {
    if (!currentNode.children) {
      return undefined;
    }

    const nextNode = currentNode.children.find((child) => child.name === part);

    if (!nextNode) {
      return undefined;
    }

    currentNode = nextNode;
  }

  return currentNode;
}

/**
 * List all available page names in document
 */
function listAvailablePages(document: FigmaNode): string[] {
  if (!document.children) {
    return [];
  }

  const pages: string[] = [];

  function traverse(node: FigmaNode, path: string[] = []): void {
    const currentPath = [...path, node.name];

    if (node.type === 'CANVAS') {
      pages.push(currentPath.join(' / '));
    }

    if (node.children) {
      for (const child of node.children) {
        if (child.type === 'CANVAS' || (child.type === 'FRAME' && child.children)) {
          traverse(child, currentPath);
        }
      }
    }
  }

  // Start from document children (skip document node name)
  for (const child of document.children) {
    if (child.type === 'CANVAS') {
      traverse(child, []);
    }
  }

  return pages;
}

/**
 * Extract icon nodes from page based on filter criteria
 */
function extractIconNodes(
  fileResponse: FigmaFileResponse,
  page: FigmaNode,
  criteria: IconFilterCriteria,
): ParsedIconNode[] {
  const iconNodes: ParsedIconNode[] = [];

  function traverse(node: FigmaNode): void {
    // Check if node matches filter criteria
    if (isIconNode(node, criteria)) {
      const frameNode = node as FigmaFrameNode;

      // For INSTANCE nodes, validate componentId exists
      if (node.type === 'INSTANCE') {
        const instanceNode = node as FigmaInstanceNode;

        if (!instanceNode.componentId) {
          console.warn(
            `⚠️  INSTANCE node "${node.name}" (${node.id}) has no componentId - skipping`
          );
          return; // Skip this node
        }

        // Check if component exists in components section
        if (fileResponse.components && !fileResponse.components[instanceNode.componentId]) {
          console.warn(
            `⚠️  INSTANCE "${node.name}" (${node.id}) references missing component ${instanceNode.componentId}`
          );
          console.warn(
            `    This may be an external library component. Export may fail.`
          );
        }
      }

      // For INSTANCE nodes, use componentId for export (the original component)
      // For other nodes (FRAME, COMPONENT), use the node's own ID
      const exportId = node.type === 'INSTANCE' && node.componentId
        ? node.componentId
        : node.id;

      iconNodes.push({
        nodeId: node.id,
        exportId,
        name: node.name,
        type: node.type,
        bounds: frameNode.absoluteBoundingBox,
        visible: node.visible !== false,
      });
    }

    // Recursively traverse children
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(page);

  return iconNodes;
}

/**
 * Check if node matches icon filter criteria
 */
function isIconNode(node: FigmaNode, criteria: IconFilterCriteria): boolean {
  // Check node type
  if (criteria.nodeTypes && !criteria.nodeTypes.includes(node.type)) {
    return false;
  }

  // Check visibility
  if (node.visible === false) {
    return false;
  }

  // Check prefix filter
  if (criteria.prefix && !node.name.startsWith(criteria.prefix)) {
    return false;
  }

  // Check if node has bounding box (required for export)
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    const frameNode = node as FigmaFrameNode;
    if (!frameNode.absoluteBoundingBox) {
      return false;
    }

    const { width, height } = frameNode.absoluteBoundingBox;

    // Check minimum dimensions if specified
    if (criteria.minWidth && width < criteria.minWidth) {
      return false;
    }

    if (criteria.minHeight && height < criteria.minHeight) {
      return false;
    }
  }

  return true;
}

/**
 * Parse icon name to extract variants
 * Supports format: {name}-{size}-{style}{theme?--{theme}}
 *
 * @param name - Icon name from Figma
 * @param config - Sprite configuration
 * @returns Parsed variants object
 *
 * @example
 * ```typescript
 * parseIconVariants('ic-home-24-line', config)
 * // Returns: { name: 'home', size: '24', style: 'line' }
 *
 * parseIconVariants('ic-search-16-filled--dark', config)
 * // Returns: { name: 'search', size: '16', style: 'filled', theme: 'dark' }
 * ```
 */
export function parseIconVariants(name: string, config: SpriteConfig): Record<string, string> {
  const { scope } = config.figma;

  // Remove prefix if present
  let cleanName = name;
  if (scope.type === 'prefix' && name.startsWith(scope.value)) {
    cleanName = name.slice(scope.value.length);
  }

  // Parse variants from name
  // Expected format: {name}-{size}-{style}{theme?--{theme}}
  const variants: Record<string, string> = {};

  // Extract theme first (if present)
  const themeSplit = cleanName.split('--');
  if (themeSplit.length > 1) {
    variants.theme = themeSplit[1];
    cleanName = themeSplit[0];
  }

  // Split remaining parts by hyphen
  const parts = cleanName.split('-');

  if (parts.length >= 3) {
    // Last part is style
    variants.style = parts[parts.length - 1];

    // Second to last is size
    variants.size = parts[parts.length - 2];

    // Everything else is name
    variants.name = parts.slice(0, parts.length - 2).join('-');
  } else {
    // Fallback: use full name if pattern doesn't match
    variants.name = cleanName;
  }

  return variants;
}

/**
 * Generate icon ID from variants using naming template
 *
 * @param variants - Icon variants object
 * @param template - ID format template from config
 * @param sanitize - Whether to sanitize the ID
 * @returns Generated icon ID
 *
 * @example
 * ```typescript
 * generateIconId(
 *   { name: 'home', size: '24', style: 'line' },
 *   '{name}-{size}-{style}',
 *   true
 * )
 * // Returns: 'home-24-line'
 *
 * generateIconId(
 *   { name: 'search', size: '16', style: 'filled', theme: 'dark' },
 *   '{name}-{size}-{style}{theme?--{theme}}',
 *   true
 * )
 * // Returns: 'search-16-filled--dark'
 * ```
 */
export function generateIconId(
  variants: Record<string, string>,
  template: string,
  sanitize: boolean,
): string {
  // Sanitize variant VALUES first if requested
  // This ensures only the data is sanitized, not the template structure (like --)
  const sanitizedVariants = sanitize
    ? Object.fromEntries(
        Object.entries(variants).map(([key, value]) => [key, sanitizeSingleVariantValue(value)])
      )
    : variants;

  let id = template;

  // Handle optional placeholders FIRST (format: {key?prefix{key}suffix})
  // Regex explanation:
  // - \{([^?}]+)\?  → matches "{key?" and captures "key"
  // - ([^{]*)       → captures prefix before inner placeholder (e.g., "--")
  // - \{([^}]+)\}   → matches inner "{key}" and captures the key name
  // - ([^}]*)       → captures suffix after inner placeholder
  // - \}            → matches closing "}"
  //
  // Example: {theme?--{theme}} → groups: (theme, --, theme, "")
  const optionalPattern = /\{([^?}]+)\?([^{]*)\{([^}]+)\}([^}]*)\}/g;
  id = id.replace(optionalPattern, (match, key, prefix, innerKey, suffix) => {
    // Verify that the inner placeholder matches the outer key
    if (key !== innerKey) {
      // Mismatched keys - leave as is and let it be removed later
      return match;
    }

    const value = sanitizedVariants[key];
    // Only include the optional section if the variant exists and has a value
    if (value !== undefined && value !== null && value !== '') {
      return `${prefix}${value}${suffix}`;
    }
    // Omit the entire optional section if variant is missing
    return '';
  });

  // Replace required placeholders (simple {key} format)
  for (const [key, value] of Object.entries(sanitizedVariants)) {
    const placeholder = `{${key}}`;
    id = id.replace(placeholder, value);
  }

  // Remove any remaining unmatched placeholders
  id = id.replace(/\{[^}]+\}/g, '');

  return id;
}

/**
 * Sanitize a single variant value (NOT a full icon ID)
 *
 * @param value - A single variant value (e.g., "Home", "24", "filled")
 * @returns Sanitized kebab-case string
 *
 * @example
 * ```typescript
 * // ✅ Correct usage: sanitize individual variant values
 * sanitizeSingleVariantValue('Home Icon')  // → 'home-icon'
 * sanitizeSingleVariantValue('24')         // → '24'
 * sanitizeSingleVariantValue('filled')     // → 'filled'
 *
 * // ❌ Wrong usage: do NOT use for full icon IDs
 * // sanitizeSingleVariantValue('ic-home-24-filled')  // Wrong! This is already an ID
 * ```
 *
 * @remarks
 * This function is called internally by `generateIconId` to sanitize individual
 * variant values BEFORE they are combined into the final icon ID.
 *
 * Transformations applied:
 * - Converts to lowercase
 * - Replaces slashes with hyphens (ic/menu → ic-menu)
 * - Replaces spaces/underscores with hyphens (Home Icon → home-icon)
 * - Removes special characters (keeps letters, numbers, hyphens, unicode)
 * - Collapses multiple consecutive hyphens (home--icon → home-icon)
 */
function sanitizeSingleVariantValue(value: string): string {
  // Convert to lowercase
  let sanitized = value.toLowerCase();

  // Replace slashes with hyphens (for hierarchical names like "ic/menu/submenu")
  sanitized = sanitized.replace(/\//g, '-');

  // Replace spaces and underscores with hyphens
  sanitized = sanitized.replace(/[\s_]+/g, '-');

  // Remove special characters (keep letters, numbers, hyphens, and unicode letters for non-Latin scripts)
  // This allows Korean, Japanese, Chinese characters, etc.
  sanitized = sanitized.replace(/[^\p{L}\p{N}-]/gu, '');

  // Collapse multiple consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  return sanitized;
}

/**
 * Sanitize icon ID (legacy function, now mostly used for testing)
 * Modern approach: Sanitize variant values before ID generation via generateIconId()
 *
 * - Convert to kebab-case
 * - Remove special characters
 * - Ensure starts with letter or underscore
 */
export function sanitizeIconId(id: string): string {
  // Convert to lowercase
  let sanitized = id.toLowerCase();

  // Replace spaces and underscores with hyphens
  sanitized = sanitized.replace(/[\s_]+/g, '-');

  // Remove special characters (keep letters, numbers, hyphens)
  sanitized = sanitized.replace(/[^a-z0-9-]/g, '');

  // Collapse multiple consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  // Ensure starts with letter or underscore (add prefix if not)
  if (sanitized && !/^[a-z_]/.test(sanitized)) {
    sanitized = `icon-${sanitized}`;
  }

  return sanitized;
}

/**
 * Convert parsed icon nodes to icon metadata with generated IDs
 *
 * @param iconNodes - Parsed icon nodes from Figma
 * @param config - Sprite configuration
 * @returns Map of icon ID to icon metadata
 * @throws SpriteError on duplicate icon IDs
 */
export function createIconMetadata(
  iconNodes: ParsedIconNode[],
  config: SpriteConfig,
): Map<string, ParsedIconNode> {
  const iconMap = new Map<string, ParsedIconNode>();
  const duplicates = new Map<string, ParsedIconNode[]>();

  for (const node of iconNodes) {
    // Parse variants from name
    const variants = parseIconVariants(node.name, config);

    // Generate icon ID
    const iconId = generateIconId(variants, config.naming.idFormat, config.naming.sanitize);

    // Check for duplicates
    if (iconMap.has(iconId)) {
      const existing = iconMap.get(iconId)!;

      // Add to duplicates tracking
      if (!duplicates.has(iconId)) {
        duplicates.set(iconId, [existing]);
      }
      duplicates.get(iconId)!.push(node);
    } else {
      iconMap.set(iconId, node);
    }
  }

  // Handle duplicates: keep first occurrence only (common for INSTANCE nodes)
  // When the same component is used multiple times in a page, we only need one for the sprite
  // Note: duplicates map only contains icons with duplicate IDs, iconMap already has the first one
  // So we don't need to do anything - the first occurrence is already in iconMap

  return iconMap;
}
