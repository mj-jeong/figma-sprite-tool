/**
 * Internal sprite data types
 */

/**
 * Icon variant information extracted from Figma
 */
export interface IconVariants {
  /** Icon size (e.g., 16, 24, 32) */
  size?: number;
  /** Icon style (e.g., "line", "filled", "outlined") */
  style?: string;
  /** Icon theme (e.g., "dark", "light") */
  theme?: string;
  /** Original icon name from Figma */
  name: string;
  /** Additional custom variant properties */
  [key: string]: string | number | undefined;
}

/**
 * Icon metadata from Figma
 */
export interface IconMetadata {
  /** Unique icon ID (generated from naming template) */
  id: string;
  /** Original Figma node name */
  name: string;
  /** Figma node ID for reference */
  nodeId: string;
  /** Extracted variant information */
  variants: IconVariants;
  /** Icon dimensions */
  width: number;
  height: number;
}

/**
 * Icon with downloaded image data
 */
export interface IconData extends IconMetadata {
  /** PNG image data as buffer */
  buffer: Buffer;
}

/**
 * Icon positioned in sprite sheet
 */
export interface PackedIcon extends IconData {
  /** X position in sprite sheet */
  x: number;
  /** Y position in sprite sheet */
  y: number;
}

/**
 * SVG-specific icon data
 */
export interface SvgIconData {
  /** Icon ID */
  id: string;
  /** SVG content */
  content: string;
  /** ViewBox attribute (e.g., "0 0 24 24") */
  viewBox: string;
  /** Original width */
  width: number;
  /** Original height */
  height: number;
}

/**
 * Complete sprite sheet data
 */
export interface SpriteSheet {
  /** Total sprite sheet width */
  width: number;
  /** Total sprite sheet height */
  height: number;
  /** All icons positioned in the sheet */
  icons: PackedIcon[];
  /** Content hash for change detection */
  hash: string;
}

/**
 * SVG sprite sheet data
 */
export interface SvgSpriteSheet {
  /** SVG icons with symbol data */
  icons: SvgIconData[];
  /** Complete SVG sprite content */
  content: string;
  /** Content hash */
  hash: string;
}

/**
 * Sprite generation result
 */
export interface SpriteGenerationResult {
  /** PNG sprite sheets (1x and optional 2x) */
  png?: {
    standard: SpriteSheet;
    retina?: SpriteSheet;
  };
  /** SVG sprite sheet */
  svg?: SvgSpriteSheet;
  /** Generation metadata */
  metadata: SpriteMetadata;
}

/**
 * Generation metadata for sprite.json
 */
export interface SpriteMetadata {
  /** Figma file key */
  fileKey: string;
  /** Figma page path */
  page: string;
  /** Generation timestamp (ISO 8601) */
  generatedAt: string;
  /** PNG configuration used */
  png?: {
    scale: number;
    padding: number;
  };
  /** SVG configuration used */
  svg?: {
    svgo: boolean;
  };
  /** Total icon count */
  iconCount: number;
  /** Icon manifest */
  icons: IconManifestEntry[];
}

/**
 * Icon entry in sprite.json manifest
 */
export interface IconManifestEntry {
  /** Icon ID */
  id: string;
  /** Figma node ID */
  nodeId: string;
  /** Icon variants */
  variants: IconVariants;
  /** PNG sprite position (if PNG enabled) */
  png?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  /** SVG sprite info (if SVG enabled) */
  svg?: {
    symbolId: string;
    viewBox: string;
  };
  /** Content hashes */
  hash: {
    svg?: string;
    png?: string;
  };
}

/**
 * Packing result from bin-packing algorithm
 */
export interface PackingResult {
  /** Total width needed */
  width: number;
  /** Total height needed */
  height: number;
  /** Fill efficiency (0-1) */
  fill: number;
  /** Packed boxes with positions */
  boxes: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
}

/**
 * Duplicate icon detection result
 */
export interface DuplicateDetectionResult {
  /** Whether duplicates were found */
  hasDuplicates: boolean;
  /** Duplicate groups (same ID, different nodeIds) */
  duplicates: Array<{
    id: string;
    nodeIds: string[];
    names: string[];
  }>;
}

/**
 * Hash collision detection result
 */
export interface HashCollisionResult {
  /** Whether hash collisions were found */
  hasCollisions: boolean;
  /** Collision groups (same hash, different IDs) */
  collisions: Array<{
    hash: string;
    ids: string[];
  }>;
}
