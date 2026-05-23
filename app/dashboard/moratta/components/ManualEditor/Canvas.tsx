"use client"

import { useRef, useEffect, useCallback, useState } from 'react';
import type { EditorState, ViewportState, EditorTool, Point, EditorWall } from './types';
import { WALL_THICKNESS, ROOM_COLORS } from './types';
import {
  screenToMeters,
  metersToScreen,
  getPixelsPerMeter,
  snapPointToGrid,
  snapToWallEndpoint,
  constrainToOrthogonal,
  distance,
  uid,
} from './utils';

interface CanvasProps {
  state: EditorState;
  viewport: ViewportState;
  activeTool: EditorTool;
  onAddWall: (wall: EditorWall) => void;
  onAddBox: (start: Point, end: Point) => void;
  onDeleteWall: (id: string) => void;
  onDeleteDoor: (id: string) => void;
  onDeleteWindow: (id: string) => void;
  onAddDoor: (wallId: string, position: number) => void;
  onAddWindow: (wallId: string, position: number) => void;
  onAddLabel: (x: number, y: number) => void;
  onViewportChange: (vp: Partial<ViewportState>) => void;
  onMeasure: (result: string | null) => void;
  isFullscreen: boolean;
}

export function EditorCanvas({
  state,
  viewport,
  activeTool,
  onAddWall,
  onAddBox,
  onDeleteWall,
  onDeleteDoor,
  onDeleteWindow,
  onAddDoor,
  onAddWindow,
  onAddLabel,
  onViewportChange,
  onMeasure,
  isFullscreen,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Drawing state
  const [drawingWall, setDrawingWall] = useState<{ start: Point; current: Point } | null>(null);
  const [drawingBox, setDrawingBox] = useState<{ start: Point; current: Point } | null>(null);
  const [measureStart, setMeasureStart] = useState<Point | null>(null);
  const [measureEnd, setMeasureEnd] = useState<Point | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  // Door/window placement: click wall to start, move to position, click to place
  const [placingOnWall, setPlacingOnWall] = useState<{ wallId: string; position: number } | null>(null);
  const placingRef = useRef<{ wallId: string; position: number } | null>(null);
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef<Point>({ x: 0, y: 0 });

  const { zoom, panX, panY, gridSize, showGrid } = viewport;
  const { lotWidth, lotLength } = state;

  // === Coordinate conversion helpers ===
  const toMeters = useCallback((sx: number, sy: number): Point => {
    return screenToMeters(sx, sy, canvasSize.width, canvasSize.height, lotWidth, lotLength, zoom, panX, panY);
  }, [canvasSize, lotWidth, lotLength, zoom, panX, panY]);

  const toScreen = useCallback((mx: number, my: number): Point => {
    return metersToScreen(mx, my, canvasSize.width, canvasSize.height, lotWidth, lotLength, zoom, panX, panY);
  }, [canvasSize, lotWidth, lotLength, zoom, panX, panY]);

  // === Resize Observer ===
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasSize({ width, height: isFullscreen ? height : Math.min(height, 700) });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [isFullscreen]);

  // === Render ===
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    const { width: cw, height: ch } = canvasSize;

    // Background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, cw, ch);

    const ppm = getPixelsPerMeter(cw, ch, lotWidth, lotLength);

    // === Grid ===
    if (showGrid && zoom > 0.4) {
      const gridPx = gridSize * ppm * zoom;
      if (gridPx > 4) {
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
        ctx.lineWidth = 0.5;

        for (let mx = 0; mx <= lotWidth; mx += gridSize) {
          const p = toScreen(mx, 0);
          const p2 = toScreen(mx, lotLength);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }
        for (let my = 0; my <= lotLength; my += gridSize) {
          const p = toScreen(0, my);
          const p2 = toScreen(lotWidth, my);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }

        // 1m grid darker
        ctx.strokeStyle = 'rgba(180, 180, 180, 0.5)';
        ctx.lineWidth = 1;
        for (let mx = 0; mx <= lotWidth; mx += 1) {
          const p = toScreen(mx, 0);
          const p2 = toScreen(mx, lotLength);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }
        for (let my = 0; my <= lotLength; my += 1) {
          const p = toScreen(0, my);
          const p2 = toScreen(lotWidth, my);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }
      }
    }

    // === Lot boundary ===
    const tl = toScreen(0, 0);
    const br = toScreen(lotWidth, lotLength);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(80, 80, 80, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    ctx.setLineDash([]);

    // === Rooms (filled polygons) ===
    for (const room of state.rooms) {
      if (room.points.length < 3) continue;
      ctx.beginPath();
      const first = toScreen(room.points[0].x, room.points[0].y);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < room.points.length; i++) {
        const p = toScreen(room.points[i].x, room.points[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fillStyle = ROOM_COLORS[room.type] || 'rgba(200,200,200,0.2)';
      ctx.fill();
    }

    // === Walls ===
    for (const wall of state.walls) {
      const s = toScreen(wall.start.x, wall.start.y);
      const e = toScreen(wall.end.x, wall.end.y);
      const thickness = wall.thickness * ppm * zoom;

      ctx.strokeStyle = '#333';
      ctx.lineWidth = Math.max(3, thickness);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();

      // Wall length label (offset away from wall to avoid overlap)
      const len = distance(wall.start, wall.end);
      if (len > 0.3 && zoom > 0.5) {
        const mid = toScreen((wall.start.x + wall.end.x) / 2, (wall.start.y + wall.end.y) / 2);
        const isHorizontal = Math.abs(wall.start.y - wall.end.y) < 0.05;
        const fontSize = Math.max(9, 10 * zoom);
        const offset = Math.max(12, thickness / 2 + 10);

        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(80,80,80,0.8)';
        ctx.textAlign = 'center';

        if (isHorizontal) {
          // Label above horizontal wall
          ctx.textBaseline = 'bottom';
          ctx.fillText(`${len.toFixed(2)}m`, mid.x, mid.y - offset);
        } else {
          // Label left of vertical wall
          ctx.textBaseline = 'middle';
          ctx.save();
          ctx.translate(mid.x - offset, mid.y);
          ctx.rotate(-Math.PI / 2);
          ctx.textAlign = 'center';
          ctx.fillText(`${len.toFixed(2)}m`, 0, 0);
          ctx.restore();
        }
      }
    }

    // === Doors ===
    for (const door of state.doors) {
      const wall = state.walls.find(w => w.id === door.wallId);
      if (!wall) continue;
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const cx = wall.start.x + dx * door.position;
      const cy = wall.start.y + dy * door.position;
      const pos = toScreen(cx, cy);
      const doorPx = door.width * ppm * zoom;
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);

      if (door.style === 'frame') {
        // Frame style: rectangle (batente) with door leaf inside
        const frameW = doorPx;
        const frameH = Math.max(8, WALL_THICKNESS * ppm * zoom + 4);

        // White gap in wall
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(-frameW / 2, -frameH / 2, frameW, frameH);

        // Frame border
        ctx.strokeStyle = 'rgba(80, 60, 30, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-frameW / 2, -frameH / 2, frameW, frameH);

        // Door leaf (line inside frame)
        ctx.strokeStyle = 'rgba(139, 90, 43, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-frameW / 4, -frameH / 2);
        ctx.lineTo(-frameW / 4, frameH / 2);
        ctx.stroke();
      } else {
        // Arc style: traditional door swing
        // White gap in wall
        ctx.strokeStyle = '#f8f9fa';
        ctx.lineWidth = Math.max(4, WALL_THICKNESS * ppm * zoom + 2);
        ctx.beginPath();
        ctx.moveTo(-doorPx / 2, 0);
        ctx.lineTo(doorPx / 2, 0);
        ctx.stroke();

        // Door arc
        ctx.strokeStyle = 'rgba(139, 90, 43, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(-doorPx / 2, 0, doorPx, -Math.PI / 2, 0);
        ctx.stroke();
        // Door leaf line
        ctx.beginPath();
        ctx.moveTo(-doorPx / 2, 0);
        ctx.lineTo(-doorPx / 2, -doorPx);
        ctx.stroke();
      }

      ctx.restore();
    }

    // === Windows ===
    for (const win of state.windows) {
      const wall = state.walls.find(w => w.id === win.wallId);
      if (!wall) continue;
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const cx = wall.start.x + dx * win.position;
      const cy = wall.start.y + dy * win.position;
      const pos = toScreen(cx, cy);
      const winPx = win.width * ppm * zoom;
      const wallThickPx = Math.max(6, WALL_THICKNESS * ppm * zoom);
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(angle);

      // Clear wall area (white gap)
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(-winPx / 2, -wallThickPx / 2, winPx, wallThickPx);

      // Window frame (3 parallel lines - architectural standard)
      ctx.strokeStyle = 'rgba(30, 120, 200, 0.9)';
      ctx.lineWidth = 1.5;

      // Outer lines
      ctx.beginPath();
      ctx.moveTo(-winPx / 2, -wallThickPx / 3);
      ctx.lineTo(winPx / 2, -wallThickPx / 3);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-winPx / 2, wallThickPx / 3);
      ctx.lineTo(winPx / 2, wallThickPx / 3);
      ctx.stroke();

      // Center line (glass)
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-winPx / 2, 0);
      ctx.lineTo(winPx / 2, 0);
      ctx.stroke();

      // End caps
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-winPx / 2, -wallThickPx / 3);
      ctx.lineTo(-winPx / 2, wallThickPx / 3);
      ctx.moveTo(winPx / 2, -wallThickPx / 3);
      ctx.lineTo(winPx / 2, wallThickPx / 3);
      ctx.stroke();

      ctx.restore();
    }

    // === Labels (numbered badges) ===
    for (const label of state.labels) {
      const pos = toScreen(label.x, label.y);
      const badgeRadius = Math.max(10, 14 * zoom);

      // Green circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, badgeRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#2d6a4f';
      ctx.fill();
      // White shadow
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Number
      const fontSize = Math.max(9, badgeRadius * 1.0);
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(label.number), pos.x, pos.y);
    }

    // === Drawing wall preview ===
    if (drawingWall) {
      const s = toScreen(drawingWall.start.x, drawingWall.start.y);
      const e = toScreen(drawingWall.current.x, drawingWall.current.y);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Length preview
      const len = distance(drawingWall.start, drawingWall.current);
      if (len > 0.1) {
        const mid = toScreen(
          (drawingWall.start.x + drawingWall.current.x) / 2,
          (drawingWall.start.y + drawingWall.current.y) / 2
        );
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = 'rgba(59, 130, 246, 1)';
        ctx.textAlign = 'center';
        ctx.fillText(`${len.toFixed(2)}m`, mid.x, mid.y - 8);
      }
    }

    // === Drawing box preview ===
    if (drawingBox) {
      const s = toScreen(Math.min(drawingBox.start.x, drawingBox.current.x), Math.min(drawingBox.start.y, drawingBox.current.y));
      const e = toScreen(Math.max(drawingBox.start.x, drawingBox.current.x), Math.max(drawingBox.start.y, drawingBox.current.y));
      const bw = e.x - s.x;
      const bh = e.y - s.y;

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(s.x, s.y, bw, bh);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
      ctx.fillRect(s.x, s.y, bw, bh);

      // Dimensions
      const w = Math.abs(drawingBox.current.x - drawingBox.start.x);
      const h = Math.abs(drawingBox.current.y - drawingBox.start.y);
      if (w > 0.1 && h > 0.1) {
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillStyle = 'rgba(59, 130, 246, 1)';
        ctx.textAlign = 'center';
        ctx.fillText(`${w.toFixed(2)} × ${h.toFixed(2)}m`, s.x + bw / 2, s.y + bh / 2);
        ctx.fillText(`${(w * h).toFixed(1)}m²`, s.x + bw / 2, s.y + bh / 2 + 16);
      }
    }

    // === Placing door/window preview ===
    if (placingOnWall) {
      const wall = state.walls.find(w => w.id === placingOnWall.wallId);
      if (wall) {
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const cx = wall.start.x + dx * placingOnWall.position;
        const cy = wall.start.y + dy * placingOnWall.position;
        const pos = toScreen(cx, cy);
        const itemPx = (activeTool === 'door' ? 0.8 : 1.2) * ppm * zoom;
        const angle = Math.atan2(dy, dx);

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);

        // Highlight circle
        ctx.beginPath();
        ctx.arc(0, 0, itemPx / 2 + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        if (activeTool === 'door') {
          // Preview door arc
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(-itemPx / 2, 0, itemPx, -Math.PI / 2, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-itemPx / 2, 0);
          ctx.lineTo(-itemPx / 2, -itemPx);
          ctx.stroke();
        } else {
          // Preview window
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-itemPx / 2, 0);
          ctx.lineTo(itemPx / 2, 0);
          ctx.stroke();
        }

        ctx.restore();

        // "Clique para confirmar" label
        ctx.font = '11px Inter, sans-serif';
        ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText('Clique para confirmar', pos.x, pos.y + 20);
      }
    }

    // === Measure line ===
    if (measureStart) {
      const s = toScreen(measureStart.x, measureStart.y);
      // Draw start point
      ctx.beginPath();
      ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(234, 88, 12, 0.8)';
      ctx.fill();

      if (measureEnd) {
        const e2 = toScreen(measureEnd.x, measureEnd.y);
        ctx.strokeStyle = 'rgba(234, 88, 12, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e2.x, e2.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(e2.x, e2.y, 5, 0, Math.PI * 2); ctx.fill();

        const d = distance(measureStart, measureEnd);
        const mid = toScreen((measureStart.x + measureEnd.x) / 2, (measureStart.y + measureEnd.y) / 2);
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.fillStyle = 'rgba(234, 88, 12, 1)';
        ctx.textAlign = 'center';
        ctx.fillText(`${d.toFixed(2)}m`, mid.x, mid.y - 10);
      }
    }

    // === Selected wall highlight ===
    if (selectedWallId) {
      const wall = state.walls.find(w => w.id === selectedWallId);
      if (wall) {
        const s = toScreen(wall.start.x, wall.start.y);
        const e = toScreen(wall.end.x, wall.end.y);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
        // Endpoints
        ctx.fillStyle = 'rgba(59, 130, 246, 1)';
        ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(e.x, e.y, 5, 0, Math.PI * 2); ctx.fill();
      }
    }

    // === Dimension labels ===
    const dimOffset = 20;
    const bottomY = br.y + dimOffset;
    ctx.strokeStyle = 'rgba(60,60,60,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tl.x, bottomY); ctx.lineTo(br.x, bottomY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tl.x, bottomY - 5); ctx.lineTo(tl.x, bottomY + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(br.x, bottomY - 5); ctx.lineTo(br.x, bottomY + 5); ctx.stroke();
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(`${lotWidth.toFixed(1)} m`, (tl.x + br.x) / 2, bottomY + 15);

    const rightX = br.x + dimOffset;
    ctx.beginPath(); ctx.moveTo(rightX, tl.y); ctx.lineTo(rightX, br.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rightX - 5, tl.y); ctx.lineTo(rightX + 5, tl.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rightX - 5, br.y); ctx.lineTo(rightX + 5, br.y); ctx.stroke();
    ctx.save();
    ctx.translate(rightX + 15, (tl.y + br.y) / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(`${lotLength.toFixed(1)} m`, 0, 0);
    ctx.restore();

    // Front/back labels
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(100,100,100,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('RUA / FRENTE', (tl.x + br.x) / 2, br.y + 40);
    ctx.fillText('FUNDOS', (tl.x + br.x) / 2, tl.y - 8);

  }, [canvasSize, state, viewport, drawingWall, drawingBox, placingOnWall, activeTool, measureStart, measureEnd, selectedWallId, toScreen, lotWidth, lotLength, zoom, showGrid, gridSize]);

  // === Animation frame ===
  useEffect(() => {
    const frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [render]);

  // === Mouse handlers ===
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    let point = toMeters(sx, sy);

    if (activeTool === 'wall') {
      point = snapPointToGrid(point);
      const snapped = snapToWallEndpoint(point, state.walls);
      if (snapped) point = snapped;
      point.x = Math.max(0, Math.min(lotWidth, point.x));
      point.y = Math.max(0, Math.min(lotLength, point.y));
      setDrawingWall({ start: point, current: point });
    } else if (activeTool === 'box') {
      point = snapPointToGrid(point);
      point.x = Math.max(0, Math.min(lotWidth, point.x));
      point.y = Math.max(0, Math.min(lotLength, point.y));
      setDrawingBox({ start: point, current: point });
    } else if (activeTool === 'eraser') {
      // Priority: doors > windows > single wall
      // Check doors first
      let erased = false;
      for (const door of state.doors) {
        const wall = state.walls.find(w => w.id === door.wallId);
        if (!wall) continue;
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const cx = wall.start.x + dx * door.position;
        const cy = wall.start.y + dy * door.position;
        if (distance(point, { x: cx, y: cy }) < 0.4) {
          onDeleteDoor(door.id);
          erased = true;
          break;
        }
      }

      // Check windows
      if (!erased) {
        for (const win of state.windows) {
          const wall = state.walls.find(w => w.id === win.wallId);
          if (!wall) continue;
          const dx = wall.end.x - wall.start.x;
          const dy = wall.end.y - wall.start.y;
          const cx = wall.start.x + dx * win.position;
          const cy = wall.start.y + dy * win.position;
          if (distance(point, { x: cx, y: cy }) < 0.4) {
            onDeleteWindow(win.id);
            erased = true;
            break;
          }
        }
      }

      // Check single wall (only the clicked wall, not the whole room)
      if (!erased) {
        for (const wall of state.walls) {
          const len = distance(wall.start, wall.end);
          if (len < 0.01) continue;
          const t = Math.max(0, Math.min(1,
            ((point.x - wall.start.x) * (wall.end.x - wall.start.x) + (point.y - wall.start.y) * (wall.end.y - wall.start.y)) / (len * len)
          ));
          const proj = { x: wall.start.x + t * (wall.end.x - wall.start.x), y: wall.start.y + t * (wall.end.y - wall.start.y) };
          if (distance(point, proj) < 0.3) {
            onDeleteWall(wall.id);
            break;
          }
        }
      }
    } else if (activeTool === 'door' || activeTool === 'window') {
      if (placingRef.current) {
        // Second click: confirm placement
        if (activeTool === 'door') {
          onAddDoor(placingRef.current.wallId, placingRef.current.position);
        } else {
          onAddWindow(placingRef.current.wallId, placingRef.current.position);
        }
        placingRef.current = null;
        setPlacingOnWall(null);
      } else {
        // First click: find nearest wall to start sliding
        let bestWall: EditorWall | null = null;
        let bestDist = 0.6;
        let bestT = 0.5;

        for (const wall of state.walls) {
          const len = distance(wall.start, wall.end);
          if (len < 0.3) continue;
          const t = Math.max(0, Math.min(1,
            ((point.x - wall.start.x) * (wall.end.x - wall.start.x) + (point.y - wall.start.y) * (wall.end.y - wall.start.y)) / (len * len)
          ));
          const proj = { x: wall.start.x + t * (wall.end.x - wall.start.x), y: wall.start.y + t * (wall.end.y - wall.start.y) };
          const d = distance(point, proj);
          if (d < bestDist) {
            bestDist = d;
            bestWall = wall;
            bestT = t;
          }
        }

        if (bestWall) {
          const placement = { wallId: bestWall.id, position: bestT };
          placingRef.current = placement;
          setPlacingOnWall(placement);
        }
      }
    } else if (activeTool === 'label') {
      point = snapPointToGrid(point);
      onAddLabel(point.x, point.y);
    } else if (activeTool === 'measure') {
      point = snapPointToGrid(point);
      if (!measureStart) {
        setMeasureStart(point);
        setMeasureEnd(null);
        onMeasure(null);
      } else {
        setMeasureEnd(point);
        const d = distance(measureStart, point);
        onMeasure(`${d.toFixed(2)} m`);
        setMeasureStart(null);
      }
    } else if (activeTool === 'select') {
      // Select wall near click
      let found = false;
      for (const wall of state.walls) {
        const len = distance(wall.start, wall.end);
        if (len < 0.01) continue;
        const t = Math.max(0, Math.min(1,
          ((point.x - wall.start.x) * (wall.end.x - wall.start.x) + (point.y - wall.start.y) * (wall.end.y - wall.start.y)) / (len * len)
        ));
        const proj = { x: wall.start.x + t * (wall.end.x - wall.start.x), y: wall.start.y + t * (wall.end.y - wall.start.y) };
        if (distance(point, proj) < 0.3) {
          setSelectedWallId(wall.id);
          found = true;
          break;
        }
      }
      if (!found) {
        setSelectedWallId(null);
        // Start panning
        isPanningRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    } else {
      // Default: pan
      isPanningRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [activeTool, toMeters, state.walls, state.doors, state.windows, lotWidth, lotLength, onDeleteWall, onDeleteDoor, onDeleteWindow, onAddDoor, onAddWindow, onAddLabel, measureStart, onMeasure]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      onViewportChange({ panX: panX + dx, panY: panY + dy });
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = toMeters(e.clientX - rect.left, e.clientY - rect.top);

    // Slide door/window along wall
    if (placingRef.current && (activeTool === 'door' || activeTool === 'window')) {
      const wall = state.walls.find(w => w.id === placingRef.current!.wallId);
      if (wall) {
        const len = distance(wall.start, wall.end);
        if (len > 0.1) {
          const t = Math.max(0.02, Math.min(0.98,
            ((point.x - wall.start.x) * (wall.end.x - wall.start.x) + (point.y - wall.start.y) * (wall.end.y - wall.start.y)) / (len * len)
          ));
          const placement = { wallId: placingRef.current.wallId, position: t };
          placingRef.current = placement;
          setPlacingOnWall(placement);
        }
      }
      return;
    }

    if (drawingWall && activeTool === 'wall') {
      let wp = snapPointToGrid(point);
      wp = constrainToOrthogonal(drawingWall.start, wp);
      const snapped = snapToWallEndpoint(wp, state.walls);
      if (snapped) wp = snapped;
      wp.x = Math.max(0, Math.min(lotWidth, wp.x));
      wp.y = Math.max(0, Math.min(lotLength, wp.y));
      setDrawingWall({ ...drawingWall, current: wp });
    }

    if (drawingBox && activeTool === 'box') {
      let bp = snapPointToGrid(point);
      bp.x = Math.max(0, Math.min(lotWidth, bp.x));
      bp.y = Math.max(0, Math.min(lotLength, bp.y));
      setDrawingBox({ ...drawingBox, current: bp });
    }
  }, [drawingWall, drawingBox, activeTool, toMeters, state.walls, lotWidth, lotLength, panX, panY, onViewportChange, placingOnWall]);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;

    if (drawingWall && activeTool === 'wall') {
      const len = distance(drawingWall.start, drawingWall.current);
      if (len >= 0.5) {
        onAddWall({
          id: uid(),
          start: drawingWall.start,
          end: drawingWall.current,
          thickness: WALL_THICKNESS,
        });
      }
      setDrawingWall(null);
    }

    if (drawingBox && activeTool === 'box') {
      const w = Math.abs(drawingBox.current.x - drawingBox.start.x);
      const h = Math.abs(drawingBox.current.y - drawingBox.start.y);
      if (w >= 0.5 && h >= 0.5) {
        onAddBox(drawingBox.start, drawingBox.current);
      }
      setDrawingBox(null);
    }
  }, [drawingWall, drawingBox, activeTool, onAddWall, onAddBox]);

  // === Wheel zoom ===
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newZoom = Math.max(0.3, Math.min(5, zoom * (1 + delta)));
    onViewportChange({ zoom: newZoom });
  }, [zoom, onViewportChange]);

  // Cursor based on tool
  const cursor = activeTool === 'wall' ? 'crosshair'
    : activeTool === 'eraser' ? 'not-allowed'
    : activeTool === 'door' || activeTool === 'window' ? 'copy'
    : activeTool === 'measure' ? 'crosshair'
    : activeTool === 'select' ? (selectedWallId ? 'move' : 'default')
    : 'crosshair';

  return (
    <div ref={containerRef} className={`relative w-full overflow-hidden rounded-lg border border-border bg-background ${isFullscreen ? 'h-full' : 'h-[600px]'}`}>
      <canvas
        ref={canvasRef}
        style={{ width: canvasSize.width, height: canvasSize.height, cursor }}
        className="block touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg bg-background/90 p-1 shadow-sm border text-xs">
        <button onClick={() => onViewportChange({ zoom: Math.max(0.3, zoom / 1.3) })} className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center">−</button>
        <button onClick={() => onViewportChange({ zoom: 1, panX: 0, panY: 0 })} className="h-6 px-2 rounded hover:bg-muted">{Math.round(zoom * 100)}%</button>
        <button onClick={() => onViewportChange({ zoom: Math.min(5, zoom * 1.3) })} className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center">+</button>
      </div>

      {/* Active tool indicator */}
      <div className="absolute top-3 left-3 rounded-md bg-background/90 px-2 py-1 text-xs font-medium shadow-sm border">
        {activeTool === 'wall' && '🖊 Desenhando paredes (clique e arraste)'}
        {activeTool === 'box' && '▢ Arraste para criar cômodo (4 paredes)'}
        {activeTool === 'label' && '① Clique para numerar o ambiente'}
        {activeTool === 'select' && '↖ Selecionar (arraste para mover)'}
        {activeTool === 'eraser' && '✕ Clique em uma parede para apagar'}
        {activeTool === 'door' && '🚪 Clique em uma parede → deslize → clique para confirmar'}
        {activeTool === 'window' && '⊞ Clique em uma parede → deslize → clique para confirmar'}
        {activeTool === 'measure' && '📏 Clique em dois pontos para medir'}
        {activeTool === 'room' && '⬜ Clique dentro de paredes fechadas para criar ambiente'}
      </div>
    </div>
  );
}
