import { Room, Wall, Door, WindowElement } from '../types';

// === Editor State Types ===

export interface EditorAction {
  type: 'moveWall' | 'addRoom' | 'removeRoom';
  payload: unknown;
  inverse: unknown;
}

export interface MoveWallPayload {
  wallId: string;
  prevStartX: number;
  prevStartY: number;
  prevEndX: number;
  prevEndY: number;
  newStartX: number;
  newStartY: number;
  newEndX: number;
  newEndY: number;
  prevRooms: Room[];
  newRooms: Room[];
}

export interface AddRoomPayload {
  room: Room;
}

export interface RemoveRoomPayload {
  room: Room;
}

export interface CanvasEditorState {
  rooms: Room[];
  walls: Wall[];
  doors: Door[];
  windows: WindowElement[];
  selectedElement: string | null;
  undoStack: EditorAction[];
  redoStack: EditorAction[];
  gridSize: number;
  zoom: number;
  pan: { x: number; y: number };
}

export interface EditorResult {
  success: true;
  state: CanvasEditorState;
  alerts?: EditorAlert[];
}

export interface EditorRejection {
  success: false;
  reason: string;
  code: 'OVERLAP' | 'BOUNDARY_VIOLATION' | 'MAX_ROOMS' | 'MIN_ROOMS';
}

export interface EditorAlert {
  type: 'BELOW_MINIMUM_AREA';
  roomId: string;
  roomName: string;
  area: number;
}

export type EditorActionResult = EditorResult | EditorRejection;

// === Constants ===

const MAX_UNDO_STACK_SIZE = 20;
const MAX_ROOMS = 30;
const MIN_ROOMS = 1;
const GRID_SIZE = 0.10;
const MIN_ROOM_AREA = 4.0;

// === Helper Functions ===

/**
 * Snap a coordinate to the 10cm grid (multiples of 0.10).
 */
export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/**
 * Round a number to 1 decimal place (for area calculations).
 */
export function roundArea(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Calculate room area from width and height, rounded to 1 decimal.
 */
export function calculateRoomArea(width: number, height: number): number {
  return roundArea(width * height);
}

/**
 * Check if two rooms overlap (intersection area > 0).
 */
function roomsOverlap(a: Room, b: Room): boolean {
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return overlapX > 0.001 && overlapY > 0.001;
}

/**
 * Check if any pair of rooms in the list overlaps.
 */
function hasOverlap(rooms: Room[]): boolean {
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (roomsOverlap(rooms[i], rooms[j])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if all rooms are within lot boundaries.
 */
function allWithinBoundaries(rooms: Room[], lotWidth: number, lotLength: number): boolean {
  for (const room of rooms) {
    if (room.x < -0.001 || room.y < -0.001) return false;
    if (room.x + room.width > lotWidth + 0.001) return false;
    if (room.y + room.height > lotLength + 0.001) return false;
  }
  return true;
}

/**
 * Determine if a room is adjacent to a wall.
 * A wall is adjacent if it runs along one of the room's edges.
 */
function isRoomAdjacentToWall(room: Room, wall: Wall): boolean {
  const roomLeft = room.x;
  const roomRight = room.x + room.width;
  const roomTop = room.y;
  const roomBottom = room.y + room.height;

  // Check if wall is horizontal (same Y for start and end)
  const isHorizontal = Math.abs(wall.startY - wall.endY) < 0.001;
  // Check if wall is vertical (same X for start and end)
  const isVertical = Math.abs(wall.startX - wall.endX) < 0.001;

  if (isHorizontal) {
    const wallY = wall.startY;
    const wallMinX = Math.min(wall.startX, wall.endX);
    const wallMaxX = Math.max(wall.startX, wall.endX);

    // Wall along top edge
    if (Math.abs(wallY - roomTop) < 0.001 && wallMinX < roomRight - 0.001 && wallMaxX > roomLeft + 0.001) {
      return true;
    }
    // Wall along bottom edge
    if (Math.abs(wallY - roomBottom) < 0.001 && wallMinX < roomRight - 0.001 && wallMaxX > roomLeft + 0.001) {
      return true;
    }
  }

  if (isVertical) {
    const wallX = wall.startX;
    const wallMinY = Math.min(wall.startY, wall.endY);
    const wallMaxY = Math.max(wall.startY, wall.endY);

    // Wall along left edge
    if (Math.abs(wallX - roomLeft) < 0.001 && wallMinY < roomBottom - 0.001 && wallMaxY > roomTop + 0.001) {
      return true;
    }
    // Wall along right edge
    if (Math.abs(wallX - roomRight) < 0.001 && wallMinY < roomBottom - 0.001 && wallMaxY > roomTop + 0.001) {
      return true;
    }
  }

  return false;
}

/**
 * Recalculate rooms affected by a wall movement.
 * When a wall moves, adjacent rooms resize accordingly.
 */
function recalculateAdjacentRooms(
  rooms: Room[],
  wall: Wall,
  newWall: Wall,
): Room[] {
  const updatedRooms = rooms.map(room => {
    if (!isRoomAdjacentToWall(room, wall)) {
      return room;
    }

    const roomLeft = room.x;
    const roomRight = room.x + room.width;
    const roomTop = room.y;
    const roomBottom = room.y + room.height;

    let newX = room.x;
    let newY = room.y;
    let newWidth = room.width;
    let newHeight = room.height;

    const isHorizontal = Math.abs(wall.startY - wall.endY) < 0.001;
    const isVertical = Math.abs(wall.startX - wall.endX) < 0.001;

    if (isHorizontal) {
      const oldWallY = wall.startY;
      const newWallY = newWall.startY;
      const deltaY = newWallY - oldWallY;

      // Wall is at the top edge of the room
      if (Math.abs(oldWallY - roomTop) < 0.001) {
        newY = snapToGrid(roomTop + deltaY);
        newHeight = snapToGrid(roomBottom - newY);
      }
      // Wall is at the bottom edge of the room
      else if (Math.abs(oldWallY - roomBottom) < 0.001) {
        newHeight = snapToGrid(newWallY - roomTop);
      }
    }

    if (isVertical) {
      const oldWallX = wall.startX;
      const newWallX = newWall.startX;
      const deltaX = newWallX - oldWallX;

      // Wall is at the left edge of the room
      if (Math.abs(oldWallX - roomLeft) < 0.001) {
        newX = snapToGrid(roomLeft + deltaX);
        newWidth = snapToGrid(roomRight - newX);
      }
      // Wall is at the right edge of the room
      else if (Math.abs(oldWallX - roomRight) < 0.001) {
        newWidth = snapToGrid(newWallX - roomLeft);
      }
    }

    // Ensure positive dimensions
    if (newWidth <= 0 || newHeight <= 0) {
      return room; // Don't update if dimensions become invalid
    }

    const newArea = calculateRoomArea(newWidth, newHeight);

    return {
      ...room,
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      area: newArea,
    };
  });

  return updatedRooms;
}

/**
 * Push an action to the undo stack, enforcing max size of 20.
 * Drops the oldest action if the stack is full.
 */
function pushToStack(stack: EditorAction[], action: EditorAction): EditorAction[] {
  const newStack = [...stack, action];
  if (newStack.length > MAX_UNDO_STACK_SIZE) {
    return newStack.slice(newStack.length - MAX_UNDO_STACK_SIZE);
  }
  return newStack;
}

/**
 * Generate alerts for rooms below minimum area.
 */
function generateAlerts(rooms: Room[]): EditorAlert[] {
  const alerts: EditorAlert[] = [];
  for (const room of rooms) {
    if (room.area < MIN_ROOM_AREA) {
      alerts.push({
        type: 'BELOW_MINIMUM_AREA',
        roomId: room.id,
        roomName: room.name,
        area: room.area,
      });
    }
  }
  return alerts;
}

// === Editor Action Functions ===

/**
 * Move a wall to a new position, snapping to 10cm grid.
 * Recalculates areas of adjacent rooms.
 * Rejects if movement causes overlap or boundary violations.
 */
export function moveWall(
  state: CanvasEditorState,
  wallId: string,
  newStartX: number,
  newStartY: number,
  newEndX: number,
  newEndY: number,
  lotWidth: number,
  lotLength: number,
): EditorActionResult {
  const wallIndex = state.walls.findIndex(w => w.id === wallId);
  if (wallIndex === -1) {
    return { success: false, reason: 'Wall not found', code: 'BOUNDARY_VIOLATION' };
  }

  const oldWall = state.walls[wallIndex];

  // Snap all coordinates to 10cm grid
  const snappedStartX = snapToGrid(newStartX);
  const snappedStartY = snapToGrid(newStartY);
  const snappedEndX = snapToGrid(newEndX);
  const snappedEndY = snapToGrid(newEndY);

  const newWall: Wall = {
    ...oldWall,
    startX: snappedStartX,
    startY: snappedStartY,
    endX: snappedEndX,
    endY: snappedEndY,
  };

  // Recalculate adjacent rooms
  const newRooms = recalculateAdjacentRooms(state.rooms, oldWall, newWall);

  // Validate: within boundaries (check first)
  if (!allWithinBoundaries(newRooms, lotWidth, lotLength)) {
    return { success: false, reason: 'Movement exceeds lot boundaries', code: 'BOUNDARY_VIOLATION' };
  }

  // Validate: no overlap
  if (hasOverlap(newRooms)) {
    return { success: false, reason: 'Movement causes room overlap', code: 'OVERLAP' };
  }

  // Build the action for undo
  const action: EditorAction = {
    type: 'moveWall',
    payload: {
      wallId,
      prevStartX: oldWall.startX,
      prevStartY: oldWall.startY,
      prevEndX: oldWall.endX,
      prevEndY: oldWall.endY,
      newStartX: snappedStartX,
      newStartY: snappedStartY,
      newEndX: snappedEndX,
      newEndY: snappedEndY,
      prevRooms: state.rooms,
      newRooms,
    } as MoveWallPayload,
    inverse: {
      wallId,
      prevStartX: snappedStartX,
      prevStartY: snappedStartY,
      prevEndX: snappedEndX,
      prevEndY: snappedEndY,
      newStartX: oldWall.startX,
      newStartY: oldWall.startY,
      newEndX: oldWall.endX,
      newEndY: oldWall.endY,
      prevRooms: newRooms,
      newRooms: state.rooms,
    } as MoveWallPayload,
  };

  // Update walls array
  const newWalls = [...state.walls];
  newWalls[wallIndex] = newWall;

  // Generate alerts for rooms below minimum area
  const alerts = generateAlerts(newRooms);

  const newState: CanvasEditorState = {
    ...state,
    walls: newWalls,
    rooms: newRooms,
    undoStack: pushToStack(state.undoStack, action),
    redoStack: [], // Clear redo stack on new action
  };

  return { success: true, state: newState, alerts: alerts.length > 0 ? alerts : undefined };
}

/**
 * Add a room to the floor plan.
 * Rejects if rooms.length >= 30.
 */
export function addRoom(
  state: CanvasEditorState,
  room: Room,
): EditorActionResult {
  if (state.rooms.length >= MAX_ROOMS) {
    return { success: false, reason: 'Maximum of 30 rooms reached', code: 'MAX_ROOMS' };
  }

  const action: EditorAction = {
    type: 'addRoom',
    payload: { room } as AddRoomPayload,
    inverse: { room } as RemoveRoomPayload,
  };

  const newRooms = [...state.rooms, room];
  const alerts = generateAlerts(newRooms);

  const newState: CanvasEditorState = {
    ...state,
    rooms: newRooms,
    undoStack: pushToStack(state.undoStack, action),
    redoStack: [], // Clear redo stack on new action
  };

  return { success: true, state: newState, alerts: alerts.length > 0 ? alerts : undefined };
}

/**
 * Remove a room from the floor plan.
 * Rejects if rooms.length <= 1.
 */
export function removeRoom(
  state: CanvasEditorState,
  roomId: string,
): EditorActionResult {
  if (state.rooms.length <= MIN_ROOMS) {
    return { success: false, reason: 'Cannot remove the last room', code: 'MIN_ROOMS' };
  }

  const roomToRemove = state.rooms.find(r => r.id === roomId);
  if (!roomToRemove) {
    return { success: false, reason: 'Room not found', code: 'BOUNDARY_VIOLATION' };
  }

  const action: EditorAction = {
    type: 'removeRoom',
    payload: { room: roomToRemove } as RemoveRoomPayload,
    inverse: { room: roomToRemove } as AddRoomPayload,
  };

  const newRooms = state.rooms.filter(r => r.id !== roomId);

  const newState: CanvasEditorState = {
    ...state,
    rooms: newRooms,
    undoStack: pushToStack(state.undoStack, action),
    redoStack: [], // Clear redo stack on new action
  };

  return { success: true, state: newState };
}

/**
 * Undo the last action.
 * Pops from undoStack, applies inverse, pushes to redoStack.
 */
export function undo(state: CanvasEditorState): EditorActionResult {
  if (state.undoStack.length === 0) {
    return { success: true, state }; // Nothing to undo
  }

  const lastAction = state.undoStack[state.undoStack.length - 1];
  const newUndoStack = state.undoStack.slice(0, -1);

  const newState = applyInverseAction(state, lastAction);

  return {
    success: true,
    state: {
      ...newState,
      undoStack: newUndoStack,
      redoStack: pushToStack(state.redoStack, lastAction),
    },
  };
}

/**
 * Redo the last undone action.
 * Pops from redoStack, applies action, pushes to undoStack.
 */
export function redo(state: CanvasEditorState): EditorActionResult {
  if (state.redoStack.length === 0) {
    return { success: true, state }; // Nothing to redo
  }

  const lastAction = state.redoStack[state.redoStack.length - 1];
  const newRedoStack = state.redoStack.slice(0, -1);

  const newState = applyAction(state, lastAction);

  return {
    success: true,
    state: {
      ...newState,
      undoStack: pushToStack(state.undoStack, lastAction),
      redoStack: newRedoStack,
    },
  };
}

// === Action Application ===

/**
 * Apply an action forward (for redo).
 */
function applyAction(state: CanvasEditorState, action: EditorAction): CanvasEditorState {
  switch (action.type) {
    case 'moveWall': {
      const payload = action.payload as MoveWallPayload;
      const wallIndex = state.walls.findIndex(w => w.id === payload.wallId);
      if (wallIndex === -1) return state;

      const newWalls = [...state.walls];
      newWalls[wallIndex] = {
        ...newWalls[wallIndex],
        startX: payload.newStartX,
        startY: payload.newStartY,
        endX: payload.newEndX,
        endY: payload.newEndY,
      };

      return {
        ...state,
        walls: newWalls,
        rooms: payload.newRooms,
      };
    }

    case 'addRoom': {
      const payload = action.payload as AddRoomPayload;
      return {
        ...state,
        rooms: [...state.rooms, payload.room],
      };
    }

    case 'removeRoom': {
      const payload = action.payload as RemoveRoomPayload;
      return {
        ...state,
        rooms: state.rooms.filter(r => r.id !== payload.room.id),
      };
    }

    default:
      return state;
  }
}

/**
 * Apply the inverse of an action (for undo).
 */
function applyInverseAction(state: CanvasEditorState, action: EditorAction): CanvasEditorState {
  switch (action.type) {
    case 'moveWall': {
      const inverse = action.inverse as MoveWallPayload;
      const wallIndex = state.walls.findIndex(w => w.id === inverse.wallId);
      if (wallIndex === -1) return state;

      const newWalls = [...state.walls];
      newWalls[wallIndex] = {
        ...newWalls[wallIndex],
        startX: inverse.newStartX,
        startY: inverse.newStartY,
        endX: inverse.newEndX,
        endY: inverse.newEndY,
      };

      return {
        ...state,
        walls: newWalls,
        rooms: inverse.newRooms,
      };
    }

    case 'addRoom': {
      // Inverse of addRoom is removeRoom
      const payload = action.payload as AddRoomPayload;
      return {
        ...state,
        rooms: state.rooms.filter(r => r.id !== payload.room.id),
      };
    }

    case 'removeRoom': {
      // Inverse of removeRoom is addRoom
      const payload = action.payload as RemoveRoomPayload;
      return {
        ...state,
        rooms: [...state.rooms, payload.room],
      };
    }

    default:
      return state;
  }
}

// === Factory ===

/**
 * Create an initial empty editor state.
 */
export function createEditorState(
  rooms: Room[] = [],
  walls: Wall[] = [],
  doors: Door[] = [],
  windows: WindowElement[] = [],
): CanvasEditorState {
  return {
    rooms,
    walls,
    doors,
    windows,
    selectedElement: null,
    undoStack: [],
    redoStack: [],
    gridSize: GRID_SIZE,
    zoom: 1,
    pan: { x: 0, y: 0 },
  };
}
