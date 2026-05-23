import { describe, it, expect } from 'vitest';
import {
  validateRoomArea,
  validateTotalArea,
  validateAdjacency,
  validateOverlap,
  validateBoundaries,
  validateAll,
} from './floor-plan-validation.service';
import type { Room, FloorPlanData } from '../types';

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    name: 'Sala',
    type: 'sala_estar',
    x: 0,
    y: 0,
    width: 4,
    height: 3,
    area: 12,
    floor: 0,
    ...overrides,
  };
}

function makePlan(rooms: Room[], totalArea?: number): FloorPlanData {
  return {
    id: 'plan-1',
    totalArea: totalArea ?? rooms.reduce((sum, r) => sum + r.area, 0),
    rooms,
    walls: [],
    doors: [],
    windows: [],
  };
}

describe('FloorPlanValidationService', () => {
  describe('validateRoomArea', () => {
    it('should return valid for room with area >= 4.0', () => {
      const room = makeRoom({ area: 4.0 });
      const result = validateRoomArea(room);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for room with area well above minimum', () => {
      const room = makeRoom({ area: 15.5 });
      const result = validateRoomArea(room);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for room with area below 4.0', () => {
      const room = makeRoom({ area: 3.9, name: 'Banheiro' });
      const result = validateRoomArea(room);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('ROOM_AREA_BELOW_MINIMUM');
      expect(result.errors[0].details?.roomName).toBe('Banheiro');
    });

    it('should return error for room with area of 0', () => {
      const room = makeRoom({ area: 0 });
      const result = validateRoomArea(room);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('ROOM_AREA_BELOW_MINIMUM');
    });
  });

  describe('validateTotalArea', () => {
    it('should return valid when total area is within lot area', () => {
      const rooms = [makeRoom({ area: 12 }), makeRoom({ id: 'room-2', area: 8 })];
      const plan = makePlan(rooms, 20);
      const result = validateTotalArea(plan, 100);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid when total area equals lot area', () => {
      const rooms = [makeRoom({ area: 50 })];
      const plan = makePlan(rooms, 50);
      const result = validateTotalArea(plan, 50);
      expect(result.valid).toBe(true);
    });

    it('should return error when total area exceeds lot area', () => {
      const rooms = [makeRoom({ area: 60 })];
      const plan = makePlan(rooms, 60);
      const result = validateTotalArea(plan, 50);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'TOTAL_AREA_EXCEEDS_LOT')).toBe(true);
      const error = result.errors.find(e => e.code === 'TOTAL_AREA_EXCEEDS_LOT')!;
      expect(error.details?.excess).toBe(10);
    });

    it('should return infeasibility error when min areas exceed lot', () => {
      // 10 rooms × 4m² minimum = 40m², lot = 30m²
      const rooms = Array.from({ length: 10 }, (_, i) =>
        makeRoom({ id: `room-${i}`, area: 4 })
      );
      const plan = makePlan(rooms, 40);
      const result = validateTotalArea(plan, 30);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'ROOMS_INFEASIBLE')).toBe(true);
      const error = result.errors.find(e => e.code === 'ROOMS_INFEASIBLE')!;
      expect(error.details?.excess).toBe(10);
    });
  });

  describe('validateOverlap', () => {
    it('should return valid for non-overlapping rooms', () => {
      const rooms = [
        makeRoom({ id: 'r1', x: 0, y: 0, width: 4, height: 3 }),
        makeRoom({ id: 'r2', x: 4, y: 0, width: 4, height: 3 }),
      ];
      const result = validateOverlap(rooms);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for rooms that share an edge but do not overlap', () => {
      const rooms = [
        makeRoom({ id: 'r1', x: 0, y: 0, width: 4, height: 3 }),
        makeRoom({ id: 'r2', x: 4, y: 0, width: 4, height: 3 }), // touching at x=4
      ];
      const result = validateOverlap(rooms);
      expect(result.valid).toBe(true);
    });

    it('should return error for overlapping rooms', () => {
      const rooms = [
        makeRoom({ id: 'r1', name: 'Sala', x: 0, y: 0, width: 4, height: 3 }),
        makeRoom({ id: 'r2', name: 'Cozinha', x: 3, y: 0, width: 4, height: 3 }), // overlaps at x=3-4
      ];
      const result = validateOverlap(rooms);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('ROOMS_OVERLAP');
      expect(result.errors[0].details?.roomIds).toEqual(['r1', 'r2']);
    });

    it('should detect multiple overlaps', () => {
      const rooms = [
        makeRoom({ id: 'r1', x: 0, y: 0, width: 5, height: 5 }),
        makeRoom({ id: 'r2', x: 2, y: 2, width: 5, height: 5 }),
        makeRoom({ id: 'r3', x: 4, y: 4, width: 5, height: 5 }),
      ];
      const result = validateOverlap(rooms);
      expect(result.valid).toBe(false);
      // r1 overlaps r2, r2 overlaps r3, r1 overlaps r3 (partially through r2 area)
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validateBoundaries', () => {
    it('should return valid for rooms within boundaries', () => {
      const rooms = [
        makeRoom({ x: 0, y: 0, width: 4, height: 3 }),
        makeRoom({ id: 'r2', x: 4, y: 0, width: 4, height: 3 }),
      ];
      const result = validateBoundaries(rooms, 10, 10);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for room at exact boundary', () => {
      const rooms = [makeRoom({ x: 0, y: 0, width: 10, height: 10 })];
      const result = validateBoundaries(rooms, 10, 10);
      expect(result.valid).toBe(true);
    });

    it('should return error for room exceeding width', () => {
      const rooms = [makeRoom({ id: 'r1', name: 'Sala', x: 8, y: 0, width: 4, height: 3 })];
      const result = validateBoundaries(rooms, 10, 10);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('ROOM_OUT_OF_BOUNDS');
    });

    it('should return error for room exceeding length', () => {
      const rooms = [makeRoom({ id: 'r1', name: 'Sala', x: 0, y: 8, width: 4, height: 4 })];
      const result = validateBoundaries(rooms, 10, 10);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('ROOM_OUT_OF_BOUNDS');
    });

    it('should return error for room with negative coordinates', () => {
      const rooms = [makeRoom({ id: 'r1', name: 'Sala', x: -1, y: 0, width: 4, height: 3 })];
      const result = validateBoundaries(rooms, 10, 10);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('ROOM_OUT_OF_BOUNDS');
    });
  });

  describe('validateAdjacency', () => {
    it('should return valid when social rooms are near entry', () => {
      const rooms = [
        makeRoom({ id: 'r1', name: 'Sala de Estar', type: 'sala_estar', x: 0, y: 0, width: 4, height: 3 }),
        makeRoom({ id: 'r2', name: 'Cozinha', type: 'cozinha', x: 4, y: 0, width: 3, height: 3 }),
        makeRoom({ id: 'r3', name: 'Corredor', type: 'corredor', x: 0, y: 3, width: 7, height: 1 }),
        makeRoom({ id: 'r4', name: 'Quarto', type: 'quarto', x: 0, y: 4, width: 4, height: 3 }),
      ];
      const plan = makePlan(rooms);
      const result = validateAdjacency(plan);
      expect(result.valid).toBe(true);
    });

    it('should return error when social room is far from entry', () => {
      // lotLength inferred as max(y + height) = 10
      // entryThreshold = 10 * 0.4 = 4
      const rooms = [
        makeRoom({ id: 'r1', name: 'Sala de Estar', type: 'sala_estar', x: 0, y: 5, width: 4, height: 3 }),
        makeRoom({ id: 'r2', name: 'Quarto', type: 'quarto', x: 0, y: 0, width: 4, height: 3 }),
      ];
      const plan = makePlan(rooms);
      const result = validateAdjacency(plan);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'SOCIAL_ROOM_FAR_FROM_ENTRY')).toBe(true);
    });
  });

  describe('validateAll', () => {
    it('should aggregate errors from all validations', () => {
      const rooms = [
        makeRoom({ id: 'r1', name: 'Sala', type: 'sala_estar', x: 0, y: 0, width: 2, height: 1.5, area: 3 }), // below min area
        makeRoom({ id: 'r2', name: 'Quarto', type: 'quarto', x: 1, y: 0, width: 3, height: 3, area: 9 }), // overlaps with r1
      ];
      const plan = makePlan(rooms, 12);
      const result = validateAll(plan, 10, 10);
      expect(result.valid).toBe(false);
      // Should have at least: ROOM_AREA_BELOW_MINIMUM + ROOMS_OVERLAP
      expect(result.errors.some(e => e.code === 'ROOM_AREA_BELOW_MINIMUM')).toBe(true);
      expect(result.errors.some(e => e.code === 'ROOMS_OVERLAP')).toBe(true);
    });

    it('should return valid for a well-formed plan', () => {
      const rooms = [
        makeRoom({ id: 'r1', name: 'Sala', type: 'sala_estar', x: 0, y: 0, width: 4, height: 3, area: 12 }),
        makeRoom({ id: 'r2', name: 'Cozinha', type: 'cozinha', x: 4, y: 0, width: 3, height: 3, area: 9 }),
        makeRoom({ id: 'r3', name: 'Corredor', type: 'corredor', x: 0, y: 3, width: 7, height: 1, area: 7 }),
        makeRoom({ id: 'r4', name: 'Quarto', type: 'quarto', x: 0, y: 4, width: 4, height: 3, area: 12 }),
      ];
      const plan = makePlan(rooms, 40);
      const result = validateAll(plan, 10, 10);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
