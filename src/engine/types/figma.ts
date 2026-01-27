/**
 * Figma API type definitions
 * Based on Figma REST API v1 specification
 */

/**
 * Figma API error response
 */
export interface FigmaErrorResponse {
  status: number;
  err: string;
}

/**
 * Figma file response
 */
export interface FigmaFileResponse {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  schemaVersion: number;
  styles: Record<string, FigmaStyle>;
}

/**
 * Base Figma node
 */
export interface FigmaNode {
  id: string;
  name: string;
  type: FigmaNodeType;
  visible?: boolean;
  children?: FigmaNode[];
}

/**
 * Figma node types
 */
export type FigmaNodeType =
  | 'DOCUMENT'
  | 'CANVAS'
  | 'FRAME'
  | 'GROUP'
  | 'VECTOR'
  | 'BOOLEAN_OPERATION'
  | 'STAR'
  | 'LINE'
  | 'ELLIPSE'
  | 'REGULAR_POLYGON'
  | 'RECTANGLE'
  | 'TEXT'
  | 'SLICE'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE';

/**
 * Figma frame node (used for icons)
 */
export interface FigmaFrameNode extends FigmaNode {
  type: 'FRAME' | 'COMPONENT';
  absoluteBoundingBox: FigmaBoundingBox;
  backgroundColor?: FigmaColor;
  children: FigmaNode[];
}

/**
 * Figma component
 */
export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
}

/**
 * Figma style
 */
export interface FigmaStyle {
  key: string;
  name: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
  description: string;
}

/**
 * Figma bounding box
 */
export interface FigmaBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Figma color
 */
export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Figma image export settings
 */
export interface FigmaExportSetting {
  suffix: string;
  format: 'PNG' | 'SVG' | 'JPG' | 'PDF';
  constraint?: {
    type: 'SCALE' | 'WIDTH' | 'HEIGHT';
    value: number;
  };
}

/**
 * Figma images response (for export)
 */
export interface FigmaImagesResponse {
  err: string | null;
  images: Record<string, string | null>;
  status?: number;
}

/**
 * Figma export format
 */
export type FigmaExportFormat = 'png' | 'svg' | 'jpg' | 'pdf';

/**
 * Figma export options
 */
export interface FigmaExportOptions {
  /** Node IDs to export */
  ids: string[];
  /** Export format */
  format: FigmaExportFormat;
  /** Scale factor (for raster formats) */
  scale?: number;
  /** SVG options */
  svg_include_id?: boolean;
  svg_simplify_stroke?: boolean;
  /** Use absolute bounds */
  use_absolute_bounds?: boolean;
}

/**
 * Figma API client configuration
 */
export interface FigmaClientConfig {
  /** Figma personal access token */
  token: string;
  /** API base URL (default: https://api.figma.com) */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
  };
}

/**
 * Figma API rate limit info
 */
export interface FigmaRateLimitInfo {
  /** Requests remaining in current window */
  remaining: number;
  /** Total requests allowed per window */
  limit: number;
  /** Timestamp when rate limit resets */
  reset: number;
}

/**
 * Icon node filter criteria
 */
export interface IconFilterCriteria {
  /** Page name to search in */
  page: string;
  /** Prefix filter */
  prefix?: string;
  /** Node types to include */
  nodeTypes?: FigmaNodeType[];
  /** Minimum dimensions */
  minWidth?: number;
  minHeight?: number;
}

/**
 * Parsed icon node
 */
export interface ParsedIconNode {
  /** Node ID */
  nodeId: string;
  /** Node name */
  name: string;
  /** Node type */
  type: FigmaNodeType;
  /** Bounding box */
  bounds: FigmaBoundingBox;
  /** Whether node is visible */
  visible: boolean;
}
