import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { rasterizeSvgIconsForPng } from '../../../../src/cli/commands/generate.js';
import type { ParsedIconNode } from '../../../../src/engine/types/figma.js';
import type { SvgIconData } from '../../../../src/engine/types/sprite.js';

describe('generate rasterize helpers', () => {
  it('should rasterize SVG icons using viewBox dimensions', async () => {
    const svgIcons: SvgIconData[] = [
      {
        id: 'ic-home-24-line',
        content:
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" /></svg>',
        viewBox: '0 0 24 24',
        width: 16,
        height: 16,
      },
    ];

    const metadata = new Map<string, ParsedIconNode>([
      [
        'ic-home-24-line',
        {
          nodeId: '10:1',
          exportId: '10:1',
          name: 'ic/home-24-line',
          type: 'INSTANCE',
          bounds: { x: 0, y: 0, width: 24, height: 24 },
          visible: true,
        },
      ],
    ]);

    const result = await rasterizeSvgIconsForPng(svgIcons, metadata, 2);
    expect(result).toHaveLength(1);
    expect(result[0].width).toBe(24);
    expect(result[0].height).toBe(24);

    const imageMeta = await sharp(result[0].buffer).metadata();
    expect(imageMeta.width).toBe(48);
    expect(imageMeta.height).toBe(48);
  });
});

