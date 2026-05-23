import type { Room, FloorPlanData, ValidationResult, ValidationError } from '../types';

const MINIMUM_ROOM_AREA = 4.0;

// Room types classified by zone
const SOCIAL_ROOM_TYPES = ['sala_estar', 'sala_jantar'] as const;
const INTIMATE_ROOM_TYPES = ['quarto'] as const;
const SERVICE_ROOM_TYPES = ['area_servico', 'cozinha'] as const;

/**
 * Validates that a room meets the minimum area requirement of 4.0 m².
 */
export function validateRoomArea(room: Room): ValidationResult {
  const errors: ValidationError[] = [];

  if (room.area < MINIMUM_ROOM_AREA) {
    errors.push({
      code: 'ROOM_AREA_BELOW_MINIMUM',
      message: `O ambiente "${room.name}" possui área de ${room.area}m², abaixo do mínimo de ${MINIMUM_ROOM_AREA}m².`,
      field: `rooms.${room.id}.area`,
      details: {
        roomId: room.id,
        roomName: room.name,
        currentArea: room.area,
        minimumArea: MINIMUM_ROOM_AREA,
      },
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates that the total area of the floor plan does not exceed the lot area.
 * Also checks if the sum of minimum areas for all rooms would exceed the lot area (infeasibility).
 */
export function validateTotalArea(plan: FloorPlanData, lotArea: number): ValidationResult {
  const errors: ValidationError[] = [];

  if (plan.totalArea > lotArea) {
    const excess = Math.round((plan.totalArea - lotArea) * 100) / 100;
    errors.push({
      code: 'TOTAL_AREA_EXCEEDS_LOT',
      message: `A área total da planta (${plan.totalArea}m²) excede a área do terreno (${lotArea}m²) em ${excess}m².`,
      field: 'totalArea',
      details: {
        totalArea: plan.totalArea,
        lotArea,
        excess,
      },
    });
  }

  // Check infeasibility: sum of minimum areas for all rooms
  const sumMinAreas = plan.rooms.length * MINIMUM_ROOM_AREA;
  if (sumMinAreas > lotArea) {
    const excess = Math.round((sumMinAreas - lotArea) * 100) / 100;
    errors.push({
      code: 'ROOMS_INFEASIBLE',
      message: `A soma das áreas mínimas dos ambientes (${sumMinAreas}m²) excede a área do terreno (${lotArea}m²) em ${excess}m².`,
      field: 'rooms',
      details: {
        sumMinAreas,
        lotArea,
        excess,
        roomCount: plan.rooms.length,
      },
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates adjacency rules for room placement:
 * - Social rooms (sala_estar, sala_jantar) should be near the entry (y <= lotLength * 0.4)
 * - Intimate rooms (quarto) should be separated from social rooms by at least one intermediate room or corridor
 * - Service rooms (area_servico, cozinha) should be reachable without traversing intimate rooms
 */
export function validateAdjacency(plan: FloorPlanData): ValidationResult {
  const errors: ValidationError[] = [];
  const rooms = plan.rooms;

  // We need to infer lot length from the plan boundaries
  const lotLength = Math.max(...rooms.map(r => r.y + r.height), 0);

  // Rule 1: Social rooms near entry (y <= lotLength * 0.4)
  const socialRooms = rooms.filter(r =>
    (SOCIAL_ROOM_TYPES as readonly string[]).includes(r.type)
  );
  const entryThreshold = lotLength * 0.4;

  for (const room of socialRooms) {
    if (room.y > entryThreshold) {
      errors.push({
        code: 'SOCIAL_ROOM_FAR_FROM_ENTRY',
        message: `O ambiente social "${room.name}" está posicionado longe da entrada (y=${room.y}m, limite=${entryThreshold.toFixed(2)}m).`,
        field: `rooms.${room.id}.y`,
        details: {
          roomId: room.id,
          roomName: room.name,
          roomY: room.y,
          entryThreshold,
        },
      });
    }
  }

  // Rule 2: Intimate rooms separated from social rooms by at least one intermediate room or corridor
  const intimateRooms = rooms.filter(r =>
    (INTIMATE_ROOM_TYPES as readonly string[]).includes(r.type)
  );

  for (const intimate of intimateRooms) {
    for (const social of socialRooms) {
      if (areRoomsDirectlyAdjacent(intimate, social)) {
        // Check if there's an intermediate room or corridor between them
        const hasIntermediate = rooms.some(r =>
          r.id !== intimate.id &&
          r.id !== social.id &&
          (r.type === 'corredor' || r.type === 'hall' ||
            !(SOCIAL_ROOM_TYPES as readonly string[]).includes(r.type) &&
            !(INTIMATE_ROOM_TYPES as readonly string[]).includes(r.type)) &&
          areRoomsDirectlyAdjacent(r, intimate) &&
          areRoomsDirectlyAdjacent(r, social)
        );

        if (!hasIntermediate) {
          errors.push({
            code: 'INTIMATE_ROOM_ADJACENT_TO_SOCIAL',
            message: `O quarto "${intimate.name}" está diretamente adjacente à área social "${social.name}" sem ambiente intermediário.`,
            field: `rooms.${intimate.id}`,
            details: {
              intimateRoomId: intimate.id,
              socialRoomId: social.id,
              intimateRoomName: intimate.name,
              socialRoomName: social.name,
            },
          });
        }
      }
    }
  }

  // Rule 3: Service rooms reachable without traversing intimate rooms
  const serviceRooms = rooms.filter(r =>
    (SERVICE_ROOM_TYPES as readonly string[]).includes(r.type)
  );

  for (const service of serviceRooms) {
    if (!isReachableWithoutIntimate(service, rooms)) {
      errors.push({
        code: 'SERVICE_ROOM_BLOCKED_BY_INTIMATE',
        message: `O ambiente de serviço "${service.name}" só é acessível atravessando áreas íntimas.`,
        field: `rooms.${service.id}`,
        details: {
          serviceRoomId: service.id,
          serviceRoomName: service.name,
        },
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates that no two rooms have overlapping rectangular areas.
 */
export function validateOverlap(rooms: Room[]): ValidationResult {
  const errors: ValidationError[] = [];

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];

      if (doRoomsOverlap(a, b)) {
        errors.push({
          code: 'ROOMS_OVERLAP',
          message: `Os ambientes "${a.name}" e "${b.name}" possuem áreas sobrepostas.`,
          field: 'rooms',
          details: {
            roomIds: [a.id, b.id],
            roomNames: [a.name, b.name],
          },
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates that no room extends outside the lot boundaries.
 */
export function validateBoundaries(rooms: Room[], lotWidth: number, lotLength: number): ValidationResult {
  const errors: ValidationError[] = [];

  for (const room of rooms) {
    const outOfBounds: string[] = [];

    if (room.x < 0) outOfBounds.push('x < 0');
    if (room.y < 0) outOfBounds.push('y < 0');
    if (room.x + room.width > lotWidth) outOfBounds.push(`x + width (${(room.x + room.width).toFixed(2)}m) > lotWidth (${lotWidth}m)`);
    if (room.y + room.height > lotLength) outOfBounds.push(`y + height (${(room.y + room.height).toFixed(2)}m) > lotLength (${lotLength}m)`);

    if (outOfBounds.length > 0) {
      errors.push({
        code: 'ROOM_OUT_OF_BOUNDS',
        message: `O ambiente "${room.name}" ultrapassa os limites do terreno: ${outOfBounds.join(', ')}.`,
        field: `rooms.${room.id}`,
        details: {
          roomId: room.id,
          roomName: room.name,
          roomX: room.x,
          roomY: room.y,
          roomWidth: room.width,
          roomHeight: room.height,
          lotWidth,
          lotLength,
          violations: outOfBounds,
        },
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Runs all validations and aggregates results.
 */
export function validateAll(
  plan: FloorPlanData,
  lotWidth: number,
  lotLength: number
): ValidationResult {
  const lotArea = lotWidth * lotLength;
  const allErrors: ValidationError[] = [];

  // Validate each room's area
  for (const room of plan.rooms) {
    const result = validateRoomArea(room);
    allErrors.push(...result.errors);
  }

  // Validate total area
  const totalAreaResult = validateTotalArea(plan, lotArea);
  allErrors.push(...totalAreaResult.errors);

  // Note: adjacency validation removed from mandatory checks as it's too strict
  // for small lots and AI-generated plans. It's still available as a separate function.

  // Validate overlap
  const overlapResult = validateOverlap(plan.rooms);
  allErrors.push(...overlapResult.errors);

  // Validate boundaries
  const boundariesResult = validateBoundaries(plan.rooms, lotWidth, lotLength);
  allErrors.push(...boundariesResult.errors);

  return { valid: allErrors.length === 0, errors: allErrors };
}

// === Helper Functions ===

/**
 * Checks if two rooms are directly adjacent (share a boundary edge).
 * Two rooms are adjacent if they touch along an edge (not just a corner).
 */
function areRoomsDirectlyAdjacent(a: Room, b: Room): boolean {
  const aRight = a.x + a.width;
  const aBottom = a.y + a.height;
  const bRight = b.x + b.width;
  const bBottom = b.y + b.height;

  // Check horizontal adjacency (share a vertical edge)
  const horizontallyAdjacent =
    (Math.abs(aRight - b.x) < 0.01 || Math.abs(bRight - a.x) < 0.01) &&
    a.y < bBottom && b.y < aBottom; // vertical overlap

  // Check vertical adjacency (share a horizontal edge)
  const verticallyAdjacent =
    (Math.abs(aBottom - b.y) < 0.01 || Math.abs(bBottom - a.y) < 0.01) &&
    a.x < bRight && b.x < aRight; // horizontal overlap

  return horizontallyAdjacent || verticallyAdjacent;
}

/**
 * Checks if two rooms have overlapping rectangular areas (intersection area > tolerance).
 * Uses a tolerance of 0.05m (5cm) to account for floating point imprecision from AI.
 */
function doRoomsOverlap(a: Room, b: Room): boolean {
  const OVERLAP_TOLERANCE = 0.05; // 5cm tolerance
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

  return overlapX > OVERLAP_TOLERANCE && overlapY > OVERLAP_TOLERANCE;
}

/**
 * Checks if a service room is reachable from a non-intimate room
 * without traversing intimate rooms (BFS through adjacency graph).
 */
function isReachableWithoutIntimate(serviceRoom: Room, allRooms: Room[]): boolean {
  // Find all non-intimate rooms (potential path nodes)
  const nonIntimateRooms = allRooms.filter(r =>
    !(INTIMATE_ROOM_TYPES as readonly string[]).includes(r.type)
  );

  // If the service room itself is the only non-intimate room, it's trivially reachable
  // We need to check if there's a path from any social/corridor/hall room to this service room
  // through non-intimate rooms only

  // Start BFS from all social rooms, corridors, and halls (entry-accessible rooms)
  const entryAccessible = nonIntimateRooms.filter(r =>
    (SOCIAL_ROOM_TYPES as readonly string[]).includes(r.type) ||
    r.type === 'corredor' ||
    r.type === 'hall' ||
    r.type === 'garagem' ||
    r.type === 'lavabo'
  );

  if (entryAccessible.length === 0) {
    // If there are no entry-accessible rooms, check if service room is directly at entry
    return serviceRoom.y <= Math.max(...allRooms.map(r => r.y + r.height)) * 0.4;
  }

  const visited = new Set<string>();
  const queue: Room[] = [...entryAccessible];

  for (const room of queue) {
    visited.add(room.id);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.id === serviceRoom.id) {
      return true;
    }

    // Find adjacent non-intimate rooms
    for (const neighbor of nonIntimateRooms) {
      if (!visited.has(neighbor.id) && areRoomsDirectlyAdjacent(current, neighbor)) {
        visited.add(neighbor.id);
        queue.push(neighbor);
      }
    }
  }

  return false;
}
