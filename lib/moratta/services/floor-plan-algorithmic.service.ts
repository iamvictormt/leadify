import { randomUUID } from 'crypto';
import type { ProjectParams, FloorPlanData, Room, Wall, Door, WindowElement, RoomType } from '../types';

/**
 * Generates a floor plan using architectural templates scaled to the lot.
 * 
 * Approach:
 * 1. Select best template based on params (rooms, bathrooms, garage, lot ratio)
 * 2. Scale template proportionally to actual lot dimensions
 * 3. Generate walls, doors, windows from placed rooms
 * 4. Validate no overlaps
 * 
 * Templates are based on real Brazilian residential architecture patterns.
 */

// === Types ===

interface RoomTemplate {
  name: string;
  type: RoomType;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FloorPlanTemplate {
  name: string;
  baseWidth: number;
  baseLength: number;
  rooms: RoomTemplate[];
  minRooms: number;
  maxRooms: number;
  bathrooms: number;
  hasGarage: boolean;
}

// === Templates ===

const TEMPLATES: FloorPlanTemplate[] = [
  // 2 quartos, 1 banheiro, com garagem
  {
    name: 'casa_2q_1b_1g',
    baseWidth: 10,
    baseLength: 15,
    minRooms: 2,
    maxRooms: 2,
    bathrooms: 1,
    hasGarage: true,
    rooms: [
      { name: 'Garagem', type: 'garagem', x: 0, y: 0, width: 3, height: 5 },
      { name: 'Sala de Estar', type: 'sala_estar', x: 3, y: 0, width: 4, height: 3.5 },
      { name: 'Sala de Jantar', type: 'sala_jantar', x: 7, y: 0, width: 3, height: 3.5 },
      { name: 'Cozinha', type: 'cozinha', x: 3, y: 3.5, width: 4, height: 3.5 },
      { name: 'Área de Serviço', type: 'area_servico', x: 7, y: 3.5, width: 3, height: 2 },
      { name: 'Banheiro Social', type: 'banheiro', x: 7, y: 5.5, width: 3, height: 1.5 },
      { name: 'Corredor', type: 'corredor', x: 0, y: 5, width: 1.3, height: 10 },
      { name: 'Suíte', type: 'quarto', x: 1.3, y: 7, width: 4.35, height: 4 },
      { name: 'Quarto 2', type: 'quarto', x: 5.65, y: 7, width: 4.35, height: 4 },
      { name: 'Banheiro Suíte', type: 'banheiro', x: 1.3, y: 11, width: 3, height: 2 },
    ],
  },
  // 3 quartos, 1 banheiro, com garagem (padrão brasileiro)
  {
    name: 'casa_3q_1b_1g',
    baseWidth: 10,
    baseLength: 15,
    minRooms: 3,
    maxRooms: 3,
    bathrooms: 1,
    hasGarage: true,
    rooms: [
      { name: 'Garagem', type: 'garagem', x: 0, y: 0, width: 3, height: 5 },
      { name: 'Sala de Estar', type: 'sala_estar', x: 3, y: 0, width: 4, height: 3.4 },
      { name: 'Sala de Jantar', type: 'sala_jantar', x: 7, y: 0, width: 3, height: 3.4 },
      { name: 'Cozinha', type: 'cozinha', x: 3, y: 3.4, width: 4, height: 3.9 },
      { name: 'Área de Serviço', type: 'area_servico', x: 7, y: 3.4, width: 3, height: 2 },
      { name: 'Banheiro Social', type: 'banheiro', x: 7, y: 5.4, width: 3, height: 1.9 },
      { name: 'Corredor', type: 'corredor', x: 4.25, y: 7.3, width: 1.5, height: 7.7 },
      { name: 'Quarto 1', type: 'quarto', x: 0, y: 7.3, width: 4.25, height: 3.85 },
      { name: 'Quarto 2', type: 'quarto', x: 5.75, y: 7.3, width: 4.25, height: 3.85 },
      { name: 'Quarto 3', type: 'quarto', x: 0, y: 11.15, width: 4.25, height: 3.85 },
    ],
  },
  // 3 quartos, 2 banheiros, com garagem
  {
    name: 'casa_3q_2b_1g',
    baseWidth: 10,
    baseLength: 15,
    minRooms: 3,
    maxRooms: 3,
    bathrooms: 2,
    hasGarage: true,
    rooms: [
      { name: 'Garagem', type: 'garagem', x: 0, y: 0, width: 3, height: 5 },
      { name: 'Sala de Estar', type: 'sala_estar', x: 3, y: 0, width: 4, height: 3.4 },
      { name: 'Sala de Jantar', type: 'sala_jantar', x: 7, y: 0, width: 3, height: 3.4 },
      { name: 'Cozinha', type: 'cozinha', x: 3, y: 3.4, width: 4, height: 3.6 },
      { name: 'Área de Serviço', type: 'area_servico', x: 7, y: 3.4, width: 3, height: 1.8 },
      { name: 'Banheiro Social', type: 'banheiro', x: 7, y: 5.2, width: 3, height: 1.8 },
      { name: 'Corredor', type: 'corredor', x: 4.25, y: 7, width: 1.5, height: 8 },
      { name: 'Suíte', type: 'quarto', x: 0, y: 7, width: 4.25, height: 4 },
      { name: 'Quarto 2', type: 'quarto', x: 5.75, y: 7, width: 4.25, height: 4 },
      { name: 'Quarto 3', type: 'quarto', x: 0, y: 11, width: 4.25, height: 4 },
      { name: 'Banheiro Suíte', type: 'banheiro', x: 5.75, y: 11, width: 4.25, height: 2 },
    ],
  },
  // 4 quartos, 2 banheiros, com garagem
  {
    name: 'casa_4q_2b_1g',
    baseWidth: 12,
    baseLength: 20,
    minRooms: 4,
    maxRooms: 4,
    bathrooms: 2,
    hasGarage: true,
    rooms: [
      { name: 'Garagem', type: 'garagem', x: 0, y: 0, width: 3.5, height: 6 },
      { name: 'Sala de Estar', type: 'sala_estar', x: 3.5, y: 0, width: 5, height: 4 },
      { name: 'Sala de Jantar', type: 'sala_jantar', x: 8.5, y: 0, width: 3.5, height: 4 },
      { name: 'Cozinha', type: 'cozinha', x: 3.5, y: 4, width: 4.5, height: 4 },
      { name: 'Área de Serviço', type: 'area_servico', x: 8, y: 4, width: 4, height: 2 },
      { name: 'Banheiro Social', type: 'banheiro', x: 8, y: 6, width: 4, height: 2 },
      { name: 'Corredor', type: 'corredor', x: 5, y: 8, width: 1.5, height: 12 },
      { name: 'Suíte', type: 'quarto', x: 0, y: 8, width: 5, height: 4.5 },
      { name: 'Quarto 2', type: 'quarto', x: 6.5, y: 8, width: 5.5, height: 4 },
      { name: 'Quarto 3', type: 'quarto', x: 0, y: 12.5, width: 5, height: 4 },
      { name: 'Quarto 4', type: 'quarto', x: 6.5, y: 12, width: 5.5, height: 4 },
      { name: 'Banheiro Suíte', type: 'banheiro', x: 0, y: 16.5, width: 3, height: 2.5 },
    ],
  },
  // 3 quartos, sem garagem
  {
    name: 'casa_3q_1b_0g',
    baseWidth: 8,
    baseLength: 15,
    minRooms: 3,
    maxRooms: 3,
    bathrooms: 1,
    hasGarage: false,
    rooms: [
      { name: 'Sala de Estar', type: 'sala_estar', x: 0, y: 0, width: 4.5, height: 3.5 },
      { name: 'Sala de Jantar', type: 'sala_jantar', x: 4.5, y: 0, width: 3.5, height: 3.5 },
      { name: 'Cozinha', type: 'cozinha', x: 0, y: 3.5, width: 4, height: 3.5 },
      { name: 'Área de Serviço', type: 'area_servico', x: 4, y: 3.5, width: 4, height: 1.8 },
      { name: 'Banheiro Social', type: 'banheiro', x: 4, y: 5.3, width: 4, height: 1.7 },
      { name: 'Corredor', type: 'corredor', x: 3.5, y: 7, width: 1.3, height: 8 },
      { name: 'Suíte', type: 'quarto', x: 0, y: 7, width: 3.5, height: 4 },
      { name: 'Quarto 2', type: 'quarto', x: 4.8, y: 7, width: 3.2, height: 4 },
      { name: 'Quarto 3', type: 'quarto', x: 0, y: 11, width: 3.5, height: 4 },
    ],
  },
  // 2 quartos, sem garagem (compacta)
  {
    name: 'casa_2q_1b_0g',
    baseWidth: 7,
    baseLength: 12,
    minRooms: 2,
    maxRooms: 2,
    bathrooms: 1,
    hasGarage: false,
    rooms: [
      { name: 'Sala de Estar', type: 'sala_estar', x: 0, y: 0, width: 4, height: 3.5 },
      { name: 'Cozinha', type: 'cozinha', x: 4, y: 0, width: 3, height: 3.5 },
      { name: 'Banheiro Social', type: 'banheiro', x: 4, y: 3.5, width: 3, height: 2 },
      { name: 'Área de Serviço', type: 'area_servico', x: 0, y: 3.5, width: 2.5, height: 2 },
      { name: 'Corredor', type: 'corredor', x: 2.5, y: 3.5, width: 1.5, height: 8.5 },
      { name: 'Suíte', type: 'quarto', x: 0, y: 5.5, width: 3.5, height: 3.5 },
      { name: 'Quarto 2', type: 'quarto', x: 4, y: 5.5, width: 3, height: 3.5 },
    ],
  },
];

// === Template Selection ===

function selectTemplate(params: ProjectParams): FloorPlanTemplate {
  const hasGarage = params.garageSpots > 0;

  // Score each template
  let bestTemplate = TEMPLATES[1]; // default: 3q_1b_1g
  let bestScore = -Infinity;

  for (const template of TEMPLATES) {
    let score = 0;

    // Room count match (most important)
    if (params.rooms >= template.minRooms && params.rooms <= template.maxRooms) {
      score += 100;
    } else {
      score -= Math.abs(params.rooms - template.maxRooms) * 30;
    }

    // Bathroom match
    if (params.bathrooms === template.bathrooms) {
      score += 50;
    } else if (params.bathrooms >= template.bathrooms) {
      score += 20;
    }

    // Garage match
    if (hasGarage === template.hasGarage) {
      score += 40;
    }

    // Lot ratio similarity (prefer templates with similar aspect ratio)
    const templateRatio = template.baseLength / template.baseWidth;
    const lotRatio = params.lot.length / params.lot.width;
    const ratioDiff = Math.abs(templateRatio - lotRatio);
    score -= ratioDiff * 10;

    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template;
    }
  }

  return bestTemplate;
}

// === Scale Template to Lot ===

function scaleTemplate(template: FloorPlanTemplate, lotWidth: number, lotLength: number): Room[] {
  const scaleX = lotWidth / template.baseWidth;
  const scaleY = lotLength / template.baseLength;

  return template.rooms.map(rt => {
    const x = r(rt.x * scaleX);
    const y = r(rt.y * scaleY);
    const width = r(rt.width * scaleX);
    const height = r(rt.height * scaleY);

    return {
      id: randomUUID(),
      name: rt.name,
      type: rt.type,
      x,
      y,
      width,
      height,
      area: r(width * height),
      floor: 0,
    };
  });
}

// === Validation ===

function validateNoOverlap(rooms: Room[]): boolean {
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i];
      const b = rooms[j];
      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (overlapX > 0.1 && overlapY > 0.1) {
        console.warn(`[ALGO] Overlap detected: ${a.name} and ${b.name}`);
        return false;
      }
    }
  }
  return true;
}

// === Wall Generation ===

function generateWalls(rooms: Room[], lotWidth: number, lotLength: number): Wall[] {
  const walls: Wall[] = [];

  // External walls
  const ext: Array<[number, number, number, number]> = [
    [0, 0, lotWidth, 0],
    [lotWidth, 0, lotWidth, lotLength],
    [0, lotLength, lotWidth, lotLength],
    [0, 0, 0, lotLength],
  ];
  for (const [sx, sy, ex, ey] of ext) {
    walls.push({ id: randomUUID(), startX: sx, startY: sy, endX: ex, endY: ey, thickness: 0.2, isExternal: true });
  }

  // Internal walls (deduplicated)
  const wallSet = new Set<string>();
  for (const room of rooms) {
    const edges: Array<[number, number, number, number]> = [
      [room.x, room.y, room.x + room.width, room.y],
      [room.x, room.y + room.height, room.x + room.width, room.y + room.height],
      [room.x, room.y, room.x, room.y + room.height],
      [room.x + room.width, room.y, room.x + room.width, room.y + room.height],
    ];
    for (const [sx, sy, ex, ey] of edges) {
      const onBoundary =
        (Math.abs(sy) < 0.01 && Math.abs(ey) < 0.01) ||
        (Math.abs(sy - lotLength) < 0.01 && Math.abs(ey - lotLength) < 0.01) ||
        (Math.abs(sx) < 0.01 && Math.abs(ex) < 0.01) ||
        (Math.abs(sx - lotWidth) < 0.01 && Math.abs(ex - lotWidth) < 0.01);
      if (onBoundary) continue;

      const key = [sx, sy, ex, ey].map(v => v.toFixed(1)).join(',');
      const rev = [ex, ey, sx, sy].map(v => v.toFixed(1)).join(',');
      if (wallSet.has(key) || wallSet.has(rev)) continue;
      wallSet.add(key);

      walls.push({ id: randomUUID(), startX: sx, startY: sy, endX: ex, endY: ey, thickness: 0.15, isExternal: false });
    }
  }

  return walls;
}

// === Door Generation ===

function generateDoors(rooms: Room[], walls: Wall[], lotWidth: number, lotLength: number): Door[] {
  const doors: Door[] = [];
  const corridor = rooms.find(rm => rm.type === 'corredor');

  for (const room of rooms) {
    if (room.type === 'corredor' || room.type === 'piscina') continue;

    let targetWall: Wall | undefined;

    if (room.type === 'garagem') {
      // Garagem opens to street (y=0 wall = front)
      targetWall = walls.find(w => w.isExternal && Math.abs(w.startY) < 0.05 && Math.abs(w.endY) < 0.05);
    } else if (room.type === 'quarto' && corridor) {
      // Quartos open to corridor
      const touchesCorridorRight = Math.abs(room.x + room.width - corridor.x) < 0.2;
      const touchesCorridorLeft = Math.abs(room.x - (corridor.x + corridor.width)) < 0.2;

      if (touchesCorridorRight) {
        targetWall = findWall(walls, room.x + room.width, room.y, room.x + room.width, room.y + room.height);
      } else if (touchesCorridorLeft) {
        targetWall = findWall(walls, room.x, room.y, room.x, room.y + room.height);
      } else {
        // Fallback: top wall
        targetWall = findWall(walls, room.x, room.y, room.x + room.width, room.y);
      }
    } else if (room.type === 'sala_estar' || room.type === 'sala_jantar') {
      // Salas: door on top wall (connects to cozinha/middle)
      targetWall = findWall(walls, room.x, room.y + room.height, room.x + room.width, room.y + room.height);
    } else if (room.type === 'cozinha') {
      // Cozinha: door on bottom wall (connects to sala)
      targetWall = findWall(walls, room.x, room.y, room.x + room.width, room.y);
    } else {
      // Others: top or left wall
      targetWall = findWall(walls, room.x, room.y, room.x + room.width, room.y)
        || findWall(walls, room.x, room.y, room.x, room.y + room.height);
    }

    if (targetWall) {
      doors.push({
        id: randomUUID(),
        wallId: targetWall.id,
        position: 0.4,
        width: room.type === 'garagem' ? 2.5 : 0.8,
        type: room.type === 'garagem' ? 'double' : 'single',
      });
    }
  }

  return doors;
}

function findWall(walls: Wall[], sx: number, sy: number, ex: number, ey: number): Wall | undefined {
  return walls.find(w => {
    const fwd = Math.abs(w.startX - sx) < 0.2 && Math.abs(w.startY - sy) < 0.2 && Math.abs(w.endX - ex) < 0.2 && Math.abs(w.endY - ey) < 0.2;
    const rev = Math.abs(w.startX - ex) < 0.2 && Math.abs(w.startY - ey) < 0.2 && Math.abs(w.endX - sx) < 0.2 && Math.abs(w.endY - sy) < 0.2;
    return fwd || rev;
  });
}

// === Window Generation ===

function generateWindows(rooms: Room[], walls: Wall[], lotWidth: number, lotLength: number): WindowElement[] {
  const windows: WindowElement[] = [];
  const windowTypes: RoomType[] = ['sala_estar', 'sala_jantar', 'quarto', 'cozinha', 'area_gourmet'];

  for (const room of rooms) {
    if (!windowTypes.includes(room.type)) continue;

    const touchesLeft = Math.abs(room.x) < 0.1;
    const touchesRight = Math.abs(room.x + room.width - lotWidth) < 0.1;
    const touchesFront = Math.abs(room.y) < 0.1;
    const touchesBack = Math.abs(room.y + room.height - lotLength) < 0.1;

    let extWall: Wall | undefined;
    let position = 0.5;

    if (touchesFront) {
      extWall = walls.find(w => w.isExternal && Math.abs(w.startY) < 0.05 && Math.abs(w.endY) < 0.05);
      const wallLen = Math.abs((extWall?.endX ?? lotWidth) - (extWall?.startX ?? 0));
      position = wallLen > 0 ? (room.x + room.width / 2) / wallLen : 0.5;
    } else if (touchesRight) {
      extWall = walls.find(w => w.isExternal && Math.abs(w.startX - lotWidth) < 0.05 && Math.abs(w.endX - lotWidth) < 0.05);
      const wallLen = Math.abs((extWall?.endY ?? lotLength) - (extWall?.startY ?? 0));
      position = wallLen > 0 ? (room.y + room.height / 2) / wallLen : 0.5;
    } else if (touchesLeft) {
      extWall = walls.find(w => w.isExternal && Math.abs(w.startX) < 0.05 && Math.abs(w.endX) < 0.05);
      const wallLen = Math.abs((extWall?.endY ?? lotLength) - (extWall?.startY ?? 0));
      position = wallLen > 0 ? (room.y + room.height / 2) / wallLen : 0.5;
    } else if (touchesBack) {
      extWall = walls.find(w => w.isExternal && Math.abs(w.startY - lotLength) < 0.05 && Math.abs(w.endY - lotLength) < 0.05);
      const wallLen = Math.abs((extWall?.endX ?? lotWidth) - (extWall?.startX ?? 0));
      position = wallLen > 0 ? (room.x + room.width / 2) / wallLen : 0.5;
    }

    if (extWall) {
      windows.push({
        id: randomUUID(),
        wallId: extWall.id,
        position: Math.max(0.1, Math.min(0.9, position)),
        width: 1.2,
        height: 1.2,
        sillHeight: 1.0,
      });
    }
  }

  return windows;
}

// === Main Export ===

export function generateAlgorithmic(params: ProjectParams): FloorPlanData {
  const template = selectTemplate(params);
  console.log(`[ALGO] Selected template: ${template.name} for ${params.rooms}q ${params.bathrooms}b ${params.garageSpots > 0 ? 'garage' : 'no-garage'}`);

  const rooms = scaleTemplate(template, params.lot.width, params.lot.length);

  // Validate
  validateNoOverlap(rooms);

  const walls = generateWalls(rooms, params.lot.width, params.lot.length);
  const doors = generateDoors(rooms, walls, params.lot.width, params.lot.length);
  const windows = generateWindows(rooms, walls, params.lot.width, params.lot.length);

  const totalArea = rooms.reduce((sum, rm) => sum + rm.area, 0);

  return {
    id: randomUUID(),
    totalArea: Math.round(totalArea * 10) / 10,
    rooms,
    walls,
    doors,
    windows,
  };
}

// === Helpers ===

function r(n: number): number {
  return Math.round(n * 10) / 10;
}
