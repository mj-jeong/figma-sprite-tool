/**
 * SVG viewBox extraction utilities
 * Parses viewBox attribute from SVG content with fallback to dimensions
 */

/**
 * Extract viewBox attribute from SVG content
 *
 * Attempts to find the viewBox attribute in the SVG root element.
 * If not found, creates a viewBox from the provided dimensions.
 *
 * @param svgContent - SVG XML content
 * @param fallbackWidth - Fallback width if viewBox not found
 * @param fallbackHeight - Fallback height if viewBox not found
 * @returns ViewBox string (e.g., "0 0 24 24")
 *
 * @example
 * ```typescript
 * const svg = '<svg viewBox="0 0 24 24">...</svg>';
 * const viewBox = extractViewBox(svg, 24, 24);
 * console.log(viewBox); // "0 0 24 24"
 * ```
 */
export function extractViewBox(
  svgContent: string,
  fallbackWidth: number,
  fallbackHeight: number
): string {
  // Try to extract viewBox from SVG tag
  const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/i);

  if (viewBoxMatch && viewBoxMatch[1]) {
    return viewBoxMatch[1].trim();
  }

  // Fallback: create viewBox from dimensions
  const width = Math.round(fallbackWidth);
  const height = Math.round(fallbackHeight);

  return `0 0 ${width} ${height}`;
}

/**
 * Parse viewBox string into components
 *
 * @param viewBox - ViewBox string (e.g., "0 0 24 24")
 * @returns Parsed viewBox components
 *
 * @example
 * ```typescript
 * const parsed = parseViewBox("0 0 24 24");
 * console.log(parsed); // { minX: 0, minY: 0, width: 24, height: 24 }
 * ```
 */
export function parseViewBox(viewBox: string): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  const parts = viewBox.trim().split(/\s+/).map(Number);

  if (parts.length !== 4 || parts.some(isNaN)) {
    throw new Error(`Invalid viewBox format: "${viewBox}"`);
  }

  return {
    minX: parts[0],
    minY: parts[1],
    width: parts[2],
    height: parts[3],
  };
}

/**
 * Validate viewBox string format
 *
 * @param viewBox - ViewBox string to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * validateViewBox("0 0 24 24"); // true
 * validateViewBox("invalid"); // false
 * ```
 */
export function validateViewBox(viewBox: string): boolean {
  try {
    parseViewBox(viewBox);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract SVG content between tags
 *
 * Removes the outer <svg> tag and extracts only the inner content.
 * This is useful for creating symbol sprites.
 *
 * @param svgContent - Full SVG content
 * @returns Inner SVG content (without root tag)
 *
 * @example
 * ```typescript
 * const svg = '<svg viewBox="0 0 24 24"><path d="..."/></svg>';
 * const inner = extractSvgInnerContent(svg);
 * console.log(inner); // '<path d="..."/>'
 * ```
 */
export function extractSvgInnerContent(svgContent: string): string {
  // Remove XML declaration if present
  let content = svgContent.replace(/<\?xml[^>]*\?>/i, '').trim();

  // Extract content between <svg> tags
  const match = content.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);

  if (match && match[1]) {
    return match[1].trim();
  }

  // If no match, return original (already processed)
  return content;
}

/**
 * Extract SVG dimensions from width/height attributes
 *
 * @param svgContent - SVG content
 * @returns Dimensions or null if not found
 *
 * @example
 * ```typescript
 * const svg = '<svg width="24" height="24">...</svg>';
 * const dims = extractSvgDimensions(svg);
 * console.log(dims); // { width: 24, height: 24 }
 * ```
 */
export function extractSvgDimensions(svgContent: string): {
  width: number;
  height: number;
} | null {
  const widthMatch = svgContent.match(/width=["']?(\d+(?:\.\d+)?)["']?/i);
  const heightMatch = svgContent.match(/height=["']?(\d+(?:\.\d+)?)["']?/i);

  if (widthMatch && heightMatch) {
    return {
      width: parseFloat(widthMatch[1]),
      height: parseFloat(heightMatch[1]),
    };
  }

  return null;
}

/**
 * Create viewBox from SVG dimensions or default size
 *
 * This is a convenience function that tries multiple methods
 * to determine the appropriate viewBox:
 * 1. Extract existing viewBox attribute
 * 2. Use width/height attributes
 * 3. Fall back to provided defaults
 *
 * @param svgContent - SVG content
 * @param defaultWidth - Default width
 * @param defaultHeight - Default height
 * @returns ViewBox string
 *
 * @example
 * ```typescript
 * const viewBox = createViewBox(svgContent, 24, 24);
 * ```
 */
export function createViewBox(
  svgContent: string,
  defaultWidth: number,
  defaultHeight: number
): string {
  // Try existing viewBox first
  const existingViewBox = svgContent.match(/viewBox=["']([^"']+)["']/i);
  if (existingViewBox) {
    return existingViewBox[1].trim();
  }

  // Try width/height attributes
  const dimensions = extractSvgDimensions(svgContent);
  if (dimensions) {
    return `0 0 ${Math.round(dimensions.width)} ${Math.round(dimensions.height)}`;
  }

  // Use defaults
  return `0 0 ${Math.round(defaultWidth)} ${Math.round(defaultHeight)}`;
}
