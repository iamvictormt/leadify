import type {
  FloorPlanData,
  ArchitecturalStyle,
  ThreeDModelData,
  Wall3D,
  Floor3D,
  Roof3D,
  Opening3D,
  FacadeData,
  Wall,
  Door,
  WindowElement,
} from '../types';

// === Types ===

export interface CompletenessResult {
  valid: boolean;
  incompleteElements: string[];
}

// === Constants ===

const WALL_HEIGHT = 2.8; // meters

const ROOF_TYPE_BY_STYLE: Record<ArchitecturalStyle, Roof3D['type']> = {
  moderno: 'flat',
  classico: 'gable',
  minimalista: 'flat',
  rustico: 'hip',
  contemporaneo: 'mansard',
};

const WALL_FINISH_BY_STYLE: Record<ArchitecturalStyle, string> = {
  moderno: 'reboco liso',
  classico: 'reboco texturizado',
  minimalista: 'cimento queimado',
  rustico: 'pedra natural',
  contemporaneo: 'reboco com detalhes metálicos',
};

const WINDOW_FRAME_BY_STYLE: Record<ArchitecturalStyle, string> = {
  moderno: 'alumínio preto',
  classico: 'madeira envernizada',
  minimalista: 'alumínio natural',
  rustico: 'madeira',
  contemporaneo: 'alumínio corten',
};

// === Public API ===

/**
 * Generates a 3D model from a 2D floor plan and architectural style.
 * Transforms walls, rooms, doors, and windows into 3D geometry.
 */
export function generateFromFloorPlan(
  plan: FloorPlanData,
  style: ArchitecturalStyle
): ThreeDModelData {
  const walls = generateWalls3D(plan.walls);
  const floors = generateFloors3D(plan);
  const roof = generateRoof3D(plan, style);
  const openings = generateOpenings3D(plan);
  const facade = generateFacade(style);

  return {
    walls,
    floors,
    roof,
    openings,
    facade,
  };
}

/**
 * Validates that a floor plan has sufficient data for 3D generation.
 * Checks that all walls have non-zero dimensions and all openings have defined positions.
 */
export function validateCompleteness(plan: FloorPlanData): CompletenessResult {
  const incompleteElements: string[] = [];

  // Check walls have non-zero dimensions
  for (const wall of plan.walls) {
    if (wall.startX === wall.endX && wall.startY === wall.endY) {
      incompleteElements.push(`wall:${wall.id}:zero-dimensions`);
    }
  }

  // Check doors have valid positions and reference valid walls
  const wallIds = new Set(plan.walls.map((w) => w.id));

  for (const door of plan.doors) {
    if (door.position === undefined || door.position === null || door.position < 0 || door.position > 1) {
      incompleteElements.push(`door:${door.id}:invalid-position`);
    }
    if (!wallIds.has(door.wallId)) {
      incompleteElements.push(`door:${door.id}:invalid-wall-reference`);
    }
  }

  // Check windows have valid positions and reference valid walls
  for (const window of plan.windows) {
    if (window.position === undefined || window.position === null || window.position < 0 || window.position > 1) {
      incompleteElements.push(`window:${window.id}:invalid-position`);
    }
    if (!wallIds.has(window.wallId)) {
      incompleteElements.push(`window:${window.id}:invalid-wall-reference`);
    }
  }

  return {
    valid: incompleteElements.length === 0,
    incompleteElements,
  };
}

// === Internal helpers ===

/**
 * Transforms 2D walls into 3D wall geometry.
 * Each wall gets vertices representing its 3D bounding box.
 */
function generateWalls3D(walls: Wall[]): Wall3D[] {
  return walls.map((wall) => {
    const vertices = computeWallVertices(wall);
    return {
      vertices,
      height: WALL_HEIGHT,
      material: wall.isExternal ? 'concrete_external' : 'plaster_internal',
      isExternal: wall.isExternal,
    };
  });
}

/**
 * Computes the 8 vertices (3D bounding box) of a wall.
 * A wall is defined by start/end points and thickness.
 * Returns flat array of [x,y,z] coordinates for 8 corners.
 */
function computeWallVertices(wall: Wall): number[] {
  const dx = wall.endX - wall.startX;
  const dy = wall.endY - wall.startY;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Avoid division by zero for zero-length walls
  if (length === 0) {
    return [
      wall.startX, 0, wall.startY,
      wall.startX, 0, wall.startY,
      wall.startX, WALL_HEIGHT, wall.startY,
      wall.startX, WALL_HEIGHT, wall.startY,
      wall.startX, 0, wall.startY,
      wall.startX, 0, wall.startY,
      wall.startX, WALL_HEIGHT, wall.startY,
      wall.startX, WALL_HEIGHT, wall.startY,
    ];
  }

  // Normal perpendicular to wall direction
  const nx = -dy / length;
  const ny = dx / length;
  const halfThickness = wall.thickness / 2;

  // 4 bottom corners, 4 top corners
  // Bottom face
  const x0 = wall.startX + nx * halfThickness;
  const z0 = wall.startY + ny * halfThickness;
  const x1 = wall.startX - nx * halfThickness;
  const z1 = wall.startY - ny * halfThickness;
  const x2 = wall.endX + nx * halfThickness;
  const z2 = wall.endY + ny * halfThickness;
  const x3 = wall.endX - nx * halfThickness;
  const z3 = wall.endY - ny * halfThickness;

  return [
    // Bottom 4 vertices (y=0)
    x0, 0, z0,
    x1, 0, z1,
    x2, 0, z2,
    x3, 0, z3,
    // Top 4 vertices (y=WALL_HEIGHT)
    x0, WALL_HEIGHT, z0,
    x1, WALL_HEIGHT, z1,
    x2, WALL_HEIGHT, z2,
    x3, WALL_HEIGHT, z3,
  ];
}

/**
 * Generates floor geometry from room boundaries.
 * Each room produces a floor polygon at its level.
 */
function generateFloors3D(plan: FloorPlanData): Floor3D[] {
  return plan.rooms.map((room) => {
    // Floor is a rectangle defined by room boundaries
    const y = room.floor * WALL_HEIGHT; // floor level height
    const vertices = [
      room.x, y, room.y,
      room.x + room.width, y, room.y,
      room.x + room.width, y, room.y + room.height,
      room.x, y, room.y + room.height,
    ];

    return {
      vertices,
      material: 'floor_default',
      level: room.floor,
    };
  });
}

/**
 * Generates roof geometry based on architectural style.
 * Computes the bounding box of the entire plan and creates roof vertices.
 */
function generateRoof3D(plan: FloorPlanData, style: ArchitecturalStyle): Roof3D {
  const roofType = ROOF_TYPE_BY_STYLE[style];

  // Compute bounding box of all rooms
  const bounds = computePlanBounds(plan);
  const roofHeight = WALL_HEIGHT * (Math.max(...plan.rooms.map((r) => r.floor)) + 1);

  const vertices = computeRoofVertices(bounds, roofHeight, roofType);

  return {
    vertices,
    type: roofType,
    material: getRoofMaterial(roofType),
  };
}

/**
 * Computes the bounding box of the entire floor plan.
 */
function computePlanBounds(plan: FloorPlanData): { minX: number; minZ: number; maxX: number; maxZ: number } {
  if (plan.rooms.length === 0) {
    return { minX: 0, minZ: 0, maxX: 0, maxZ: 0 };
  }

  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;

  for (const room of plan.rooms) {
    minX = Math.min(minX, room.x);
    minZ = Math.min(minZ, room.y);
    maxX = Math.max(maxX, room.x + room.width);
    maxZ = Math.max(maxZ, room.y + room.height);
  }

  return { minX, minZ, maxX, maxZ };
}

/**
 * Generates roof vertices based on roof type.
 */
function computeRoofVertices(
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number },
  baseHeight: number,
  roofType: Roof3D['type']
): number[] {
  const { minX, minZ, maxX, maxZ } = bounds;
  const overhang = 0.3; // 30cm roof overhang
  const ridgeHeight = 1.5; // height of the ridge above walls

  const x0 = minX - overhang;
  const x1 = maxX + overhang;
  const z0 = minZ - overhang;
  const z1 = maxZ + overhang;

  switch (roofType) {
    case 'flat':
      // Simple flat rectangle at wall height + small parapet
      return [
        x0, baseHeight + 0.1, z0,
        x1, baseHeight + 0.1, z0,
        x1, baseHeight + 0.1, z1,
        x0, baseHeight + 0.1, z1,
      ];

    case 'gable': {
      // Two sloped planes meeting at a ridge along the longer axis
      const midZ = (z0 + z1) / 2;
      return [
        // Left slope
        x0, baseHeight, z0,
        x1, baseHeight, z0,
        x1, baseHeight + ridgeHeight, midZ,
        x0, baseHeight + ridgeHeight, midZ,
        // Right slope
        x0, baseHeight + ridgeHeight, midZ,
        x1, baseHeight + ridgeHeight, midZ,
        x1, baseHeight, z1,
        x0, baseHeight, z1,
      ];
    }

    case 'hip': {
      // Four sloped planes meeting at a ridge
      const midX = (x0 + x1) / 2;
      const midZ = (z0 + z1) / 2;
      const ridgeX0 = x0 + (x1 - x0) * 0.3;
      const ridgeX1 = x0 + (x1 - x0) * 0.7;
      return [
        // Front slope
        x0, baseHeight, z0,
        x1, baseHeight, z0,
        ridgeX1, baseHeight + ridgeHeight, midZ,
        ridgeX0, baseHeight + ridgeHeight, midZ,
        // Back slope
        x0, baseHeight, z1,
        x1, baseHeight, z1,
        ridgeX1, baseHeight + ridgeHeight, midZ,
        ridgeX0, baseHeight + ridgeHeight, midZ,
        // Left slope
        x0, baseHeight, z0,
        x0, baseHeight, z1,
        ridgeX0, baseHeight + ridgeHeight, midZ,
        // Right slope
        x1, baseHeight, z0,
        x1, baseHeight, z1,
        ridgeX1, baseHeight + ridgeHeight, midZ,
      ];
    }

    case 'mansard': {
      // Two-slope roof: steep lower section and flatter upper section
      const midHeight = baseHeight + ridgeHeight * 0.6;
      const insetX = (x1 - x0) * 0.15;
      const insetZ = (z1 - z0) * 0.15;
      return [
        // Lower steep section (4 sides)
        x0, baseHeight, z0,
        x1, baseHeight, z0,
        x1 - insetX, midHeight, z0 + insetZ,
        x0 + insetX, midHeight, z0 + insetZ,
        // Upper flat section
        x0 + insetX, midHeight, z0 + insetZ,
        x1 - insetX, midHeight, z0 + insetZ,
        x1 - insetX, midHeight, z1 - insetZ,
        x0 + insetX, midHeight, z1 - insetZ,
        // Lower steep back
        x0, baseHeight, z1,
        x1, baseHeight, z1,
        x1 - insetX, midHeight, z1 - insetZ,
        x0 + insetX, midHeight, z1 - insetZ,
        // Upper top
        x0 + insetX, baseHeight + ridgeHeight, z0 + insetZ,
        x1 - insetX, baseHeight + ridgeHeight, z0 + insetZ,
        x1 - insetX, baseHeight + ridgeHeight, z1 - insetZ,
        x0 + insetX, baseHeight + ridgeHeight, z1 - insetZ,
      ];
    }
  }
}

/**
 * Returns the roof material based on type.
 */
function getRoofMaterial(roofType: Roof3D['type']): string {
  switch (roofType) {
    case 'flat':
      return 'concrete_waterproof';
    case 'gable':
      return 'ceramic_tile';
    case 'hip':
      return 'ceramic_tile';
    case 'mansard':
      return 'slate_tile';
  }
}

/**
 * Generates Opening3D entries for every door and window in the floor plan.
 * Positions are computed based on the wall they belong to.
 */
function generateOpenings3D(plan: FloorPlanData): Opening3D[] {
  const wallMap = new Map<string, Wall>();
  for (const wall of plan.walls) {
    wallMap.set(wall.id, wall);
  }

  const openings: Opening3D[] = [];

  // Process doors
  for (const door of plan.doors) {
    const wall = wallMap.get(door.wallId);
    const position = computeOpeningPosition(wall, door.position, WALL_HEIGHT / 2);

    openings.push({
      type: 'door',
      position,
      width: door.width,
      height: 2.1, // standard door height
      wallId: door.wallId,
    });
  }

  // Process windows
  for (const window of plan.windows) {
    const wall = wallMap.get(window.wallId);
    const position = computeOpeningPosition(wall, window.position, window.sillHeight + window.height / 2);

    openings.push({
      type: 'window',
      position,
      width: window.width,
      height: window.height,
      wallId: window.wallId,
    });
  }

  return openings;
}

/**
 * Computes the 3D position [x, y, z] of an opening along a wall.
 * The position parameter (0-1) indicates where along the wall the opening center is.
 */
function computeOpeningPosition(
  wall: Wall | undefined,
  positionAlongWall: number,
  heightCenter: number
): number[] {
  if (!wall) {
    return [0, heightCenter, 0];
  }

  const x = wall.startX + (wall.endX - wall.startX) * positionAlongWall;
  const z = wall.startY + (wall.endY - wall.startY) * positionAlongWall;

  return [x, heightCenter, z];
}

/**
 * Generates facade data based on architectural style.
 */
function generateFacade(style: ArchitecturalStyle): FacadeData {
  return {
    style,
    roofType: ROOF_TYPE_BY_STYLE[style],
    wallFinish: WALL_FINISH_BY_STYLE[style],
    windowFrameStyle: WINDOW_FRAME_BY_STYLE[style],
  };
}
