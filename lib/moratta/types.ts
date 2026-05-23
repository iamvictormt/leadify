// === Parâmetros do Projeto ===

export type PropertyType = 'casa_terrea' | 'sobrado' | 'apartamento';

export type ArchitecturalStyle = 'moderno' | 'classico' | 'minimalista' | 'rustico' | 'contemporaneo';

export type FinishLevel = 'baixo' | 'medio' | 'alto';

export interface ProjectParams {
  propertyType: PropertyType;
  lot: {
    width: number;   // 5-100m, 2 decimais
    length: number;  // 5-200m, 2 decimais
  };
  rooms: number;       // 1-10
  bathrooms: number;   // 1-10
  garageSpots: number; // 0-10
  hasPool: boolean;
  hasGourmetArea: boolean;
  style: ArchitecturalStyle;
  budget: number;      // 50000-50000000 BRL
  finishLevel?: FinishLevel;
}

// === Planta Baixa ===

export type RoomType =
  | 'sala_estar' | 'sala_jantar' | 'cozinha' | 'quarto'
  | 'banheiro' | 'lavabo' | 'garagem' | 'area_servico'
  | 'area_gourmet' | 'piscina' | 'corredor' | 'hall'
  | 'escritorio' | 'varanda' | 'despensa' | 'closet';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  x: number;       // posição X em metros
  y: number;       // posição Y em metros
  width: number;   // largura em metros
  height: number;  // comprimento em metros
  area: number;    // área em m² (1 decimal)
  floor: number;   // 0 = térreo, 1 = primeiro andar (sobrado)
}

export interface Wall {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number; // em metros (padrão 0.15)
  isExternal: boolean;
}

export interface Door {
  id: string;
  wallId: string;
  position: number;  // posição ao longo da parede (0-1)
  width: number;     // largura em metros
  type: 'single' | 'double' | 'sliding';
}

export interface WindowElement {
  id: string;
  wallId: string;
  position: number;
  width: number;
  height: number;
  sillHeight: number; // altura do peitoril
}

export interface FloorPlanData {
  id: string;
  totalArea: number;
  rooms: Room[];
  walls: Wall[];
  doors: Door[];
  windows: WindowElement[];
}

// === Estimativa de Custo ===

export interface MaterialItem {
  name: string;
  unit: string;
  quantity: number;
  marginPercent: number; // até 20%
  unitCost: number;
  totalCost: number;
}

export interface MaterialCategory {
  name: string;  // estrutura, alvenaria, elétrica, hidráulica, acabamento
  items: MaterialItem[];
  subtotal: number;
}

export interface ConstructionPhase {
  name: string;       // fundação, estrutura, acabamento, instalações
  durationWeeks: number;
  order: number;
}

export interface CostReductionSuggestion {
  description: string;
  savingsAmount: number;
  impact: 'low' | 'medium' | 'high';
}

export interface CostEstimate {
  totalArea: number;
  finishLevel: FinishLevel;
  costPerSqm: number;
  totalCost: number;
  budget: number;
  isOverBudget: boolean;
  overBudgetAmount: number;
  materials: MaterialCategory[];
  timeline: ConstructionPhase[];
  suggestions: CostReductionSuggestion[];
}

// === Modelo 3D ===

export interface Wall3D {
  vertices: number[];  // coordenadas 3D
  height: number;
  material: string;
  isExternal: boolean;
}

export interface Floor3D {
  vertices: number[];
  material: string;
  level: number;
}

export interface Roof3D {
  vertices: number[];
  type: 'flat' | 'gable' | 'hip' | 'mansard';
  material: string;
}

export interface Opening3D {
  type: 'door' | 'window';
  position: number[];
  width: number;
  height: number;
  wallId: string;
}

export interface FacadeData {
  style: string;
  roofType: 'flat' | 'gable' | 'hip' | 'mansard';
  wallFinish: string;
  windowFrameStyle: string;
}

export interface ThreeDModelData {
  walls: Wall3D[];
  floors: Floor3D[];
  roof: Roof3D;
  openings: Opening3D[];
  facade: FacadeData;
}

// === Validação ===

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
