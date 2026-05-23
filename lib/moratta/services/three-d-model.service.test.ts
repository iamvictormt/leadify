import { describe, it, expect } from 'vitest';
import {
  generateFromFloorPlan,
  validateCompleteness,
} from './three-d-model.service';
import type { FloorPlanData, Wall, Door, WindowElement, Room, ArchitecturalStyle } from '../types';

// === Test helpers ===

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

function makeWall(overrides: Partial<Wall> = {}): Wall {
  return {
    id: 'wall-1',
    startX: 0,
    startY: 0,
    endX: 4,
    endY: 0,
    thickness: 0.15,
    isExternal: true,
    ...overrides,
  };
}

function makeDoor(overrides: Partial<Door> = {}): Door {
  return {
    id: 'door-1',
    wallId: 'wall-1',
    position: 0.5,
    width: 0.9,
    type: 'single',
    ...overrides,
  };
}

function makeWindow(overrides: Partial<WindowElement> = {}): WindowElement {
  return {
    id: 'window-1',
    wallId: 'wall-1',
    position: 0.5,
    width: 1.2,
    height: 1.0,
    sillHeight: 1.0,
    ...overrides,
  };
}

function makePlan(overrides: Partial<FloorPlanData> = {}): FloorPlanData {
  return {
    id: 'plan-1',
    totalArea: 12,
    rooms: [makeRoom()],
    walls: [makeWall()],
    doors: [],
    windows: [],
    ...overrides,
  };
}

// === Tests ===

describe('ThreeDModelService', () => {
  describe('generateFromFloorPlan', () => {
    it('should generate a complete ThreeDModelData structure', () => {
      const plan = makePlan({
        walls: [
          makeWall({ id: 'w1', startX: 0, startY: 0, endX: 4, endY: 0 }),
          makeWall({ id: 'w2', startX: 4, startY: 0, endX: 4, endY: 3 }),
          makeWall({ id: 'w3', startX: 4, startY: 3, endX: 0, endY: 3 }),
          makeWall({ id: 'w4', startX: 0, startY: 3, endX: 0, endY: 0 }),
        ],
        doors: [makeDoor({ wallId: 'w1' })],
        windows: [makeWindow({ wallId: 'w2' })],
      });

      const result = generateFromFloorPlan(plan, 'moderno');

      expect(result.walls).toHaveLength(4);
      expect(result.floors).toHaveLength(1);
      expect(result.roof).toBeDefined();
      expect(result.openings).toHaveLength(2);
      expect(result.facade).toBeDefined();
    });

    describe('wall generation', () => {
      it('should set wall height to 2.8m', () => {
        const plan = makePlan();
        const result = generateFromFloorPlan(plan, 'moderno');

        for (const wall of result.walls) {
          expect(wall.height).toBe(2.8);
        }
      });

      it('should mark external walls correctly', () => {
        const plan = makePlan({
          walls: [
            makeWall({ id: 'w1', isExternal: true }),
            makeWall({ id: 'w2', isExternal: false, startX: 2, startY: 0, endX: 2, endY: 3 }),
          ],
        });

        const result = generateFromFloorPlan(plan, 'moderno');

        expect(result.walls[0].isExternal).toBe(true);
        expect(result.walls[1].isExternal).toBe(false);
      });

      it('should generate 24 vertex coordinates (8 vertices × 3 components) for each wall', () => {
        const plan = makePlan();
        const result = generateFromFloorPlan(plan, 'moderno');

        for (const wall of result.walls) {
          expect(wall.vertices).toHaveLength(24);
        }
      });

      it('should assign different materials for external vs internal walls', () => {
        const plan = makePlan({
          walls: [
            makeWall({ id: 'w1', isExternal: true }),
            makeWall({ id: 'w2', isExternal: false, startX: 2, startY: 0, endX: 2, endY: 3 }),
          ],
        });

        const result = generateFromFloorPlan(plan, 'moderno');

        expect(result.walls[0].material).toBe('concrete_external');
        expect(result.walls[1].material).toBe('plaster_internal');
      });
    });

    describe('floor generation', () => {
      it('should generate one floor per room', () => {
        const plan = makePlan({
          rooms: [
            makeRoom({ id: 'r1' }),
            makeRoom({ id: 'r2', x: 4, width: 3, area: 9 }),
          ],
        });

        const result = generateFromFloorPlan(plan, 'moderno');

        expect(result.floors).toHaveLength(2);
      });

      it('should set floor level based on room floor property', () => {
        const plan = makePlan({
          rooms: [
            makeRoom({ id: 'r1', floor: 0 }),
            makeRoom({ id: 'r2', floor: 1, x: 0, y: 0, width: 4, height: 3, area: 12 }),
          ],
        });

        const result = generateFromFloorPlan(plan, 'moderno');

        expect(result.floors[0].level).toBe(0);
        expect(result.floors[1].level).toBe(1);
      });

      it('should generate 12 vertex coordinates (4 vertices × 3 components) for each floor', () => {
        const plan = makePlan();
        const result = generateFromFloorPlan(plan, 'moderno');

        for (const floor of result.floors) {
          expect(floor.vertices).toHaveLength(12);
        }
      });
    });

    describe('roof generation by style', () => {
      const testCases: Array<{ style: ArchitecturalStyle; expectedType: string }> = [
        { style: 'moderno', expectedType: 'flat' },
        { style: 'classico', expectedType: 'gable' },
        { style: 'minimalista', expectedType: 'flat' },
        { style: 'rustico', expectedType: 'hip' },
        { style: 'contemporaneo', expectedType: 'mansard' },
      ];

      for (const { style, expectedType } of testCases) {
        it(`should generate ${expectedType} roof for style "${style}"`, () => {
          const plan = makePlan();
          const result = generateFromFloorPlan(plan, style);

          expect(result.roof.type).toBe(expectedType);
        });
      }

      it('should generate roof vertices as an array of numbers', () => {
        const plan = makePlan();
        const result = generateFromFloorPlan(plan, 'moderno');

        expect(result.roof.vertices.length).toBeGreaterThan(0);
        for (const v of result.roof.vertices) {
          expect(typeof v).toBe('number');
        }
      });
    });

    describe('opening generation', () => {
      it('should create an Opening3D for every door', () => {
        const plan = makePlan({
          doors: [
            makeDoor({ id: 'd1', wallId: 'wall-1', position: 0.3 }),
            makeDoor({ id: 'd2', wallId: 'wall-1', position: 0.7 }),
          ],
        });

        const result = generateFromFloorPlan(plan, 'moderno');
        const doorOpenings = result.openings.filter((o) => o.type === 'door');

        expect(doorOpenings).toHaveLength(2);
      });

      it('should create an Opening3D for every window', () => {
        const plan = makePlan({
          windows: [
            makeWindow({ id: 'win1', wallId: 'wall-1', position: 0.25 }),
            makeWindow({ id: 'win2', wallId: 'wall-1', position: 0.75 }),
          ],
        });

        const result = generateFromFloorPlan(plan, 'moderno');
        const windowOpenings = result.openings.filter((o) => o.type === 'window');

        expect(windowOpenings).toHaveLength(2);
      });

      it('should set correct wallId on openings', () => {
        const plan = makePlan({
          walls: [
            makeWall({ id: 'w1' }),
            makeWall({ id: 'w2', startX: 4, startY: 0, endX: 4, endY: 3 }),
          ],
          doors: [makeDoor({ id: 'd1', wallId: 'w1' })],
          windows: [makeWindow({ id: 'win1', wallId: 'w2' })],
        });

        const result = generateFromFloorPlan(plan, 'moderno');

        expect(result.openings[0].wallId).toBe('w1');
        expect(result.openings[1].wallId).toBe('w2');
      });

      it('should compute opening position based on wall position parameter', () => {
        const wall = makeWall({ id: 'w1', startX: 0, startY: 0, endX: 10, endY: 0 });
        const plan = makePlan({
          walls: [wall],
          doors: [makeDoor({ id: 'd1', wallId: 'w1', position: 0.5 })],
        });

        const result = generateFromFloorPlan(plan, 'moderno');
        const doorOpening = result.openings[0];

        // Position at 0.5 along a wall from (0,0) to (10,0) should be at x=5
        expect(doorOpening.position[0]).toBe(5);
        expect(doorOpening.position[2]).toBe(0);
      });

      it('should set door height to 2.1m', () => {
        const plan = makePlan({
          doors: [makeDoor()],
        });

        const result = generateFromFloorPlan(plan, 'moderno');
        const doorOpening = result.openings.find((o) => o.type === 'door');

        expect(doorOpening?.height).toBe(2.1);
      });

      it('should preserve window dimensions', () => {
        const plan = makePlan({
          windows: [makeWindow({ width: 1.5, height: 1.2 })],
        });

        const result = generateFromFloorPlan(plan, 'moderno');
        const windowOpening = result.openings.find((o) => o.type === 'window');

        expect(windowOpening?.width).toBe(1.5);
        expect(windowOpening?.height).toBe(1.2);
      });

      it('should have total openings equal to doors + windows count (Property 14)', () => {
        const plan = makePlan({
          walls: [
            makeWall({ id: 'w1' }),
            makeWall({ id: 'w2', startX: 4, startY: 0, endX: 4, endY: 3 }),
          ],
          doors: [
            makeDoor({ id: 'd1', wallId: 'w1' }),
            makeDoor({ id: 'd2', wallId: 'w2' }),
          ],
          windows: [
            makeWindow({ id: 'win1', wallId: 'w1' }),
            makeWindow({ id: 'win2', wallId: 'w2' }),
            makeWindow({ id: 'win3', wallId: 'w1' }),
          ],
        });

        const result = generateFromFloorPlan(plan, 'moderno');

        expect(result.openings).toHaveLength(5); // 2 doors + 3 windows
      });
    });

    describe('facade generation', () => {
      it('should set facade style matching the input style', () => {
        const plan = makePlan();
        const result = generateFromFloorPlan(plan, 'rustico');

        expect(result.facade.style).toBe('rustico');
      });

      it('should set correct roofType in facade', () => {
        const plan = makePlan();

        expect(generateFromFloorPlan(plan, 'moderno').facade.roofType).toBe('flat');
        expect(generateFromFloorPlan(plan, 'classico').facade.roofType).toBe('gable');
        expect(generateFromFloorPlan(plan, 'rustico').facade.roofType).toBe('hip');
        expect(generateFromFloorPlan(plan, 'contemporaneo').facade.roofType).toBe('mansard');
      });

      it('should set style-appropriate wallFinish', () => {
        const plan = makePlan();

        expect(generateFromFloorPlan(plan, 'moderno').facade.wallFinish).toBe('reboco liso');
        expect(generateFromFloorPlan(plan, 'rustico').facade.wallFinish).toBe('pedra natural');
        expect(generateFromFloorPlan(plan, 'minimalista').facade.wallFinish).toBe('cimento queimado');
      });

      it('should set style-appropriate windowFrameStyle', () => {
        const plan = makePlan();

        expect(generateFromFloorPlan(plan, 'moderno').facade.windowFrameStyle).toBe('alumínio preto');
        expect(generateFromFloorPlan(plan, 'rustico').facade.windowFrameStyle).toBe('madeira');
        expect(generateFromFloorPlan(plan, 'classico').facade.windowFrameStyle).toBe('madeira envernizada');
      });
    });
  });

  describe('validateCompleteness', () => {
    it('should return valid for a complete plan', () => {
      const plan = makePlan({
        walls: [makeWall({ id: 'w1', startX: 0, startY: 0, endX: 4, endY: 0 })],
        doors: [makeDoor({ id: 'd1', wallId: 'w1', position: 0.5 })],
        windows: [makeWindow({ id: 'win1', wallId: 'w1', position: 0.3 })],
      });

      const result = validateCompleteness(plan);

      expect(result.valid).toBe(true);
      expect(result.incompleteElements).toHaveLength(0);
    });

    it('should detect walls with zero dimensions (startX === endX && startY === endY)', () => {
      const plan = makePlan({
        walls: [
          makeWall({ id: 'w1', startX: 2, startY: 3, endX: 2, endY: 3 }), // zero-length
          makeWall({ id: 'w2', startX: 0, startY: 0, endX: 4, endY: 0 }), // valid
        ],
      });

      const result = validateCompleteness(plan);

      expect(result.valid).toBe(false);
      expect(result.incompleteElements).toContain('wall:w1:zero-dimensions');
    });

    it('should detect doors with invalid position (outside 0-1 range)', () => {
      const plan = makePlan({
        walls: [makeWall({ id: 'w1' })],
        doors: [makeDoor({ id: 'd1', wallId: 'w1', position: -0.1 })],
      });

      const result = validateCompleteness(plan);

      expect(result.valid).toBe(false);
      expect(result.incompleteElements).toContain('door:d1:invalid-position');
    });

    it('should detect doors referencing non-existent walls', () => {
      const plan = makePlan({
        walls: [makeWall({ id: 'w1' })],
        doors: [makeDoor({ id: 'd1', wallId: 'non-existent-wall' })],
      });

      const result = validateCompleteness(plan);

      expect(result.valid).toBe(false);
      expect(result.incompleteElements).toContain('door:d1:invalid-wall-reference');
    });

    it('should detect windows with invalid position', () => {
      const plan = makePlan({
        walls: [makeWall({ id: 'w1' })],
        windows: [makeWindow({ id: 'win1', wallId: 'w1', position: 1.5 })],
      });

      const result = validateCompleteness(plan);

      expect(result.valid).toBe(false);
      expect(result.incompleteElements).toContain('window:win1:invalid-position');
    });

    it('should detect windows referencing non-existent walls', () => {
      const plan = makePlan({
        walls: [makeWall({ id: 'w1' })],
        windows: [makeWindow({ id: 'win1', wallId: 'missing-wall' })],
      });

      const result = validateCompleteness(plan);

      expect(result.valid).toBe(false);
      expect(result.incompleteElements).toContain('window:win1:invalid-wall-reference');
    });

    it('should report multiple incomplete elements', () => {
      const plan = makePlan({
        walls: [
          makeWall({ id: 'w1', startX: 5, startY: 5, endX: 5, endY: 5 }), // zero-length
        ],
        doors: [makeDoor({ id: 'd1', wallId: 'non-existent' })],
        windows: [makeWindow({ id: 'win1', wallId: 'w1', position: 2.0 })],
      });

      const result = validateCompleteness(plan);

      expect(result.valid).toBe(false);
      expect(result.incompleteElements.length).toBeGreaterThanOrEqual(3);
      expect(result.incompleteElements).toContain('wall:w1:zero-dimensions');
      expect(result.incompleteElements).toContain('door:d1:invalid-wall-reference');
      expect(result.incompleteElements).toContain('window:win1:invalid-position');
    });

    it('should accept position at boundaries (0 and 1)', () => {
      const plan = makePlan({
        walls: [makeWall({ id: 'w1' })],
        doors: [makeDoor({ id: 'd1', wallId: 'w1', position: 0 })],
        windows: [makeWindow({ id: 'win1', wallId: 'w1', position: 1 })],
      });

      const result = validateCompleteness(plan);

      expect(result.valid).toBe(true);
      expect(result.incompleteElements).toHaveLength(0);
    });

    it('should return valid for plan with no doors or windows', () => {
      const plan = makePlan({
        walls: [makeWall({ id: 'w1', startX: 0, startY: 0, endX: 4, endY: 0 })],
        doors: [],
        windows: [],
      });

      const result = validateCompleteness(plan);

      expect(result.valid).toBe(true);
      expect(result.incompleteElements).toHaveLength(0);
    });

    it('should allow walls with same start/end on one axis only', () => {
      // Horizontal wall: startY === endY but startX !== endX → valid
      const plan = makePlan({
        walls: [makeWall({ id: 'w1', startX: 0, startY: 0, endX: 4, endY: 0 })],
      });

      const result = validateCompleteness(plan);

      expect(result.valid).toBe(true);
    });
  });
});
