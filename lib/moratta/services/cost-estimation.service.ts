import type {
  FloorPlanData,
  FinishLevel,
  CostEstimate,
  MaterialCategory,
  MaterialItem,
  ConstructionPhase,
  CostReductionSuggestion,
} from '../types';

// === Cost per m² by finish level ===

const COST_PER_SQM: Record<FinishLevel, number> = {
  baixo: 2500,
  medio: 3800,
  alto: 5500,
};

// === Material estimation helpers ===

interface MaterialTemplate {
  name: string;
  unit: string;
  quantityPerSqm: number;
  marginPercent: number;
  unitCost: number;
}

type MaterialTemplates = Record<string, MaterialTemplate[]>;

const MATERIAL_TEMPLATES_BAIXO: MaterialTemplates = {
  estrutura: [
    { name: 'Concreto usinado', unit: 'm³', quantityPerSqm: 0.15, marginPercent: 10, unitCost: 450 },
    { name: 'Aço CA-50', unit: 'kg', quantityPerSqm: 12, marginPercent: 15, unitCost: 7.5 },
    { name: 'Forma de madeira', unit: 'm²', quantityPerSqm: 0.8, marginPercent: 10, unitCost: 65 },
  ],
  alvenaria: [
    { name: 'Bloco cerâmico 14x19x29', unit: 'un', quantityPerSqm: 25, marginPercent: 10, unitCost: 2.2 },
    { name: 'Argamassa de assentamento', unit: 'kg', quantityPerSqm: 15, marginPercent: 10, unitCost: 0.8 },
    { name: 'Cimento CP-II', unit: 'kg', quantityPerSqm: 8, marginPercent: 10, unitCost: 0.65 },
  ],
  'instalações elétricas': [
    { name: 'Fio 2.5mm²', unit: 'm', quantityPerSqm: 5, marginPercent: 15, unitCost: 3.5 },
    { name: 'Disjuntor', unit: 'un', quantityPerSqm: 0.1, marginPercent: 5, unitCost: 25 },
    { name: 'Tomada simples', unit: 'un', quantityPerSqm: 0.3, marginPercent: 5, unitCost: 12 },
  ],
  'instalações hidráulicas': [
    { name: 'Tubo PVC 25mm', unit: 'm', quantityPerSqm: 1.5, marginPercent: 10, unitCost: 8 },
    { name: 'Conexões PVC', unit: 'un', quantityPerSqm: 1.2, marginPercent: 15, unitCost: 5 },
    { name: 'Registro de gaveta', unit: 'un', quantityPerSqm: 0.05, marginPercent: 5, unitCost: 45 },
  ],
  acabamento: [
    { name: 'Piso cerâmico', unit: 'm²', quantityPerSqm: 1.1, marginPercent: 10, unitCost: 35 },
    { name: 'Tinta acrílica', unit: 'L', quantityPerSqm: 0.4, marginPercent: 10, unitCost: 28 },
    { name: 'Massa corrida', unit: 'kg', quantityPerSqm: 1.5, marginPercent: 10, unitCost: 4 },
  ],
};

const MATERIAL_TEMPLATES_MEDIO: MaterialTemplates = {
  estrutura: [
    { name: 'Concreto usinado fck 30', unit: 'm³', quantityPerSqm: 0.18, marginPercent: 10, unitCost: 520 },
    { name: 'Aço CA-50', unit: 'kg', quantityPerSqm: 14, marginPercent: 15, unitCost: 7.5 },
    { name: 'Forma metálica', unit: 'm²', quantityPerSqm: 0.8, marginPercent: 10, unitCost: 85 },
  ],
  alvenaria: [
    { name: 'Bloco cerâmico 14x19x29', unit: 'un', quantityPerSqm: 25, marginPercent: 10, unitCost: 2.8 },
    { name: 'Argamassa industrializada', unit: 'kg', quantityPerSqm: 15, marginPercent: 10, unitCost: 1.2 },
    { name: 'Cimento CP-II', unit: 'kg', quantityPerSqm: 10, marginPercent: 10, unitCost: 0.65 },
  ],
  'instalações elétricas': [
    { name: 'Fio 2.5mm² antichama', unit: 'm', quantityPerSqm: 6, marginPercent: 15, unitCost: 4.5 },
    { name: 'Disjuntor bipolar', unit: 'un', quantityPerSqm: 0.12, marginPercent: 5, unitCost: 45 },
    { name: 'Tomada com USB', unit: 'un', quantityPerSqm: 0.4, marginPercent: 5, unitCost: 35 },
  ],
  'instalações hidráulicas': [
    { name: 'Tubo PPR 25mm', unit: 'm', quantityPerSqm: 1.8, marginPercent: 10, unitCost: 12 },
    { name: 'Conexões PPR', unit: 'un', quantityPerSqm: 1.5, marginPercent: 15, unitCost: 8 },
    { name: 'Registro de pressão', unit: 'un', quantityPerSqm: 0.06, marginPercent: 5, unitCost: 65 },
  ],
  acabamento: [
    { name: 'Porcelanato 60x60', unit: 'm²', quantityPerSqm: 1.1, marginPercent: 10, unitCost: 75 },
    { name: 'Tinta acrílica premium', unit: 'L', quantityPerSqm: 0.4, marginPercent: 10, unitCost: 55 },
    { name: 'Massa acrílica', unit: 'kg', quantityPerSqm: 1.5, marginPercent: 10, unitCost: 8 },
  ],
};

const MATERIAL_TEMPLATES_ALTO: MaterialTemplates = {
  estrutura: [
    { name: 'Concreto usinado fck 35', unit: 'm³', quantityPerSqm: 0.2, marginPercent: 10, unitCost: 600 },
    { name: 'Aço CA-50/60', unit: 'kg', quantityPerSqm: 16, marginPercent: 15, unitCost: 8.5 },
    { name: 'Forma metálica revestida', unit: 'm²', quantityPerSqm: 0.9, marginPercent: 10, unitCost: 110 },
  ],
  alvenaria: [
    { name: 'Bloco estrutural 14x19x39', unit: 'un', quantityPerSqm: 20, marginPercent: 10, unitCost: 4.5 },
    { name: 'Argamassa polimérica', unit: 'kg', quantityPerSqm: 12, marginPercent: 10, unitCost: 2.5 },
    { name: 'Cimento CP-V ARI', unit: 'kg', quantityPerSqm: 10, marginPercent: 10, unitCost: 0.85 },
  ],
  'instalações elétricas': [
    { name: 'Cabo flexível 4mm²', unit: 'm', quantityPerSqm: 7, marginPercent: 15, unitCost: 6.5 },
    { name: 'Disjuntor DR', unit: 'un', quantityPerSqm: 0.15, marginPercent: 5, unitCost: 120 },
    { name: 'Tomada com proteção', unit: 'un', quantityPerSqm: 0.5, marginPercent: 5, unitCost: 55 },
  ],
  'instalações hidráulicas': [
    { name: 'Tubo PPR termofusão', unit: 'm', quantityPerSqm: 2, marginPercent: 10, unitCost: 18 },
    { name: 'Conexões PPR premium', unit: 'un', quantityPerSqm: 1.8, marginPercent: 15, unitCost: 12 },
    { name: 'Registro termostático', unit: 'un', quantityPerSqm: 0.08, marginPercent: 5, unitCost: 180 },
  ],
  acabamento: [
    { name: 'Porcelanato retificado 80x80', unit: 'm²', quantityPerSqm: 1.1, marginPercent: 10, unitCost: 150 },
    { name: 'Tinta acrílica acetinada', unit: 'L', quantityPerSqm: 0.4, marginPercent: 10, unitCost: 95 },
    { name: 'Gesso acartonado', unit: 'm²', quantityPerSqm: 0.8, marginPercent: 10, unitCost: 45 },
  ],
};

const MATERIAL_TEMPLATES_BY_LEVEL: Record<FinishLevel, MaterialTemplates> = {
  baixo: MATERIAL_TEMPLATES_BAIXO,
  medio: MATERIAL_TEMPLATES_MEDIO,
  alto: MATERIAL_TEMPLATES_ALTO,
};

// === Timeline base durations (for 100m²) ===

interface PhaseTemplate {
  name: string;
  baseWeeks: number; // base duration for 100m²
  order: number;
}

const PHASE_TEMPLATES: PhaseTemplate[] = [
  { name: 'Fundação', baseWeeks: 3, order: 1 },
  { name: 'Estrutura', baseWeeks: 6, order: 2 },
  { name: 'Instalações', baseWeeks: 4, order: 3 },
  { name: 'Acabamento', baseWeeks: 5, order: 4 },
];

// === Public API ===

/**
 * Calculates the total area from a floor plan, rounded to 2 decimal places.
 */
export function calculateTotalArea(plan: FloorPlanData): number {
  const sum = plan.rooms.reduce((acc, room) => acc + room.area, 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Calculates the full cost estimate for a floor plan.
 */
export function calculate(
  plan: FloorPlanData,
  finishLevel: FinishLevel = 'medio',
  budget: number
): CostEstimate {
  const totalArea = calculateTotalArea(plan);
  const costPerSqm = COST_PER_SQM[finishLevel];
  const totalCost = totalArea * costPerSqm;
  const isOverBudget = totalCost > budget;
  const overBudgetAmount = Math.max(0, totalCost - budget);

  const materials = getMaterialsList(plan, finishLevel);
  const timeline = getTimeline(plan);
  const suggestions = isOverBudget
    ? getSuggestions({ totalArea, finishLevel, costPerSqm, totalCost, budget, isOverBudget, overBudgetAmount, materials, timeline, suggestions: [] }, budget)
    : [];

  return {
    totalArea,
    finishLevel,
    costPerSqm,
    totalCost,
    budget,
    isOverBudget,
    overBudgetAmount,
    materials,
    timeline,
    suggestions,
  };
}

/**
 * Generates a materials list grouped by category.
 */
export function getMaterialsList(
  plan: FloorPlanData,
  finishLevel: FinishLevel = 'medio'
): MaterialCategory[] {
  const totalArea = calculateTotalArea(plan);
  const templates = MATERIAL_TEMPLATES_BY_LEVEL[finishLevel];

  const categories: MaterialCategory[] = Object.entries(templates).map(([categoryName, items]) => {
    const materialItems: MaterialItem[] = items.map((template) => {
      const quantity = Math.round(template.quantityPerSqm * totalArea * 100) / 100;
      const totalCost = Math.round(quantity * template.unitCost * 100) / 100;

      return {
        name: template.name,
        unit: template.unit,
        quantity,
        marginPercent: template.marginPercent,
        unitCost: template.unitCost,
        totalCost,
      };
    });

    const subtotal = Math.round(materialItems.reduce((sum, item) => sum + item.totalCost, 0) * 100) / 100;

    return {
      name: categoryName,
      items: materialItems,
      subtotal,
    };
  });

  return categories;
}

/**
 * Generates a construction timeline with phases proportional to total area.
 */
export function getTimeline(plan: FloorPlanData): ConstructionPhase[] {
  const totalArea = calculateTotalArea(plan);
  // Scale factor: area / 100m² (base reference)
  const scaleFactor = Math.max(totalArea / 100, 0.5);

  return PHASE_TEMPLATES.map((template) => {
    const durationWeeks = Math.max(1, Math.round(template.baseWeeks * scaleFactor));
    return {
      name: template.name,
      durationWeeks,
      order: template.order,
    };
  });
}

/**
 * Generates cost reduction suggestions when the estimate exceeds the budget.
 * The sum of savingsAmount across all suggestions is guaranteed to be >= overBudgetAmount.
 */
export function getSuggestions(
  estimate: CostEstimate,
  budget: number
): CostReductionSuggestion[] {
  const overBudgetAmount = Math.max(0, estimate.totalCost - budget);

  if (overBudgetAmount <= 0) {
    return [];
  }

  const suggestions: CostReductionSuggestion[] = [];
  let totalSavings = 0;

  // Suggestion 1: Reduce finish level
  if (estimate.finishLevel === 'alto') {
    const savingsPerSqm = COST_PER_SQM['alto'] - COST_PER_SQM['medio'];
    const savings = estimate.totalArea * savingsPerSqm;
    suggestions.push({
      description: 'Reduzir padrão de acabamento de alto para médio',
      savingsAmount: Math.round(savings * 100) / 100,
      impact: 'high',
    });
    totalSavings += savings;
  } else if (estimate.finishLevel === 'medio') {
    const savingsPerSqm = COST_PER_SQM['medio'] - COST_PER_SQM['baixo'];
    const savings = estimate.totalArea * savingsPerSqm;
    suggestions.push({
      description: 'Reduzir padrão de acabamento de médio para baixo',
      savingsAmount: Math.round(savings * 100) / 100,
      impact: 'high',
    });
    totalSavings += savings;
  }

  // Suggestion 2: Reduce area by removing optional rooms or reducing sizes
  const areaReductionPercent = 0.1; // 10% area reduction
  const areaReductionSavings = estimate.totalArea * areaReductionPercent * estimate.costPerSqm;
  suggestions.push({
    description: 'Reduzir área construída em 10% (otimizar ambientes)',
    savingsAmount: Math.round(areaReductionSavings * 100) / 100,
    impact: 'medium',
  });
  totalSavings += areaReductionSavings;

  // Suggestion 3: Use alternative materials
  const materialSavings = estimate.totalCost * 0.08; // 8% savings on materials
  suggestions.push({
    description: 'Utilizar materiais alternativos de menor custo',
    savingsAmount: Math.round(materialSavings * 100) / 100,
    impact: 'low',
  });
  totalSavings += materialSavings;

  // If total savings still don't cover the over-budget amount, add more suggestions
  if (totalSavings < overBudgetAmount) {
    const remainingNeeded = overBudgetAmount - totalSavings;
    // Suggestion 4: Phased construction
    suggestions.push({
      description: 'Executar obra em fases, priorizando áreas essenciais',
      savingsAmount: Math.round(remainingNeeded * 1.1 * 100) / 100, // 10% extra to ensure coverage
      impact: 'medium',
    });
    totalSavings += remainingNeeded * 1.1;
  }

  // Final guarantee: if somehow still not enough, adjust last suggestion
  if (totalSavings < overBudgetAmount && suggestions.length > 0) {
    const deficit = overBudgetAmount - totalSavings;
    suggestions[suggestions.length - 1].savingsAmount += Math.round(deficit * 1.1 * 100) / 100;
  }

  return suggestions;
}
