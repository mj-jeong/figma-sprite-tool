import { describe, it, expect } from 'vitest';
import { groupByExportId } from '../../../../src/engine/figma/utils.js';
import type { ParsedIconNode } from '../../../../src/engine/types/figma.js';

describe('groupByExportId', () => {
  it('should group icons by exportId', () => {
    // Test with multiple icons sharing same exportId
    const iconMetadata = new Map<string, ParsedIconNode>([
      [
        'icon-1',
        {
          nodeId: 'node-1',
          exportId: 'comp-A',
          name: 'ic/home-24-line',
          type: 'INSTANCE',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
      [
        'icon-2',
        {
          nodeId: 'node-2',
          exportId: 'comp-A', // Same exportId as icon-1
          name: 'ic/home-24-filled',
          type: 'INSTANCE',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
      [
        'icon-3',
        {
          nodeId: 'node-3',
          exportId: 'comp-B',
          name: 'ic/search-16-line',
          type: 'INSTANCE',
          bounds: { x: 0, y: 0, width: 16, height: 16 },
          visible: true,
        },
      ],
    ]);

    const result = groupByExportId(iconMetadata);

    expect(result.size).toBe(2);
    expect(result.get('comp-A')).toEqual(['icon-1', 'icon-2']);
    expect(result.get('comp-B')).toEqual(['icon-3']);
  });

  it('should handle single icon per exportId', () => {
    // Test with unique exportIds
    const iconMetadata = new Map<string, ParsedIconNode>([
      [
        'icon-1',
        {
          nodeId: 'node-1',
          exportId: 'comp-A',
          name: 'ic/home',
          type: 'COMPONENT',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
      [
        'icon-2',
        {
          nodeId: 'node-2',
          exportId: 'comp-B',
          name: 'ic/search',
          type: 'COMPONENT',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
    ]);

    const result = groupByExportId(iconMetadata);

    expect(result.size).toBe(2);
    expect(result.get('comp-A')).toEqual(['icon-1']);
    expect(result.get('comp-B')).toEqual(['icon-2']);
  });

  it('should handle empty metadata', () => {
    // Test with empty Map
    const iconMetadata = new Map<string, ParsedIconNode>();

    const result = groupByExportId(iconMetadata);

    expect(result.size).toBe(0);
    expect(result).toEqual(new Map());
  });

  it('should preserve all iconIds for shared exportId', () => {
    // Test that all icons with same exportId are grouped
    const iconMetadata = new Map<string, ParsedIconNode>([
      [
        'icon-1',
        {
          nodeId: 'node-1',
          exportId: 'shared-comp',
          name: 'ic/icon-v1',
          type: 'INSTANCE',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
      [
        'icon-2',
        {
          nodeId: 'node-2',
          exportId: 'shared-comp',
          name: 'ic/icon-v2',
          type: 'INSTANCE',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
      [
        'icon-3',
        {
          nodeId: 'node-3',
          exportId: 'shared-comp',
          name: 'ic/icon-v3',
          type: 'INSTANCE',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
      [
        'icon-4',
        {
          nodeId: 'node-4',
          exportId: 'shared-comp',
          name: 'ic/icon-v4',
          type: 'INSTANCE',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
    ]);

    const result = groupByExportId(iconMetadata);

    expect(result.size).toBe(1);
    expect(result.get('shared-comp')).toEqual(['icon-1', 'icon-2', 'icon-3', 'icon-4']);
    expect(result.get('shared-comp')?.length).toBe(4);
  });

  it('should maintain insertion order for iconIds', () => {
    // Test that iconIds are added in the order they appear in the Map
    const iconMetadata = new Map<string, ParsedIconNode>([
      [
        'icon-c',
        {
          nodeId: 'node-c',
          exportId: 'comp-X',
          name: 'ic/icon-c',
          type: 'INSTANCE',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
      [
        'icon-a',
        {
          nodeId: 'node-a',
          exportId: 'comp-X',
          name: 'ic/icon-a',
          type: 'INSTANCE',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
      [
        'icon-b',
        {
          nodeId: 'node-b',
          exportId: 'comp-X',
          name: 'ic/icon-b',
          type: 'INSTANCE',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
    ]);

    const result = groupByExportId(iconMetadata);

    // Should maintain the order: c, a, b (not alphabetical)
    expect(result.get('comp-X')).toEqual(['icon-c', 'icon-a', 'icon-b']);
  });

  it('should handle mixed INSTANCE and COMPONENT nodes', () => {
    // Test with different node types that might have different exportId patterns
    const iconMetadata = new Map<string, ParsedIconNode>([
      [
        'icon-instance',
        {
          nodeId: 'node-1',
          exportId: 'comp-shared',
          name: 'ic/instance',
          type: 'INSTANCE',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
      [
        'icon-component',
        {
          nodeId: 'node-2',
          exportId: 'node-2', // COMPONENTs use nodeId as exportId
          name: 'ic/component',
          type: 'COMPONENT',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
      [
        'icon-frame',
        {
          nodeId: 'node-3',
          exportId: 'node-3', // FRAMEs also use nodeId as exportId
          name: 'ic/frame',
          type: 'FRAME',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
    ]);

    const result = groupByExportId(iconMetadata);

    expect(result.size).toBe(3);
    expect(result.get('comp-shared')).toEqual(['icon-instance']);
    expect(result.get('node-2')).toEqual(['icon-component']);
    expect(result.get('node-3')).toEqual(['icon-frame']);
  });
});
