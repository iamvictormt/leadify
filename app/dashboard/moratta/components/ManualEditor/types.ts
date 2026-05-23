// === Manual Editor Types ===

export interface Point {
  x: number;
  y: number;
}

export interface EditorWall {
  id: string;
  start: Point;
  end: Point;
  thickness: number; // meters (default 0.15)
}

export interface EditorDoor {
  id: string;
  wallId: string;
  position: number; // 0-1 along wall
  width: number; // meters
  type: 'single' | 'double' | 'sliding';
  openDirection: 'left' | 'right';
  style: 'arc' | 'frame'; // arc = solta, frame = dentro do batente/quadrado
}

export interface EditorWindow {
  id: string;
  wallId: string;
  position: number; // 0-1 along wall
  width: number; // meters
  height: number;
  sillHeight: number;
}

export type RoomType =
  | 'sala_estar' | 'sala_jantar' | 'cozinha' | 'quarto'
  | 'banheiro' | 'lavabo' | 'garagem' | 'area_servico'
  | 'area_gourmet' | 'piscina' | 'corredor' | 'hall'
  | 'escritorio' | 'varanda' | 'despensa' | 'closet'
  | 'indefinido';

export interface EditorRoom {
  id: string;
  name: string;
  type: RoomType;
  points: Point[]; // polygon vertices
  area: number; // calculated
  color: string;
}

export interface EditorFurniture {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
}

export interface EditorLabel {
  id: string;
  number: number;
  name: string;
  type: RoomType;
  x: number; // position in meters
  y: number;
}

export type EditorTool =
  | 'select'
  | 'wall'
  | 'box'
  | 'door'
  | 'window'
  | 'room'
  | 'label'
  | 'furniture'
  | 'measure'
  | 'eraser';

export interface EditorState {
  walls: EditorWall[];
  doors: EditorDoor[];
  windows: EditorWindow[];
  rooms: EditorRoom[];
  labels: EditorLabel[];
  furniture: EditorFurniture[];
  lotWidth: number;
  lotLength: number;
}

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  gridSize: number; // meters (snap grid)
  showGrid: boolean;
  showRuler: boolean;
  showMeasures: boolean;
}

export const GRID_SNAP = 0.25; // 25cm snap
export const WALL_THICKNESS = 0.15;
export const MIN_WALL_LENGTH = 0.5;

export const ROOM_COLORS: Record<RoomType, string> = {
  sala_estar: 'rgba(173, 216, 230, 0.35)',
  sala_jantar: 'rgba(144, 238, 144, 0.35)',
  cozinha: 'rgba(255, 228, 181, 0.35)',
  quarto: 'rgba(221, 160, 221, 0.35)',
  banheiro: 'rgba(176, 224, 230, 0.35)',
  lavabo: 'rgba(175, 238, 238, 0.35)',
  garagem: 'rgba(211, 211, 211, 0.35)',
  area_servico: 'rgba(245, 222, 179, 0.35)',
  area_gourmet: 'rgba(255, 218, 185, 0.35)',
  piscina: 'rgba(135, 206, 250, 0.35)',
  corredor: 'rgba(230, 230, 230, 0.35)',
  hall: 'rgba(240, 230, 210, 0.35)',
  escritorio: 'rgba(188, 210, 238, 0.35)',
  varanda: 'rgba(152, 251, 152, 0.35)',
  despensa: 'rgba(222, 184, 135, 0.35)',
  closet: 'rgba(216, 191, 216, 0.35)',
  indefinido: 'rgba(200, 200, 200, 0.2)',
};

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  sala_estar: 'Sala de Estar',
  sala_jantar: 'Sala de Jantar',
  cozinha: 'Cozinha',
  quarto: 'Quarto',
  banheiro: 'Banheiro',
  lavabo: 'Lavabo',
  garagem: 'Garagem',
  area_servico: 'Área de Serviço',
  area_gourmet: 'Área Gourmet',
  piscina: 'Piscina',
  corredor: 'Corredor',
  hall: 'Hall',
  escritorio: 'Escritório',
  varanda: 'Varanda',
  despensa: 'Despensa',
  closet: 'Closet',
  indefinido: 'Indefinido',
};
