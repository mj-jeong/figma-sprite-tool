/**
 * Figma engine utility functions
 */

import type { ParsedIconNode } from '../types/figma.js';

/**
 * Group icons by their export ID to deduplicate API requests
 * Multiple icon IDs may still share the same export target
 *
 * @param iconMetadata - Map of icon IDs to parsed icon nodes
 * @returns Map of export IDs to array of icon IDs that share that export ID
 *
 * @example
 * ```typescript
 * const metadata = new Map([
 *   ['icon-1', { exportId: '10:1', ... }],
 *   ['icon-2', { exportId: '10:2', ... }],
 *   ['icon-3', { exportId: '10:3', ... }]
 * ]);
 *
 * const grouped = groupByExportId(metadata);
 * // Returns: Map {
 * //   '10:1' => ['icon-1'],
 * //   '10:2' => ['icon-2'],
 * //   '10:3' => ['icon-3']
 * // }
 * ```
 */
export function groupByExportId(
  iconMetadata: Map<string, ParsedIconNode>,
): Map<string, string[]> {
  const exportIdMap = new Map<string, string[]>();

  for (const [iconId, node] of iconMetadata) {
    const iconIds = exportIdMap.get(node.exportId) ?? [];
    iconIds.push(iconId);
    exportIdMap.set(node.exportId, iconIds);
  }

  return exportIdMap;
}
