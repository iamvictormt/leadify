import { describe, it, expect } from 'vitest';
import {
  calculate,
  calculateTotalArea,
  getMaterialsList,
  getTimeline,
  getSuggestions,
} from '@/lib/moratta/services/cost-estimation.service';
import type { FloorPlanData, CostEstimate, FinishLevel } from '@/lib/moratta/types';

// === Test Helpers ===

function makePlan(rooms: Array<{ area: number }>, totalArea?: number): FloorPlanData {
  return {
    id: 'plan-1',
    totalArea: totalArea ?? rooms.reduce((sum, r) => sum + r.area, 0),
    rooms: rooms.map((r, i) => ({
      id: `room-${i}`,
      name: `Room ${i}`,
      type: 'sala_estar' as const,
      x: i * 5,
      y: 0,
      width: 5,
      height: r.area / 5,
      area: r.area,
      floor: 0,
    })),
    walls: [],
    doors: [],
    windows: [],
  };
}

function makeEstimate(overrides: Partial<CostEstimate> = {}): CostEstimate {
  return {
    totalArea: 100,
    finishLevel: 'medio',
    costPerSqm: 3800,
    totalCost: 380000,
    budget: 300000,
    isOverBudget: true,
    overBudgetAmount: 80000,
    materials: [],
    timeline: [],
    suggestions: [],
    ...overrides,
  };
}

// === Tests ===

describe('CostEstimationService', () => {
  describe('calculateTotalArea', () => {
    it('sums all room areas rounded to 2 decimal places', () => {
      const plan = makePlan([{ area: 12.5 }, { area: 8.3 }, { area: 15.7 }]);
      const result = calculateTotalArea(plan);
      expect(result).toBe(36.5);
    });

    it('handles single room', () => {
      const plan = makePlan([{ area: 25.55 }]);
      const result = calculateTotalArea(plan);
      expect(result).toBe(25.55);
    });

    it('rounds correctly to 2 decimal places', () => {
      // 10.1 + 10.2 + 10.3 = 30.6 (exact)
      const plan = makePlan([{ area: 10.1 }, { area: 10.2 }, { area: 10.3 }]);
      const result = calculateTotalArea(plan);
      expect(result).toBe(30.6);
    });

    it('handles floating point precision issues', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS, should round to 0.3
      const plan = makePlan([{ area: 0.1 }, { area: 0.2 }]);
      const result = calculateTotalArea(plan);
      expect(result).toBe(0.3);
    });
  });

  describe('calculate', () => {
    it('uses correct cost per m² for baixo finish level', () => {
      const plan = makePlan([{ area: 100 }]);
      const result = calculate(plan, 'baixo', 500000);
      expect(result.costPerSqm).toBe(2500);
      expect(result.totalCost).toBe(250000);
    });

    it('uses correct cost per m² for medio finish level', () => {
      const plan = makePlan([{ area: 100 }]);
      const result = calculate(plan, 'medio', 500000);
      expect(result.costPerSqm).toBe(3800);
      expect(result.totalCost).toBe(380000);
    });

    it('uses correct cost per m² for alto finish level', () => {
      const plan = makePlan([{ area: 100 }]);
      const result = calculate(plan, 'alto', 600000);
      expect(result.costPerSqm).toBe(5500);
      expect(result.totalCost).toBe(550000);
    });

    it('defaults to medio when no finish level provided', () => {
      const plan = makePlan([{ area: 100 }]);
      const result = calculate(plan, undefined as unknown as FinishLevel, 500000);
      expect(result.finishLevel).toBe('medio');
      expect(result.costPerSqm).toBe(3800);
    });

    it('correctly identifies over-budget scenario', () => {
      const plan = makePlan([{ area: 100 }]);
      const result = calculate(plan, 'alto', 400000);
      expect(result.isOverBudget).toBe(true);
      expect(result.overBudgetAmount).toBe(150000);
    });

    it('correctly identifies within-budget scenario', () => {
      const plan = makePlan([{ area: 50 }]);
      const result = calculate(plan, 'baixo', 200000);
      expect(result.isOverBudget).toBe(false);
      expect(result.overBudgetAmount).toBe(0);
    });

    it('returns overBudgetAmount of 0 when exactly at budget', () => {
      const plan = makePlan([{ area: 100 }]);
      const result = calculate(plan, 'baixo', 250000); // 100 * 2500 = 250000
      expect(result.isOverBudget).toBe(false);
      expect(result.overBudgetAmount).toBe(0);
    });

    it('includes materials, timeline, and suggestions in result', () => {
      const plan = makePlan([{ area: 100 }]);
      const result = calculate(plan, 'medio', 500000);
      expect(result.materials.length).toBeGreaterThanOrEqual(5);
      expect(result.timeline.length).toBeGreaterThanOrEqual(4);
      expect(result.suggestions).toEqual([]); // within budget
    });

    it('includes suggestions when over budget', () => {
      const plan = makePlan([{ area: 100 }]);
      const result = calculate(plan, 'alto', 300000); // 550000 > 300000
      expect(result.suggestions.length).toBeGreaterThanOrEqual(2);
    });

    it('calculates totalArea as sum of room areas rounded to 2 decimals', () => {
      const plan = makePlan([{ area: 12.33 }, { area: 8.77 }]);
      const result = calculate(plan, 'medio', 500000);
      expect(result.totalArea).toBe(21.1);
    });
  });

  describe('getMaterialsList', () => {
    it('returns at least 5 categories', () => {
      const plan = makePlan([{ area: 100 }]);
      const result = getMaterialsList(plan, 'medio');
      expect(result.length).toBeGreaterThanOrEqual(5);
    });

    it('includes required category names', () => {
      const plan = makePlan([{ area: 100 }]);
      const result = getMaterialsList(plan, 'medio');
      const categoryNames = result.map(c => c.name);
      expect(categoryNames).toContain('estrutura');
      expect(categoryNames).toContain('alvenaria');
      expect(categoryNames).toContain('instalações elétricas');
      expect(categoryNames).toContain('instalações hidráulicas');
      expect(categoryNames).toContain('acabamento');
    });

    it('each category has items with valid properties', () => {
      const plan = makePlan([{ area: 50 }]);
      const result = getMaterialsList(plan, 'baixo');

      for (const category of result) {
        expect(category.items.length).toBeGreaterThan(0);
        for (const item of category.items) {
          expect(item.name).toBeTruthy();
          expect(item.unit).toBeTruthy();
          expect(item.quantity).toBeGreaterThan(0);
          expect(item.marginPercent).toBeGreaterThanOrEqual(0);
          expect(item.marginPercent).toBeLessThanOrEqual(20);
          expect(item.unitCost).toBeGreaterThan(0);
          expect(item.totalCost).toBeGreaterThan(0);
        }
      }
    });

    it('category subtotal equals sum of item totalCosts', () => {
      const plan = makePlan([{ area: 80 }]);
      const result = getMaterialsList(plan, 'alto');

      for (const category of result) {
        const expectedSubtotal = category.items.reduce((sum, item) => sum + item.totalCost, 0);
        expect(category.subtotal).toBeCloseTo(expectedSubtotal, 1);
      }
    });

    it('quantities scale with area', () => {
      const smallPlan = makePlan([{ area: 50 }]);
      const largePlan = makePlan([{ area: 200 }]);

      const smallResult = getMaterialsList(smallPlan, 'medio');
      const largeResult = getMaterialsList(largePlan, 'medio');

      // First item of first category should have proportionally larger quantity
      const smallQty = smallResult[0].items[0].quantity;
      const largeQty = largeResult[0].items[0].quantity;
      expect(largeQty / smallQty).toBeCloseTo(4, 0); // 200/50 = 4x
    });

    it('margin percent is between 0 and 20 for all items', () => {
      const plan = makePlan([{ area: 100 }]);
      for (const level of ['baixo', 'medio', 'alto'] as FinishLevel[]) {
        const result = getMaterialsList(plan, level);
        for (const category of result) {
          for (const item of category.items) {
            expect(item.marginPercent).toBeGreaterThanOrEqual(0);
            expect(item.marginPercent).toBeLessThanOrEqual(20);
          }
        }
      }
    });
  });

  describe('getTimeline', () => {
    it('returns at least 4 phases', () => {
      const plan = makePlan([{ area: 100 }]);
      const result = getTimeline(plan);
      expect(result.length).toBeGreaterThanOrEqual(4);
    });

    it('all phases have durationWeeks > 0', () => {
      const plan = makePlan([{ area: 20 }]);
      const result = getTimeline(plan);
      for (const phase of result) {
        expect(phase.durationWeeks).toBeGreaterThan(0);
      }
    });

    it('includes required phase names', () => {
      const plan = makePlan([{ area: 100 }]);
      const result = getTimeline(plan);
      const phaseNames = result.map(p => p.name);
      expect(phaseNames).toContain('Fundação');
      expect(phaseNames).toContain('Estrutura');
      expect(phaseNames).toContain('Instalações');
      expect(phaseNames).toContain('Acabamento');
    });

    it('phases have sequential order', () => {
      const plan = makePlan([{ area: 100 }]);
      const result = getTimeline(plan);
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].order).toBeLessThan(result[i + 1].order);
      }
    });

    it('duration scales with area', () => {
      const smallPlan = makePlan([{ area: 50 }]);
      const largePlan = makePlan([{ area: 200 }]);

      const smallTimeline = getTimeline(smallPlan);
      const largeTimeline = getTimeline(largePlan);

      const smallTotal = smallTimeline.reduce((sum, p) => sum + p.durationWeeks, 0);
      const largeTotal = largeTimeline.reduce((sum, p) => sum + p.durationWeeks, 0);

      expect(largeTotal).toBeGreaterThan(smallTotal);
    });

    it('minimum duration is 1 week even for very small areas', () => {
      const plan = makePlan([{ area: 4 }]); // very small
      const result = getTimeline(plan);
      for (const phase of result) {
        expect(phase.durationWeeks).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('getSuggestions', () => {
    it('returns empty array when not over budget', () => {
      const estimate = makeEstimate({ isOverBudget: false, overBudgetAmount: 0, totalCost: 200000 });
      const result = getSuggestions(estimate, 300000);
      expect(result).toEqual([]);
    });

    it('returns at least 2 suggestions when over budget', () => {
      const estimate = makeEstimate({ totalCost: 380000, overBudgetAmount: 80000 });
      const result = getSuggestions(estimate, 300000);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('sum of savings covers the over-budget amount', () => {
      const estimate = makeEstimate({ totalCost: 380000, overBudgetAmount: 80000 });
      const result = getSuggestions(estimate, 300000);
      const totalSavings = result.reduce((sum, s) => sum + s.savingsAmount, 0);
      expect(totalSavings).toBeGreaterThanOrEqual(80000);
    });

    it('each suggestion has valid impact level', () => {
      const estimate = makeEstimate({ totalCost: 550000, overBudgetAmount: 250000, finishLevel: 'alto', costPerSqm: 5500 });
      const result = getSuggestions(estimate, 300000);
      for (const suggestion of result) {
        expect(['low', 'medium', 'high']).toContain(suggestion.impact);
      }
    });

    it('each suggestion has a description and positive savings', () => {
      const estimate = makeEstimate({ totalCost: 380000, overBudgetAmount: 80000 });
      const result = getSuggestions(estimate, 300000);
      for (const suggestion of result) {
        expect(suggestion.description).toBeTruthy();
        expect(suggestion.savingsAmount).toBeGreaterThan(0);
      }
    });

    it('handles large over-budget amounts', () => {
      const estimate = makeEstimate({
        totalArea: 200,
        finishLevel: 'alto',
        costPerSqm: 5500,
        totalCost: 1100000,
        overBudgetAmount: 1050000,
      });
      const result = getSuggestions(estimate, 50000);
      const totalSavings = result.reduce((sum, s) => sum + s.savingsAmount, 0);
      expect(totalSavings).toBeGreaterThanOrEqual(1050000);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('handles baixo finish level (cannot downgrade further)', () => {
      const estimate = makeEstimate({
        totalArea: 100,
        finishLevel: 'baixo',
        costPerSqm: 2500,
        totalCost: 250000,
        overBudgetAmount: 50000,
      });
      const result = getSuggestions(estimate, 200000);
      const totalSavings = result.reduce((sum, s) => sum + s.savingsAmount, 0);
      expect(totalSavings).toBeGreaterThanOrEqual(50000);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });
});
