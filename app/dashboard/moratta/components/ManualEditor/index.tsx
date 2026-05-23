"use client"

import { useState, useCallback, useEffect } from 'react';
import type { EditorState, ViewportState, EditorTool, EditorWall, RoomType, Point } from './types';
import { GRID_SNAP, ROOM_COLORS } from './types';
import { polygonArea, canMergeWalls, mergeWalls } from './utils';
import { Toolbar } from './Toolbar';
import { EditorCanvas } from './Canvas';

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
    // Try to merge with existing collinear connected walls
    let mergedWalls = [...state.walls];
    let newWall = wall;
    let merged = true;

    // Keep merging until no more merges possible
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
    pushState({ ...state, walls: mergedWalls });
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
      { id: crypto.randomUUID(), start: { x: x1, y: y1 }, end: { x: x2, y: y1 }, thickness: 0.15 }, // top
      { id: crypto.randomUUID(), start: { x: x2, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.15 }, // right
      { id: crypto.randomUUID(), start: { x: x1, y: y2 }, end: { x: x2, y: y2 }, thickness: 0.15 }, // bottom
      { id: crypto.randomUUID(), start: { x: x1, y: y1 }, end: { x: x1, y: y2 }, thickness: 0.15 }, // left
    ];

    // Merge each wall with existing collinear walls
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

    pushState({ ...state, walls: mergedWalls });
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
        v: 'select', w: 'wall', b: 'box', d: 'door', j: 'window',
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
            onViewportChange={handleViewportChange}
            onMeasure={setMeasureResult}
            isFullscreen={isFullscreen}
          />
        </div>
      </div>
    </div>
  );
}
