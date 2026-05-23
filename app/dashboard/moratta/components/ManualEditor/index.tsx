"use client"

import { useState, useCallback, useEffect } from 'react';
import type { EditorState, ViewportState, EditorTool, EditorWall, RoomType, Point } from './types';
import { GRID_SNAP, ROOM_COLORS } from './types';
import { polygonArea, canMergeWalls, mergeWalls } from './utils';
import { Toolbar } from './Toolbar';
import { EditorCanvas } from './Canvas';
import type { EditorWall, Point } from './types';

/**
 * Find the center of the room that contains the given point.
 * Uses raycasting to find bounding walls in each direction.
 */
function findRoomCenter(
  x: number,
  y: number,
  walls: EditorWall[],
  lotWidth: number,
  lotLength: number
): Point {
  // Cast rays in 4 directions to find nearest walls
  let left = 0;
  let right = lotWidth;
  let top = 0;
  let bottom = lotLength;

  for (const wall of walls) {
    const isHorizontal = Math.abs(wall.start.y - wall.end.y) < 0.05;
    const isVertical = Math.abs(wall.start.x - wall.end.x) < 0.05;

    if (isHorizontal) {
      const wy = wall.start.y;
      const minX = Math.min(wall.start.x, wall.end.x);
      const maxX = Math.max(wall.start.x, wall.end.x);

      // Check if point's X is within wall's X range
      if (x >= minX - 0.05 && x <= maxX + 0.05) {
        if (wy < y && wy > top) top = wy;      // wall above
        if (wy > y && wy < bottom) bottom = wy; // wall below
      }
    }

    if (isVertical) {
      const wx = wall.start.x;
      const minY = Math.min(wall.start.y, wall.end.y);
      const maxY = Math.max(wall.start.y, wall.end.y);

      // Check if point's Y is within wall's Y range
      if (y >= minY - 0.05 && y <= maxY + 0.05) {
        if (wx < x && wx > left) left = wx;     // wall to left
        if (wx > x && wx < right) right = wx;   // wall to right
      }
    }
  }

  // Center of the detected bounding box
  return {
    x: Math.round(((left + right) / 2) * 10) / 10,
    y: Math.round(((top + bottom) / 2) * 10) / 10,
  };
}

interface ManualEditorProps {
  lotWidth: number;
  lotLength: number;
  projectId: string;
}

export function ManualEditor({ lotWidth, lotLength, projectId }: ManualEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTool, setActiveTool] = useState<EditorTool>('wall');

  // Editor state with undo/redo
  const [state, setState] = useState<EditorState>({
    walls: [],
    doors: [],
    windows: [],
    rooms: [],
    labels: [],
    furniture: [],
    lotWidth,
    lotLength,
  });

  const [undoStack, setUndoStack] = useState<EditorState[]>([]);
  const [redoStack, setRedoStack] = useState<EditorState[]>([]);

  // Viewport
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    gridSize: GRID_SNAP,
    showGrid: true,
    showRuler: true,
    showMeasures: true,
  });

  // === State management with undo ===
  const pushState = useCallback((newState: EditorState) => {
    setUndoStack(prev => [...prev.slice(-30), state]); // Keep last 30
    setRedoStack([]);
    setState(newState);
  }, [state]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setRedoStack(s => [...s, state]);
    setState(prev);
  }, [undoStack, state]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(s => s.slice(0, -1));
    setUndoStack(s => [...s, state]);
    setState(next);
  }, [redoStack, state]);

  // === Wall operations ===
  const handleAddWall = useCallback((wall: EditorWall) => {
    let mergedWalls = [...state.walls];
    let newWall = wall;
    let merged = true;

    while (merged) {
      merged = false;
      for (let i = 0; i < mergedWalls.length; i++) {
        if (canMergeWalls(mergedWalls[i], newWall)) {
          newWall = mergeWalls(mergedWalls[i], newWall);
          mergedWalls.splice(i, 1);
          merged = true;
          break;
        }
      }
    }

    mergedWalls.push(newWall);

    // Remove labels whose room was modified (wall crosses through their space)
    const remainingLabels = state.labels.filter(l => {
      const oldCenter = findRoomCenter(l.x, l.y, state.walls, state.lotWidth, state.lotLength);
      const newCenter = findRoomCenter(l.x, l.y, mergedWalls, state.lotWidth, state.lotLength);
      // If center changed, the room was split/modified — remove label
      const dx = Math.abs(oldCenter.x - newCenter.x);
      const dy = Math.abs(oldCenter.y - newCenter.y);
      return dx < 0.2 && dy < 0.2; // keep only if center didn't change
    }).map((l, i) => ({ ...l, number: i + 1 })); // renumber

    pushState({ ...state, walls: mergedWalls, labels: remainingLabels });
  }, [state, pushState]);

  const handleDeleteWall = useCallback((id: string) => {
    pushState({
      ...state,
      walls: state.walls.filter(w => w.id !== id),
      doors: state.doors.filter(d => d.wallId !== id),
      windows: state.windows.filter(w => w.wallId !== id),
    });
  }, [state, pushState]);

  const handleDeleteDoor = useCallback((id: string) => {
    pushState({ ...state, doors: state.doors.filter(d => d.id !== id) });
  }, [state, pushState]);

  const handleDeleteWindow = useCallback((id: string) => {
    pushState({ ...state, windows: state.windows.filter(w => w.id !== id) });
  }, [state, pushState]);

  // === Box (room rectangle = 4 walls at once) ===
  const handleAddBox = useCallback((start: Point, end: Point) => {
    const x1 = Math.min(start.x, end.x);
    const y1 = Math.min(start.y, end.y);
    const x2 = Math.max(start.x, end.x);
    const y2 = Math.max(start.y, end.y);

    const newWalls: EditorWall[] = [
      { id: crypto.randomUUID(), start: { x: x1, y: y1 }, end: { x: x2, y: y1 }, thickness: 0.15 },
      { id: crypto.randomUUID(), start: { x: x2, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.15 },
      { id: crypto.randomUUID(), start: { x: x1, y: y2 }, end: { x: x2, y: y2 }, thickness: 0.15 },
      { id: crypto.randomUUID(), start: { x: x1, y: y1 }, end: { x: x1, y: y2 }, thickness: 0.15 },
    ];

    let mergedWalls = [...state.walls];
    for (const wall of newWalls) {
      let newWall = wall;
      let merged = true;
      while (merged) {
        merged = false;
        for (let i = 0; i < mergedWalls.length; i++) {
          if (canMergeWalls(mergedWalls[i], newWall)) {
            newWall = mergeWalls(mergedWalls[i], newWall);
            mergedWalls.splice(i, 1);
            merged = true;
            break;
          }
        }
      }
      mergedWalls.push(newWall);
    }

    // Remove labels whose room was modified by the new box
    const remainingLabels = state.labels.filter(l => {
      const oldCenter = findRoomCenter(l.x, l.y, state.walls, state.lotWidth, state.lotLength);
      const newCenter = findRoomCenter(l.x, l.y, mergedWalls, state.lotWidth, state.lotLength);
      const dx = Math.abs(oldCenter.x - newCenter.x);
      const dy = Math.abs(oldCenter.y - newCenter.y);
      return dx < 0.2 && dy < 0.2;
    }).map((l, i) => ({ ...l, number: i + 1 }));

    pushState({ ...state, walls: mergedWalls, labels: remainingLabels });
  }, [state, pushState]);

  // === Door operations ===
  const [doorStyle, setDoorStyle] = useState<'arc' | 'frame'>('arc');

  const handleAddDoor = useCallback((wallId: string, position: number) => {
    const door = {
      id: crypto.randomUUID(),
      wallId,
      position,
      width: 0.8,
      type: 'single' as const,
      openDirection: 'left' as const,
      style: doorStyle,
    };
    pushState({ ...state, doors: [...state.doors, door] });
  }, [state, pushState, doorStyle]);

  // === Window operations ===
  const handleAddWindow = useCallback((wallId: string, position: number) => {
    const win = {
      id: crypto.randomUUID(),
      wallId,
      position,
      width: 0.6,
      height: 1.0,
      sillHeight: 1.0,
    };
    pushState({ ...state, windows: [...state.windows, win] });
  }, [state, pushState]);

  // === Room operations ===
  const handleAddRoom = useCallback((points: Point[], name: string, type: RoomType) => {
    const area = polygonArea(points);
    const room = {
      id: crypto.randomUUID(),
      name,
      type,
      points,
      area: Math.round(area * 10) / 10,
      color: ROOM_COLORS[type],
    };
    pushState({ ...state, rooms: [...state.rooms, room] });
  }, [state, pushState]);

  // === Measure state ===
  const [measureResult, setMeasureResult] = useState<string | null>(null);

  // === Label (nomear) ===
  const handleAddLabel = useCallback((x: number, y: number) => {
    // Check if clicking on an existing label (to rename or delete)
    const clickedLabel = state.labels.find(l => {
      const dx = Math.abs(l.x - x);
      const dy = Math.abs(l.y - y);
      return dx < 0.5 && dy < 0.5;
    });

    if (clickedLabel) {
      // Show options: rename or delete
      const action = prompt(
        `"${clickedLabel.name}" (#${clickedLabel.number})\n\nDigite novo nome ou deixe vazio para EXCLUIR:`
      );

      if (action === null) return; // cancelled

      if (action.trim() === '') {
        // Delete and renumber
        const remaining = state.labels
          .filter(l => l.id !== clickedLabel.id)
          .map((l, i) => ({ ...l, number: i + 1 }));
        pushState({ ...state, labels: remaining });
      } else {
        // Rename
        const updated = state.labels.map(l =>
          l.id === clickedLabel.id ? { ...l, name: action.trim() } : l
        );
        pushState({ ...state, labels: updated });
      }
      return;
    }

    // Find center of the enclosed area
    const centerPoint = findRoomCenter(x, y, state.walls, state.lotWidth, state.lotLength);

    // Check if there's already a label in this room (same center area)
    const existingInRoom = state.labels.find(l => {
      // A label is "in the same room" if it shares the same bounding walls
      // (i.e., findRoomCenter from the label's position gives the same center)
      const labelCenter = findRoomCenter(l.x, l.y, state.walls, state.lotWidth, state.lotLength);
      const dx = Math.abs(labelCenter.x - centerPoint.x);
      const dy = Math.abs(labelCenter.y - centerPoint.y);
      return dx < 0.3 && dy < 0.3;
    });

    if (existingInRoom) {
      // Room already named — offer to rename
      const action = prompt(
        `Este cômodo já se chama "${existingInRoom.name}".\n\nDigite novo nome ou deixe vazio para EXCLUIR:`
      );

      if (action === null) return;

      if (action.trim() === '') {
        const remaining = state.labels
          .filter(l => l.id !== existingInRoom.id)
          .map((l, i) => ({ ...l, number: i + 1 }));
        pushState({ ...state, labels: remaining });
      } else {
        const updated = state.labels.map(l =>
          l.id === existingInRoom.id ? { ...l, name: action.trim() } : l
        );
        pushState({ ...state, labels: updated });
      }
      return;
    }

    // New label
    const nextNumber = state.labels.length + 1;
    const name = prompt(`Nome do ambiente #${nextNumber}:`) || `Ambiente ${nextNumber}`;
    const label: import('./types').EditorLabel = {
      id: crypto.randomUUID(),
      number: nextNumber,
      name,
      type: 'indefinido',
      x: centerPoint.x,
      y: centerPoint.y,
    };
    pushState({ ...state, labels: [...state.labels, label] });
  }, [state, pushState]);

  // === Viewport ===
  const handleViewportChange = useCallback((partial: Partial<ViewportState>) => {
    setViewport(prev => ({ ...prev, ...partial }));
  }, []);

  // === Keyboard shortcuts ===
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        else setActiveTool('select');
      }

      // Tool shortcuts
      const toolMap: Record<string, EditorTool> = {
        v: 'select', w: 'wall', b: 'box', n: 'label', d: 'door', j: 'window',
        r: 'room', m: 'measure', e: 'eraser',
      };
      if (toolMap[e.key.toLowerCase()] && !e.ctrlKey && !e.metaKey) {
        setActiveTool(toolMap[e.key.toLowerCase()]);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleUndo, handleRedo, isFullscreen]);

  // === Export PNG ===
  const handleExportPNG = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `planta-${projectId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [projectId]);

  return (
    <div className={`flex flex-col gap-2 ${isFullscreen ? 'fixed inset-0 z-[100] bg-background p-4' : ''}`}>
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onFullscreen={() => setIsFullscreen(!isFullscreen)}
        isFullscreen={isFullscreen}
        onExportPNG={handleExportPNG}
        doorStyle={doorStyle}
        onDoorStyleChange={setDoorStyle}
      />

      <div className={`flex gap-3 ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
        {/* Left panel: wall list / room info */}
        <div className="hidden sm:block w-52 shrink-0 overflow-y-auto rounded-lg border bg-card p-3 text-xs">
          <h3 className="font-semibold text-muted-foreground uppercase mb-2">Paredes ({state.walls.length})</h3>
          {state.walls.length === 0 && (
            <p className="text-muted-foreground">Use a ferramenta Parede (W) para desenhar</p>
          )}
          {state.walls.map((wall, i) => {
            const len = Math.sqrt((wall.end.x - wall.start.x) ** 2 + (wall.end.y - wall.start.y) ** 2);
            return (
              <div key={wall.id} className="flex items-center justify-between py-1 border-b border-border/50">
                <span>Parede {i + 1}</span>
                <span className="text-muted-foreground">{len.toFixed(2)}m</span>
              </div>
            );
          })}

          {state.rooms.length > 0 && (
            <>
              <h3 className="font-semibold text-muted-foreground uppercase mt-4 mb-2">Ambientes ({state.rooms.length})</h3>
              {state.rooms.map(room => (
                <div key={room.id} className="flex items-center justify-between py-1 border-b border-border/50">
                  <span>{room.name}</span>
                  <span className="text-muted-foreground">{room.area.toFixed(1)}m²</span>
                </div>
              ))}
            </>
          )}

          {state.labels.length > 0 && (
            <>
              <h3 className="font-semibold text-muted-foreground uppercase mt-4 mb-2">Legenda</h3>
              {state.labels.map(label => (
                <div key={label.id} className="flex items-center gap-2 py-1 border-b border-border/50">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#2d6a4f] text-[9px] font-bold text-white">
                    {label.number}
                  </span>
                  <span className="truncate">{label.name}</span>
                </div>
              ))}
            </>
          )}

          <div className="mt-4 pt-3 border-t">
            <p className="text-muted-foreground">Terreno: {lotWidth}m × {lotLength}m</p>
            <p className="text-muted-foreground">Área: {(lotWidth * lotLength).toFixed(0)}m²</p>
            <p className="text-muted-foreground">Portas: {state.doors.length}</p>
            <p className="text-muted-foreground">Janelas: {state.windows.length}</p>
            {measureResult && (
              <p className="mt-2 font-medium text-primary">📏 {measureResult}</p>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className={`flex-1 min-w-0 ${isFullscreen ? 'h-full' : ''}`}>
          <EditorCanvas
            state={state}
            viewport={viewport}
            activeTool={activeTool}
            onAddWall={handleAddWall}
            onAddBox={handleAddBox}
            onDeleteWall={handleDeleteWall}
            onDeleteDoor={handleDeleteDoor}
            onDeleteWindow={handleDeleteWindow}
            onAddDoor={handleAddDoor}
            onAddWindow={handleAddWindow}
            onAddLabel={handleAddLabel}
            onViewportChange={handleViewportChange}
            onMeasure={setMeasureResult}
            isFullscreen={isFullscreen}
          />
        </div>
      </div>
    </div>
  );
}
