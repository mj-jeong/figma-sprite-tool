/**
 * Utility to create test icon images for sprite generation tests
 * Generates simple PNG images using Sharp
 */

import sharp from 'sharp';
import type { IconData } from '../../../src/engine/types/sprite.js';

/**
 * Create a simple colored square icon for testing
 *
 * @param size - Icon size in pixels
 * @param color - RGB color object
 * @returns PNG buffer
 */
export async function createTestPng(
  size: number,
  color: { r: number; g: number; b: number } = { r: 100, g: 150, b: 200 }
): Promise<Buffer> {
  return await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { ...color, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

/**
 * Create a test SVG icon
 *
 * @param id - Icon ID
 * @param size - Icon size
 * @param shape - Shape type ('circle', 'rect', 'path')
 * @returns SVG string
 */
export function createTestSvg(
  id: string,
  size: number,
  shape: 'circle' | 'rect' | 'path' = 'circle'
): string {
  const center = size / 2;
  const radius = size / 3;

  let content = '';

  switch (shape) {
    case 'circle':
      content = `<circle cx="${center}" cy="${center}" r="${radius}" fill="currentColor"/>`;
      break;
    case 'rect':
      content = `<rect x="${radius}" y="${radius}" width="${radius * 2}" height="${radius * 2}" fill="currentColor"/>`;
      break;
    case 'path':
      content = `<path d="M ${center} ${radius} L ${size - radius} ${center} L ${center} ${size - radius} Z" fill="currentColor"/>`;
      break;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${content}</svg>`;
}

/**
 * Create test IconData with generated PNG
 */
export async function createTestIconData(
  id: string,
  width: number,
  height: number,
  color?: { r: number; g: number; b: number }
): Promise<IconData> {
  const buffer = await createTestPng(width, color);

  return {
    id,
    name: id,
    nodeId: `test-node-${id}`,
    variants: { name: id, size: width },
    width,
    height,
    buffer,
  };
}

/**
 * Create a batch of test icons
 */
export async function createTestIconBatch(count: number): Promise<IconData[]> {
  const colors = [
    { r: 255, g: 0, b: 0 },     // Red
    { r: 0, g: 255, b: 0 },     // Green
    { r: 0, g: 0, b: 255 },     // Blue
    { r: 255, g: 255, b: 0 },   // Yellow
    { r: 255, g: 0, b: 255 },   // Magenta
    { r: 0, g: 255, b: 255 },   // Cyan
  ];

  return await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const size = 16 + (i % 3) * 8; // 16, 24, 32
      const color = colors[i % colors.length];
      const id = `ic-test-${i.toString().padStart(3, '0')}-${size}`;

      return await createTestIconData(id, size, size, color);
    })
  );
}
