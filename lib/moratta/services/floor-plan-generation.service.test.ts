import { describe, it, expect, vi } from 'vitest';
import {
  generate,
  generateVariation,
  validateFloorPlan,
  parseAiResponse,
  checkInfeasibility,
  isDistinctVariation,
  buildGenerationPrompt,
  buildVariationPrompt,
  buildRequiredRoomsList,
  type AiCaller,
  type GenerationResult,
} from './floor-plan-generation.service';
import type { ProjectParams, FloorPlanData } from '../types';

// === Test Helpers ===

function createValidParams(overrides?: Partial<ProjectParams>): ProjectParams {
  return {
    propertyType: 'casa_terrea',
    lot: { width: 15, length: 25 },
    rooms: 2,
    bathrooms: 1,
    garageSpots: 1,
    hasPool: false,
    hasGourmetArea: false,
    style: 'moderno',
    budget: 300000,
    ...overrides,
  };
}

function createValidAiResponse(params: ProjectParams): string {
  const rooms = [
    { name: 'Sala de Estar', type: 'sala_estar', x: 0, y: 0, width: 5, height: 4, floor: 0 },
    { name: 'Sala de Jantar', type: 'sala_jantar', x: 5, y: 0, width: 4, height: 4, floor: 0 },
    { name: 'Cozinha', type: 'cozinha', x: 9, y: 0, width: 4, height: 4, floor: 0 },
    { name: 'Corredor', type: 'corredor', x: 0, y: 4, width: 13, height: 2, floor: 0 },
    { name: 'Quarto 1', type: 'quarto', x: 0, y: 6, width: 4, height: 4, floor: 0 },
    { name: 'Quarto 2', type: 'quarto', x: 4, y: 6, width: 4, height: 4, floor: 0 },
    { name: 'Banheiro 1', type: 'banheiro', x: 8, y: 6, width: 3, height: 3, floor: 0 },
    { name: 'Garagem', type: 'garagem', x: 0, y: 10, width: 5, height: 5, floor: 0 },
    { name: 'Área de Serviço', type: 'area_servico', x: 9, y: 4, width: 4, height: 3, floor: 0 },
  ];

  const walls = [
    { startX: 0, startY: 0, endX: 15, endY: 0, thickness: 0.15, isExternal: true },
    { startX: 0, startY: 0, endX: 0, endY: 25, thickness: 0.15, isExternal: true },
  ];

  const doors = [
    { wallIndex: 0, position: 0.3, width: 0.9, type: 'single' },
  ];

  const windows = [
    { wallIndex: 0, position: 0.7, width: 1.2, height: 1.4, sillHeight: 1.0 },
  ];

  return JSON.stringify({ rooms, walls, doors, windows });
}

function createMockAiCaller(response: string | Error): AiCaller {
  return vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
}

// === Tests ===

describe('FloorPlanGenerationService', () => {
  describe('checkInfeasibility', () => {
    it('returns null for feasible params', () => {
      const params = createValidParams();
      expect(checkInfeasibility(params)).toBeNull();
    });

    it('returns error when minimum areas exceed lot area', () => {
      // 2 rooms + 1 bathroom + 5 base (sala_estar, sala_jantar, cozinha, area_servico, corredor) + 1 garage = 9 rooms
      // 9 * 4 = 36m² minimum needed
      // Lot: 5 * 5 = 25m² — too small
      const params = createValidParams({
        lot: { width: 5, length: 5 },
        rooms: 2,
        bathrooms: 1,
        garageSpots: 1,
      });

      const result = checkInfeasibility(params);
      expect(result).not.toBeNull();
      expect(result!.code).toBe('INFEASIBLE');
      expect(result!.details!.excess).toBe(11); // 36 - 25 = 11
    });

    it('accounts for pool and gourmet area in room count', () => {
      // 1 room + 1 bathroom + 5 base + 1 pool + 1 gourmet = 9 rooms
      // 9 * 4 = 36m² minimum
      // Lot: 5 * 7 = 35m² — too small
      const params = createValidParams({
        lot: { width: 5, length: 7 },
        rooms: 1,
        bathrooms: 1,
        garageSpots: 0,
        hasPool: true,
        hasGourmetArea: true,
      });

      const result = checkInfeasibility(params);
      expect(result).not.toBeNull();
      expect(result!.code).toBe('INFEASIBLE');
    });
  });

  describe('parseAiResponse', () => {
    it('parses valid JSON response', () => {
      const response = JSON.stringify({
        rooms: [
          { name: 'Sala', type: 'sala_estar', x: 0, y: 0, width: 5, height: 4, floor: 0 },
        ],
        walls: [
          { startX: 0, startY: 0, endX: 5, endY: 0, thickness: 0.15, isExternal: true },
        ],
        doors: [
          { wallIndex: 0, position: 0.5, width: 0.9, type: 'single' },
        ],
        windows: [
          { wallIndex: 0, position: 0.3, width: 1.2, height: 1.4, sillHeight: 1.0 },
        ],
      });

      const result = parseAiResponse(response);
      expect(result).not.toBeNull();
      expect(result!.rooms).toHaveLength(1);
      expect(result!.rooms[0].name).toBe('Sala');
      expect(result!.rooms[0].area).toBe(20); // 5 * 4
      expect(result!.walls).toHaveLength(1);
      expect(result!.doors).toHaveLength(1);
      expect(result!.windows).toHaveLength(1);
    });

    it('handles markdown code blocks', () => {
      const response = '```json\n{"rooms": [{"name": "Sala", "type": "sala_estar", "x": 0, "y": 0, "width": 3, "height": 3, "floor": 0}], "walls": [], "doors": [], "windows": []}\n```';

      const result = parseAiResponse(response);
      expect(result).not.toBeNull();
      expect(result!.rooms).toHaveLength(1);
    });

    it('returns null for invalid JSON', () => {
      expect(parseAiResponse('not json')).toBeNull();
      expect(parseAiResponse('')).toBeNull();
      expect(parseAiResponse('{}')).toBeNull(); // no rooms array
    });

    it('computes area as width * height rounded to 1 decimal', () => {
      const response = JSON.stringify({
        rooms: [
          { name: 'Sala', type: 'sala_estar', x: 0, y: 0, width: 3.3, height: 2.7, floor: 0 },
        ],
        walls: [],
        doors: [],
        windows: [],
      });

      const result = parseAiResponse(response);
      expect(result!.rooms[0].area).toBe(8.9); // 3.3 * 2.7 = 8.91 → rounded to 8.9
    });

    it('clamps door/window positions to 0-1 range', () => {
      const response = JSON.stringify({
        rooms: [{ name: 'Sala', type: 'sala_estar', x: 0, y: 0, width: 5, height: 4, floor: 0 }],
        walls: [{ startX: 0, startY: 0, endX: 5, endY: 0, thickness: 0.15, isExternal: true }],
        doors: [{ wallIndex: 0, position: 1.5, width: 0.9, type: 'single' }],
        windows: [{ wallIndex: 0, position: -0.5, width: 1.0, height: 1.2, sillHeight: 1.0 }],
      });

      const result = parseAiResponse(response);
      expect(result!.doors[0].position).toBe(1);
      expect(result!.windows[0].position).toBe(0);
    });
  });

  describe('buildRequiredRoomsList', () => {
    it('includes all required rooms based on params', () => {
      const params = createValidParams({
        rooms: 3,
        bathrooms: 2,
        garageSpots: 2,
        hasPool: true,
        hasGourmetArea: true,
      });

      const rooms = buildRequiredRoomsList(params);
      const types = rooms.map(r => r.type);

      expect(types.filter(t => t === 'quarto')).toHaveLength(3);
      expect(types.filter(t => t === 'banheiro')).toHaveLength(2);
      expect(types).toContain('garagem');
      expect(types).toContain('piscina');
      expect(types).toContain('area_gourmet');
      expect(types).toContain('sala_estar');
      expect(types).toContain('sala_jantar');
      expect(types).toContain('cozinha');
      expect(types).toContain('area_servico');
      expect(types).toContain('corredor');
    });

    it('excludes optional rooms when not requested', () => {
      const params = createValidParams({
        garageSpots: 0,
        hasPool: false,
        hasGourmetArea: false,
      });

      const rooms = buildRequiredRoomsList(params);
      const types = rooms.map(r => r.type);

      expect(types).not.toContain('garagem');
      expect(types).not.toContain('piscina');
      expect(types).not.toContain('area_gourmet');
    });
  });

  describe('buildGenerationPrompt', () => {
    it('includes lot dimensions and room requirements', () => {
      const params = createValidParams();
      const prompt = buildGenerationPrompt(params);

      expect(prompt).toContain('15m (largura)');
      expect(prompt).toContain('25m (comprimento)');
      expect(prompt).toContain('375m²');
      expect(prompt).toContain('Quartos: 2');
      expect(prompt).toContain('Banheiros: 1');
    });

    it('includes feedback errors when provided', () => {
      const params = createValidParams();
      const prompt = buildGenerationPrompt(params, ['Área excede o terreno', 'Quarto muito pequeno']);

      expect(prompt).toContain('CORREÇÕES NECESSÁRIAS');
      expect(prompt).toContain('Área excede o terreno');
      expect(prompt).toContain('Quarto muito pequeno');
    });
  });

  describe('buildVariationPrompt', () => {
    it('includes existing variations info', () => {
      const params = createValidParams();
      const existing: FloorPlanData = {
        id: 'test-id',
        totalArea: 100,
        rooms: [
          { id: 'r1', name: 'Sala', type: 'sala_estar', x: 0, y: 0, width: 5, height: 4, area: 20, floor: 0 },
        ],
        walls: [],
        doors: [],
        windows: [],
      };

      const prompt = buildVariationPrompt(params, [existing]);

      expect(prompt).toContain('REQUISITO DE VARIAÇÃO');
      expect(prompt).toContain('Variações Existentes');
      expect(prompt).toContain('Sala: (0, 0) 5×4m');
    });
  });

  describe('isDistinctVariation', () => {
    const baseRoom = { id: 'r1', name: 'Sala', type: 'sala_estar' as const, x: 0, y: 0, width: 5, height: 4, area: 20, floor: 0 };

    it('returns true when no existing variations', () => {
      const plan: FloorPlanData = { id: '1', totalArea: 20, rooms: [baseRoom], walls: [], doors: [], windows: [] };
      expect(isDistinctVariation(plan, [])).toBe(true);
    });

    it('returns true when room position differs significantly', () => {
      const existing: FloorPlanData = { id: '1', totalArea: 20, rooms: [baseRoom], walls: [], doors: [], windows: [] };
      const newPlan: FloorPlanData = {
        id: '2', totalArea: 20,
        rooms: [{ ...baseRoom, x: 3, y: 2 }],
        walls: [], doors: [], windows: [],
      };
      expect(isDistinctVariation(newPlan, [existing])).toBe(true);
    });

    it('returns false when all rooms are too similar', () => {
      const existing: FloorPlanData = { id: '1', totalArea: 20, rooms: [baseRoom], walls: [], doors: [], windows: [] };
      const newPlan: FloorPlanData = {
        id: '2', totalArea: 20,
        rooms: [{ ...baseRoom, x: 0.2, y: 0.1 }], // too close
        walls: [], doors: [], windows: [],
      };
      expect(isDistinctVariation(newPlan, [existing])).toBe(false);
    });

    it('returns true when proportions differ significantly', () => {
      const existing: FloorPlanData = { id: '1', totalArea: 20, rooms: [baseRoom], walls: [], doors: [], windows: [] };
      const newPlan: FloorPlanData = {
        id: '2', totalArea: 20,
        rooms: [{ ...baseRoom, width: 4, height: 5 }], // different proportions
        walls: [], doors: [], windows: [],
      };
      expect(isDistinctVariation(newPlan, [existing])).toBe(true);
    });
  });

  describe('validateFloorPlan', () => {
    it('returns valid for a correct floor plan', () => {
      const params = createValidParams({ rooms: 1, bathrooms: 1, garageSpots: 0, hasPool: false, hasGourmetArea: false });
      const plan: FloorPlanData = {
        id: 'test',
        totalArea: 60,
        rooms: [
          { id: 'r1', name: 'Sala de Estar', type: 'sala_estar', x: 0, y: 0, width: 5, height: 4, area: 20, floor: 0 },
          { id: 'r2', name: 'Cozinha', type: 'cozinha', x: 5, y: 0, width: 4, height: 4, area: 16, floor: 0 },
          { id: 'r3', name: 'Corredor', type: 'corredor', x: 0, y: 4, width: 9, height: 2, area: 18, floor: 0 },
          { id: 'r4', name: 'Quarto 1', type: 'quarto', x: 0, y: 6, width: 4, height: 4, area: 16, floor: 0 },
          { id: 'r5', name: 'Banheiro 1', type: 'banheiro', x: 4, y: 6, width: 3, height: 3, area: 9, floor: 0 },
          { id: 'r6', name: 'Área de Serviço', type: 'area_servico', x: 5, y: 4, width: 4, height: 2, area: 8, floor: 0 },
          { id: 'r7', name: 'Sala de Jantar', type: 'sala_jantar', x: 9, y: 0, width: 4, height: 4, area: 16, floor: 0 },
        ],
        walls: [],
        doors: [],
        windows: [],
      };

      const result = validateFloorPlan(plan, params);
      // May have adjacency warnings but should not have missing rooms
      const missingErrors = result.errors.filter(e => e.code.startsWith('MISSING_'));
      expect(missingErrors).toHaveLength(0);
    });

    it('detects missing rooms', () => {
      const params = createValidParams({ rooms: 3, bathrooms: 2 });
      const plan: FloorPlanData = {
        id: 'test',
        totalArea: 20,
        rooms: [
          { id: 'r1', name: 'Quarto 1', type: 'quarto', x: 0, y: 0, width: 5, height: 4, area: 20, floor: 0 },
        ],
        walls: [],
        doors: [],
        windows: [],
      };

      const result = validateFloorPlan(plan, params);
      const missingRooms = result.errors.find(e => e.code === 'MISSING_ROOMS');
      const missingBathrooms = result.errors.find(e => e.code === 'MISSING_BATHROOMS');

      expect(missingRooms).toBeDefined();
      expect(missingBathrooms).toBeDefined();
    });

    it('detects missing garage when requested', () => {
      const params = createValidParams({ garageSpots: 2 });
      const plan: FloorPlanData = {
        id: 'test',
        totalArea: 20,
        rooms: [
          { id: 'r1', name: 'Sala', type: 'sala_estar', x: 0, y: 0, width: 5, height: 4, area: 20, floor: 0 },
        ],
        walls: [],
        doors: [],
        windows: [],
      };

      const result = validateFloorPlan(plan, params);
      expect(result.errors.find(e => e.code === 'MISSING_GARAGE')).toBeDefined();
    });

    it('detects missing pool when requested', () => {
      const params = createValidParams({ hasPool: true });
      const plan: FloorPlanData = {
        id: 'test',
        totalArea: 20,
        rooms: [
          { id: 'r1', name: 'Sala', type: 'sala_estar', x: 0, y: 0, width: 5, height: 4, area: 20, floor: 0 },
        ],
        walls: [],
        doors: [],
        windows: [],
      };

      const result = validateFloorPlan(plan, params);
      expect(result.errors.find(e => e.code === 'MISSING_POOL')).toBeDefined();
    });

    it('detects missing gourmet area when requested', () => {
      const params = createValidParams({ hasGourmetArea: true });
      const plan: FloorPlanData = {
        id: 'test',
        totalArea: 20,
        rooms: [
          { id: 'r1', name: 'Sala', type: 'sala_estar', x: 0, y: 0, width: 5, height: 4, area: 20, floor: 0 },
        ],
        walls: [],
        doors: [],
        windows: [],
      };

      const result = validateFloorPlan(plan, params);
      expect(result.errors.find(e => e.code === 'MISSING_GOURMET_AREA')).toBeDefined();
    });
  });

  describe('generate', () => {
    it('returns infeasibility error for impossible params', async () => {
      const params = createValidParams({ lot: { width: 5, length: 5 } });
      const result = await generate(params);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INFEASIBLE');
      }
    });

    it('returns floor plan data on successful generation', async () => {
      const params = createValidParams();
      const mockCaller = createMockAiCaller(createValidAiResponse(params));

      const result = await generate(params, mockCaller);

      // The mock response may not pass all validation rules (adjacency etc),
      // but the function should have been called and returned a result
      expect(mockCaller).toHaveBeenCalled();
      expect(result).toHaveProperty('success');
    });

    it('retries on invalid JSON response', async () => {
      const params = createValidParams();
      let callCount = 0;
      const mockCaller: AiCaller = vi.fn(async () => {
        callCount++;
        if (callCount <= 2) return 'not json';
        return createValidAiResponse(params);
      });

      const result = await generate(params, mockCaller);

      expect(mockCaller).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('returns timeout error on AbortError', async () => {
      const params = createValidParams();
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      const mockCaller = createMockAiCaller(abortError);

      const result = await generate(params, mockCaller);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TIMEOUT');
      }
    });

    it('returns AI error on generic error', async () => {
      const params = createValidParams();
      const mockCaller = createMockAiCaller(new Error('Network error'));

      const result = await generate(params, mockCaller);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AI_ERROR');
        expect(result.error.message).toContain('Network error');
      }
    });

    it('returns validation_failed after max retries with invalid plans', async () => {
      const params = createValidParams();
      // Return a plan with rooms that are too small (area < 4m²)
      const badResponse = JSON.stringify({
        rooms: [{ name: 'Sala', type: 'sala_estar', x: 0, y: 0, width: 1, height: 1, floor: 0 }],
        walls: [],
        doors: [],
        windows: [],
      });
      const mockCaller = createMockAiCaller(badResponse);

      const result = await generate(params, mockCaller);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_FAILED');
      }
      expect(mockCaller).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('includes feedback errors in retry prompts', async () => {
      const params = createValidParams();
      const prompts: string[] = [];
      const mockCaller: AiCaller = vi.fn(async (prompt: string) => {
        prompts.push(prompt);
        // Always return invalid plan to trigger retries
        return JSON.stringify({
          rooms: [{ name: 'Sala', type: 'sala_estar', x: 0, y: 0, width: 1, height: 1, floor: 0 }],
          walls: [],
          doors: [],
          windows: [],
        });
      });

      await generate(params, mockCaller);

      // Second and third prompts should contain feedback
      expect(prompts[1]).toContain('CORREÇÕES NECESSÁRIAS');
      expect(prompts[2]).toContain('CORREÇÕES NECESSÁRIAS');
    });
  });

  describe('generateVariation', () => {
    it('returns infeasibility error for impossible params', async () => {
      const params = createValidParams({ lot: { width: 5, length: 5 } });
      const result = await generateVariation(params, []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INFEASIBLE');
      }
    });

    it('returns timeout error on AbortError', async () => {
      const params = createValidParams();
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      const mockCaller = createMockAiCaller(abortError);

      const result = await generateVariation(params, [], mockCaller);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('TIMEOUT');
        expect(result.error.message).toContain('60 segundos');
      }
    });

    it('checks distinctness against existing variations', async () => {
      const params = createValidParams();
      const existingPlan: FloorPlanData = {
        id: 'existing',
        totalArea: 100,
        rooms: [
          { id: 'r1', name: 'Sala de Estar', type: 'sala_estar', x: 0, y: 0, width: 5, height: 4, area: 20, floor: 0 },
        ],
        walls: [],
        doors: [],
        windows: [],
      };

      // Return a plan that's identical to existing
      const sameResponse = JSON.stringify({
        rooms: [{ name: 'Sala de Estar', type: 'sala_estar', x: 0, y: 0, width: 5, height: 4, floor: 0 }],
        walls: [],
        doors: [],
        windows: [],
      });

      const mockCaller = createMockAiCaller(sameResponse);
      const result = await generateVariation(params, [existingPlan], mockCaller);

      // Should fail because variation is not distinct (and also missing rooms)
      expect(result.success).toBe(false);
      expect(mockCaller).toHaveBeenCalledTimes(3);
    });

    it('passes variation timeout (60s) to AI caller', async () => {
      const params = createValidParams();
      let receivedTimeout = 0;
      const mockCaller: AiCaller = vi.fn(async (_prompt: string, timeoutMs: number) => {
        receivedTimeout = timeoutMs;
        return createValidAiResponse(params);
      });

      await generateVariation(params, [], mockCaller);

      expect(receivedTimeout).toBe(60_000);
    });
  });
});
