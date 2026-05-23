import { describe, it, expect } from 'vitest';
import {
  moveWall,
  addRoom,
  removeRoom,
  undo,
  redo,
  createEditorState,
  snapToGrid,
  calculateRoomArea,
  CanvasEditorState,
} from '@/lib/moratta/services/editor-actions.service';
import { Room, Wall } from '@/lib/moratta/types';

// === Test Helpers ===

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    name: 'Sala',
    type: 'sala_estar',
    x: 0,
    y: 0,
    width: 5,
    height: 4,
    area: 20.0,
    floor: 0,
    ...overrides,
  };
}

function makeWall(overrides: Partial<Wall> = {}): Wall {
  return {
    id: 'wall-1',
    startX: 5,
    startY: 0,
    endX: 5,
    endY: 4,
    thickness: 0.15,
    isExternal: false,
    ...overrides,
  };
}

function makeStateWithTwoRooms(): CanvasEditorState {
  // Two rooms side by side sharing a vertical wall at x=5
  const room1 = makeRoom({ id: 'room-1', name: 'Sala', x: 0, y: 0, width: 5, height: 4, area: 20.0 });
  const room2 = makeRoom({ id: 'room-2', name: 'Quarto', type: 'quarto', x: 5, y: 0, width: 5, height: 4, area: 20.0 });
  const wall = makeWall({ id: 'wall-shared', startX: 5, startY: 0, endX: 5, endY: 4 });

  return createEditorState([room1, room2], [wall]);
}

// === Tests ===

describe('snapToGrid', () => {
  it('snaps to nearest 10cm multiple', () => {
    expect(snapToGrid(0.13)).toBeCloseTo(0.1);
    expect(snapToGrid(0.16)).toBeCloseTo(0.2);
    expect(snapToGrid(0.24)).toBeCloseTo(0.2);
    expect(snapToGrid(1.0)).toBeCloseTo(1.0);
    expect(snapToGrid(3.47)).toBeCloseTo(3.5);
  });

  it('handles zero', () => {
    expect(snapToGrid(0)).toBe(0);
  });

  it('handles exact multiples', () => {
    expect(snapToGrid(2.5)).toBeCloseTo(2.5);
    expect(snapToGrid(10.0)).toBeCloseTo(10.0);
  });

  it('result is always a multiple of 0.10 within floating point tolerance', () => {
    const values = [0.13, 0.27, 1.55, 3.99, 7.03];
    for (const v of values) {
      const snapped = snapToGrid(v);
      // Check that snapped / 0.10 is close to an integer
      const ratio = snapped / 0.10;
      expect(Math.abs(ratio - Math.round(ratio))).toBeLessThan(0.0001);
    }
  });
});

describe('calculateRoomArea', () => {
  it('calculates area rounded to 1 decimal', () => {
    expect(calculateRoomArea(5, 4)).toBe(20.0);
    expect(calculateRoomArea(3, 2)).toBe(6.0);
    expect(calculateRoomArea(2.5, 3.0)).toBe(7.5);
    expect(calculateRoomArea(4.2, 3.1)).toBe(13.0); // 4.2 * 3.1 = 13.02 → 13.0
  });
});

describe('addRoom', () => {
  it('adds a room to the state', () => {
    const state = createEditorState([makeRoom()]);
    const newRoom = makeRoom({ id: 'room-2', name: 'Quarto', type: 'quarto', x: 5, y: 0 });

    const result = addRoom(state, newRoom);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.rooms).toHaveLength(2);
      expect(result.state.rooms[1].id).toBe('room-2');
    }
  });

  it('pushes action to undoStack and clears redoStack', () => {
    const state = createEditorState([makeRoom()]);
    const newRoom = makeRoom({ id: 'room-2', name: 'Quarto', type: 'quarto', x: 5, y: 0 });

    const result = addRoom(state, newRoom);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.undoStack).toHaveLength(1);
      expect(result.state.undoStack[0].type).toBe('addRoom');
      expect(result.state.redoStack).toHaveLength(0);
    }
  });

  it('rejects when rooms count is at maximum (30)', () => {
    const rooms = Array.from({ length: 30 }, (_, i) =>
      makeRoom({ id: `room-${i}`, x: i * 2, width: 2 })
    );
    const state = createEditorState(rooms);
    const newRoom = makeRoom({ id: 'room-extra' });

    const result = addRoom(state, newRoom);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('MAX_ROOMS');
    }
  });

  it('enforces max undo stack size of 20', () => {
    let state = createEditorState([makeRoom()]);

    // Add 21 rooms (first one already exists)
    for (let i = 1; i <= 21; i++) {
      const room = makeRoom({ id: `room-${i}`, x: i * 3, width: 2 });
      const result = addRoom(state, room);
      if (result.success) {
        state = result.state;
      }
    }

    expect(state.undoStack.length).toBeLessThanOrEqual(20);
  });

  it('generates alert when room area is below 4m²', () => {
    const state = createEditorState([makeRoom()]);
    const smallRoom = makeRoom({ id: 'small', name: 'Despensa', type: 'despensa', x: 6, y: 0, width: 1.5, height: 2, area: 3.0 });

    const result = addRoom(state, smallRoom);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.alerts).toBeDefined();
      expect(result.alerts!.length).toBeGreaterThan(0);
      expect(result.alerts![0].type).toBe('BELOW_MINIMUM_AREA');
      expect(result.alerts![0].roomId).toBe('small');
    }
  });
});

describe('removeRoom', () => {
  it('removes a room from the state', () => {
    const room1 = makeRoom({ id: 'room-1' });
    const room2 = makeRoom({ id: 'room-2', x: 5 });
    const state = createEditorState([room1, room2]);

    const result = removeRoom(state, 'room-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.rooms).toHaveLength(1);
      expect(result.state.rooms[0].id).toBe('room-2');
    }
  });

  it('rejects when only 1 room remains', () => {
    const state = createEditorState([makeRoom()]);

    const result = removeRoom(state, 'room-1');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('MIN_ROOMS');
    }
  });

  it('pushes action to undoStack and clears redoStack', () => {
    const room1 = makeRoom({ id: 'room-1' });
    const room2 = makeRoom({ id: 'room-2', x: 5 });
    const state = createEditorState([room1, room2]);

    const result = removeRoom(state, 'room-1');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.undoStack).toHaveLength(1);
      expect(result.state.undoStack[0].type).toBe('removeRoom');
      expect(result.state.redoStack).toHaveLength(0);
    }
  });
});

describe('moveWall', () => {
  it('snaps wall coordinates to 10cm grid', () => {
    const state = makeStateWithTwoRooms();

    const result = moveWall(state, 'wall-shared', 5.13, 0, 5.13, 4, 10, 10);

    expect(result.success).toBe(true);
    if (result.success) {
      const movedWall = result.state.walls.find(w => w.id === 'wall-shared')!;
      expect(movedWall.startX).toBeCloseTo(5.1);
      expect(movedWall.endX).toBeCloseTo(5.1);
      // Verify grid alignment: coordinate / 0.10 should be close to an integer
      expect(Math.abs(movedWall.startX / 0.10 - Math.round(movedWall.startX / 0.10))).toBeLessThan(0.0001);
      expect(Math.abs(movedWall.startY / 0.10 - Math.round(movedWall.startY / 0.10))).toBeLessThan(0.0001);
      expect(Math.abs(movedWall.endX / 0.10 - Math.round(movedWall.endX / 0.10))).toBeLessThan(0.0001);
      expect(Math.abs(movedWall.endY / 0.10 - Math.round(movedWall.endY / 0.10))).toBeLessThan(0.0001);
    }
  });

  it('recalculates adjacent room areas after wall move', () => {
    const state = makeStateWithTwoRooms();
    // Move the shared wall from x=5 to x=6
    const result = moveWall(state, 'wall-shared', 6, 0, 6, 4, 10, 10);

    expect(result.success).toBe(true);
    if (result.success) {
      const room1 = result.state.rooms.find(r => r.id === 'room-1')!;
      const room2 = result.state.rooms.find(r => r.id === 'room-2')!;
      // Room 1 should now be wider (6m instead of 5m)
      expect(room1.width).toBeCloseTo(6);
      expect(room1.area).toBeCloseTo(24.0);
      // Room 2 should now be narrower (4m instead of 5m)
      expect(room2.width).toBeCloseTo(4);
      expect(room2.area).toBeCloseTo(16.0);
    }
  });

  it('rejects movement that causes boundary violation', () => {
    const state = makeStateWithTwoRooms();
    // Move wall beyond lot boundary (lot is 10m wide)
    const result = moveWall(state, 'wall-shared', 11, 0, 11, 4, 10, 4);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('BOUNDARY_VIOLATION');
    }
  });

  it('rejects movement that causes overlap', () => {
    // Create a scenario where moving a wall would cause overlap
    const room1 = makeRoom({ id: 'room-1', x: 0, y: 0, width: 5, height: 4, area: 20.0 });
    const room2 = makeRoom({ id: 'room-2', x: 5, y: 0, width: 3, height: 4, area: 12.0 });
    const room3 = makeRoom({ id: 'room-3', x: 8, y: 0, width: 2, height: 4, area: 8.0 });
    const wall = makeWall({ id: 'wall-shared', startX: 5, startY: 0, endX: 5, endY: 4 });

    const state = createEditorState([room1, room2, room3], [wall]);

    // Move wall from x=5 to x=9, which would make room2 extend to x=9 overlapping room3
    const result = moveWall(state, 'wall-shared', 9, 0, 9, 4, 10, 4);

    // This should be rejected due to overlap
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('OVERLAP');
    }
  });

  it('pushes action to undoStack and clears redoStack', () => {
    const state = makeStateWithTwoRooms();
    const result = moveWall(state, 'wall-shared', 6, 0, 6, 4, 10, 10);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state.undoStack).toHaveLength(1);
      expect(result.state.undoStack[0].type).toBe('moveWall');
      expect(result.state.redoStack).toHaveLength(0);
    }
  });

  it('generates alert when wall move results in room below 4m²', () => {
    const room1 = makeRoom({ id: 'room-1', x: 0, y: 0, width: 5, height: 4, area: 20.0 });
    const room2 = makeRoom({ id: 'room-2', x: 5, y: 0, width: 5, height: 4, area: 20.0 });
    const wall = makeWall({ id: 'wall-shared', startX: 5, startY: 0, endX: 5, endY: 4 });

    const state = createEditorState([room1, room2], [wall]);

    // Move wall to x=9, making room2 only 1m wide (area = 4.0)
    // Move wall to x=9.1, making room2 0.9m wide (area = 3.6)
    const result = moveWall(state, 'wall-shared', 9.1, 0, 9.1, 4, 10, 10);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.alerts).toBeDefined();
      const alertForRoom2 = result.alerts!.find(a => a.roomId === 'room-2');
      expect(alertForRoom2).toBeDefined();
      expect(alertForRoom2!.type).toBe('BELOW_MINIMUM_AREA');
    }
  });
});

describe('undo', () => {
  it('undoes an addRoom action', () => {
    const state = createEditorState([makeRoom()]);
    const newRoom = makeRoom({ id: 'room-2', name: 'Quarto', type: 'quarto', x: 5, y: 0 });

    const addResult = addRoom(state, newRoom);
    expect(addResult.success).toBe(true);
    if (!addResult.success) return;

    const undoResult = undo(addResult.state);
    expect(undoResult.success).toBe(true);
    if (undoResult.success) {
      expect(undoResult.state.rooms).toHaveLength(1);
      expect(undoResult.state.rooms[0].id).toBe('room-1');
      expect(undoResult.state.undoStack).toHaveLength(0);
      expect(undoResult.state.redoStack).toHaveLength(1);
    }
  });

  it('undoes a removeRoom action', () => {
    const room1 = makeRoom({ id: 'room-1' });
    const room2 = makeRoom({ id: 'room-2', x: 5 });
    const state = createEditorState([room1, room2]);

    const removeResult = removeRoom(state, 'room-1');
    expect(removeResult.success).toBe(true);
    if (!removeResult.success) return;

    const undoResult = undo(removeResult.state);
    expect(undoResult.success).toBe(true);
    if (undoResult.success) {
      expect(undoResult.state.rooms).toHaveLength(2);
      expect(undoResult.state.rooms.find(r => r.id === 'room-1')).toBeDefined();
    }
  });

  it('returns same state when undoStack is empty', () => {
    const state = createEditorState([makeRoom()]);
    const result = undo(state);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state).toEqual(state);
    }
  });
});

describe('redo', () => {
  it('redoes an undone addRoom action', () => {
    const state = createEditorState([makeRoom()]);
    const newRoom = makeRoom({ id: 'room-2', name: 'Quarto', type: 'quarto', x: 5, y: 0 });

    const addResult = addRoom(state, newRoom);
    expect(addResult.success).toBe(true);
    if (!addResult.success) return;

    const undoResult = undo(addResult.state);
    expect(undoResult.success).toBe(true);
    if (!undoResult.success) return;

    const redoResult = redo(undoResult.state);
    expect(redoResult.success).toBe(true);
    if (redoResult.success) {
      expect(redoResult.state.rooms).toHaveLength(2);
      expect(redoResult.state.rooms[1].id).toBe('room-2');
      expect(redoResult.state.undoStack).toHaveLength(1);
      expect(redoResult.state.redoStack).toHaveLength(0);
    }
  });

  it('returns same state when redoStack is empty', () => {
    const state = createEditorState([makeRoom()]);
    const result = redo(state);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.state).toEqual(state);
    }
  });
});

describe('undo/redo round trip', () => {
  it('multiple actions followed by undos restore original state', () => {
    let state = createEditorState([makeRoom({ id: 'room-1', x: 0, y: 0, width: 5, height: 4, area: 20.0 })]);
    const originalRooms = [...state.rooms];

    // Perform 3 addRoom actions
    for (let i = 2; i <= 4; i++) {
      const room = makeRoom({ id: `room-${i}`, x: (i - 1) * 5, width: 5 });
      const result = addRoom(state, room);
      if (result.success) state = result.state;
    }

    expect(state.rooms).toHaveLength(4);

    // Undo all 3 actions
    for (let i = 0; i < 3; i++) {
      const result = undo(state);
      if (result.success) state = result.state;
    }

    expect(state.rooms).toHaveLength(1);
    expect(state.rooms[0].id).toBe('room-1');
  });

  it('undo then redo restores the action', () => {
    const state = createEditorState([makeRoom()]);
    const newRoom = makeRoom({ id: 'room-2', x: 5 });

    let current = state;
    const addResult = addRoom(current, newRoom);
    if (addResult.success) current = addResult.state;

    const undoResult = undo(current);
    if (undoResult.success) current = undoResult.state;
    expect(current.rooms).toHaveLength(1);

    const redoResult = redo(current);
    if (redoResult.success) current = redoResult.state;
    expect(current.rooms).toHaveLength(2);
    expect(current.rooms[1].id).toBe('room-2');
  });
});
