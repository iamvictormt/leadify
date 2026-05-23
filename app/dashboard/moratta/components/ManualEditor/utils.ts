import type { Point, EditorWall } from './types';
import { GRID_SNAP } from './types';

/** Snap a value to the nearest grid increment */
export function snapToGrid(value: number, gridSize: number = GRID_SNAP): number {
  return Math.round(value / gridSize) * gridSize;
}

/** Snap a point to grid */
export function snapPointToGrid(point: Point, gridSize: number = GRID_SNAP): Point {
  return {
    x: snapToGrid(point.x, gridSize),
    y: snapToGrid(point.y, gridSize),
  };
}

/** Distance between two points */
export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/** Snap to nearest existing wall endpoint (within threshold) */
export function snapToWallEndpoint(point: Point, walls: EditorWall[], threshold: number = 0.3): Point | null {
  let closest: Point | null = null;
  let minDist = threshold;

  for (const wall of walls) {
    const dStart = distance(point, wall.start);
    const dEnd = distance(point, wall.end);

    if (dStart < minDist) {
      minDist = dStart;
      closest = wall.start;
    }
    if (dEnd < minDist) {
      minDist = dEnd;
      closest = wall.end;
    }
  }

  return closest;
}

/** Constrain angle to 0, 90, 180, 270 degrees (orthogonal snap) */
export function constrainToOrthogonal(start: Point, end: Point): Point {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);

  // If more horizontal than vertical, make perfectly horizontal
  if (dx >= dy) {
    return { x: end.x, y: start.y };
  }
  // Otherwise make perfectly vertical
  return { x: start.x, y: end.y };
}

/** Calculate wall length in meters */
export function wallLength(wall: EditorWall): number {
  return distance(wall.start, wall.end);
}

/** Calculate polygon area using Shoelace formula */
export function polygonArea(points: Point[]): number {
  if (points.length < 3) return 0;

  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area) / 2;
}

/** Convert screen pixels to meters */
export function screenToMeters(
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number,
  lotWidth: number,
  lotLength: number,
  zoom: number,
  panX: number,
  panY: number
): Point {
  const ppm = getPixelsPerMeter(canvasWidth, canvasHeight, lotWidth, lotLength);
  const offsetX = (canvasWidth - lotWidth * ppm * zoom) / 2 + panX;
  const offsetY = (canvasHeight - lotLength * ppm * zoom) / 2 + panY;

  return {
    x: (screenX - offsetX) / (ppm * zoom),
    y: (screenY - offsetY) / (ppm * zoom),
  };
}

/** Convert meters to screen pixels */
export function metersToScreen(
  mx: number,
  my: number,
  canvasWidth: number,
  canvasHeight: number,
  lotWidth: number,
  lotLength: number,
  zoom: number,
  panX: number,
  panY: number
): Point {
  const ppm = getPixelsPerMeter(canvasWidth, canvasHeight, lotWidth, lotLength);
  const offsetX = (canvasWidth - lotWidth * ppm * zoom) / 2 + panX;
  const offsetY = (canvasHeight - lotLength * ppm * zoom) / 2 + panY;

  return {
    x: offsetX + mx * ppm * zoom,
    y: offsetY + my * ppm * zoom,
  };
}

/** Get pixels per meter for the canvas */
export function getPixelsPerMeter(
  canvasWidth: number,
  canvasHeight: number,
  lotWidth: number,
  lotLength: number
): number {
  const padding = 0.85;
  const scaleX = (canvasWidth * padding) / lotWidth;
  const scaleY = (canvasHeight * padding) / lotLength;
  return Math.min(scaleX, scaleY);
}

/** Check if a point is near a wall segment (for selection) */
export function pointNearWall(point: Point, wall: EditorWall, threshold: number = 0.2): boolean {
  const { start, end } = wall;
  const len = distance(start, end);
  if (len < 0.01) return distance(point, start) < threshold;

  // Project point onto wall line
  const t = Math.max(0, Math.min(1,
    ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / (len * len)
  ));

  const projection: Point = {
    x: start.x + t * (end.x - start.x),
    y: start.y + t * (end.y - start.y),
  };

  return distance(point, projection) < threshold;
}

/** Check if two walls are collinear (same line) and connected */
export function canMergeWalls(a: EditorWall, b: EditorWall): boolean {
  const isAHorizontal = Math.abs(a.start.y - a.end.y) < 0.05;
  const isBHorizontal = Math.abs(b.start.y - b.end.y) < 0.05;
  const isAVertical = Math.abs(a.start.x - a.end.x) < 0.05;
  const isBVertical = Math.abs(b.start.x - b.end.x) < 0.05;

  if (isAHorizontal && isBHorizontal) {
    // Both horizontal - same Y?
    if (Math.abs(a.start.y - b.start.y) > 0.05) return false;
    // Connected? (one's end touches other's start)
    const aMin = Math.min(a.start.x, a.end.x);
    const aMax = Math.max(a.start.x, a.end.x);
    const bMin = Math.min(b.start.x, b.end.x);
    const bMax = Math.max(b.start.x, b.end.x);
    // Overlapping or touching
    return aMax >= bMin - 0.05 && bMax >= aMin - 0.05;
  }

  if (isAVertical && isBVertical) {
    // Both vertical - same X?
    if (Math.abs(a.start.x - b.start.x) > 0.05) return false;
    const aMin = Math.min(a.start.y, a.end.y);
    const aMax = Math.max(a.start.y, a.end.y);
    const bMin = Math.min(b.start.y, b.end.y);
    const bMax = Math.max(b.start.y, b.end.y);
    return aMax >= bMin - 0.05 && bMax >= aMin - 0.05;
  }

  return false;
}

/** Merge two collinear connected walls into one */
export function mergeWalls(a: EditorWall, b: EditorWall): EditorWall {
  const isHorizontal = Math.abs(a.start.y - a.end.y) < 0.05;

  if (isHorizontal) {
    const y = a.start.y;
    const minX = Math.min(a.start.x, a.end.x, b.start.x, b.end.x);
    const maxX = Math.max(a.start.x, a.end.x, b.start.x, b.end.x);
    return {
      id: a.id, // keep first wall's ID
      start: { x: minX, y },
      end: { x: maxX, y },
      thickness: a.thickness,
    };
  } else {
    const x = a.start.x;
    const minY = Math.min(a.start.y, a.end.y, b.start.y, b.end.y);
    const maxY = Math.max(a.start.y, a.end.y, b.start.y, b.end.y);
    return {
      id: a.id,
      start: { x, y: minY },
      end: { x, y: maxY },
      thickness: a.thickness,
    };
  }
}

/** Generate a unique ID */
export function uid(): string {
  return crypto.randomUUID();
}
