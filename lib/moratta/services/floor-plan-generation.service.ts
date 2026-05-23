import { GoogleGenAI } from '@google/genai';
import { randomUUID } from 'crypto';
import type {
  ProjectParams,
  FloorPlanData,
  ValidationResult,
  Room,
  Wall,
  Door,
  WindowElement,
} from '../types';
import { validateAll } from './floor-plan-validation.service';
import { prisma } from '@/lib/prisma';

// === Constants ===

const MINIMUM_ROOM_AREA = 4.0;
const GENERATION_TIMEOUT_MS = 120_000;
const VARIATION_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;

// === Types ===

export interface GenerationError {
  code: 'INFEASIBLE' | 'TIMEOUT' | 'AI_ERROR' | 'VALIDATION_FAILED';
  message: string;
  details?: Record<string, unknown>;
}

export type GenerationResult =
  | { success: true; data: FloorPlanData }
  | { success: false; error: GenerationError };

/**
 * Abstraction for the AI call so it can be mocked in tests.
 */
export type AiCaller = (prompt: string, timeoutMs: number) => Promise<string>;

// === AI Provider Resolution ===

async function getActiveAiProvider(): Promise<'gemini' | 'groq' | 'openai'> {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'singleton' },
    });
    const provider = settings?.aiProvider;
    if (provider === 'groq' || provider === 'gemini' || provider === 'openai') return provider;
    return 'gemini';
  } catch (err) {
    console.error('[AI_PROVIDER] Error fetching settings, defaulting to gemini:', err);
    return 'gemini';
  }
}

// === Default AI Caller (Gemini) ===

function createGeminiCaller(): AiCaller {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set');
  }

  const genAI = new GoogleGenAI({ apiKey });

  return async (prompt: string, timeoutMs: number): Promise<string> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      return response.text ?? '';
    } finally {
      clearTimeout(timeout);
    }
  };
}

// === Groq AI Caller ===

function createGroqCaller(): AiCaller {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }

  return async (prompt: string, timeoutMs: number): Promise<string> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Use compound-beta model which has higher limits on free tier
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5.5-2026-04-23',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (response.status === 429) {
        const errorBody = await response.json().catch(() => null);
        const msg = errorBody?.error?.message || 'Rate limit exceeded';
        throw new Error(msg);
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    } finally {
      clearTimeout(timeout);
    }
  };
}

// === OpenAI Caller (GPT-5.5) ===

function createOpenAICaller(): AiCaller {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  return async (prompt: string, timeoutMs: number): Promise<string> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content: 'Você é um arquiteto especialista em projetos residenciais brasileiros. Responda APENAS com JSON válido, sem markdown, sem explicações.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4096,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    } finally {
      clearTimeout(timeout);
    }
  };
}

// === Create AI Caller based on active provider ===

async function createDefaultAiCaller(): Promise<AiCaller> {
  const provider = await getActiveAiProvider();
  console.log(`[AI_PROVIDER] Using provider: ${provider}`);

  // Create primary caller
  let primaryCaller: AiCaller;
  if (provider === 'openai') {
    primaryCaller = createOpenAICaller();
  } else if (provider === 'groq') {
    primaryCaller = createGroqCaller();
  } else {
    primaryCaller = createGeminiCaller();
  }

  // Wrap with fallback: if primary fails with rate limit, try another
  return async (prompt: string, timeoutMs: number): Promise<string> => {
    try {
      return await primaryCaller(prompt, timeoutMs);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '';
      const isRateLimit = errorMsg.includes('rate_limit') || errorMsg.includes('Rate limit') || errorMsg.includes('429') || errorMsg.includes('quota');

      if (isRateLimit) {
        console.log(`[AI_PROVIDER] ${provider} rate limited, trying fallback...`);
        try {
          const fallbackCaller = provider === 'openai'
            ? createGeminiCaller()
            : provider === 'groq'
              ? createGeminiCaller()
              : createGroqCaller();
          return await fallbackCaller(prompt, timeoutMs);
        } catch (fallbackErr) {
          console.log(`[AI_PROVIDER] Fallback also failed:`, fallbackErr);
          throw err;
        }
      }

      throw err;
    }
  };
}

// === Prompt Building ===

function buildGenerationPrompt(params: ProjectParams, feedbackErrors?: string[], compact?: boolean): string {
  const lotArea = params.lot.width * params.lot.length;
  const requiredRooms = buildRequiredRoomsList(params);

  // Compact prompt for models with low token limits (Groq free tier)
  if (compact) {
    const roomsList = requiredRooms.map(r => r.name).join(', ');
    return `Gere planta baixa JSON. Terreno: ${params.lot.width}m x ${params.lot.length}m. Tipo: ${params.propertyType}. Estilo: ${params.style}.

Ambientes obrigatórios: ${roomsList}.

TAMANHOS MÍNIMOS OBRIGATÓRIOS:
- Sala de Estar: min 15m² (ex: 5x3m)
- Sala de Jantar: min 10m² (ex: 4x2.5m)
- Cozinha: min 8m² (ex: 4x2m)
- Quartos: min 10m² (ex: 3.5x3m)
- Suíte principal: min 14m² (ex: 4x3.5m)
- Banheiros: min 4m² (ex: 2x2m)
- Garagem: min 15m² (ex: 5x3m)
- Área de Serviço: min 5m² (ex: 2.5x2m)
- Corredor: largura 1.2m, comprimento variável

REGRAS:
- Ambientes NÃO se sobrepõem
- Tudo dentro do terreno (x+width ≤ ${params.lot.width}, y+height ≤ ${params.lot.length})
- Ambientes encostados uns nos outros (sem gaps)
- Garagem na frente (y=0), quartos nos fundos
- Cozinha adjacente à sala de jantar
- Área total dos ambientes deve usar 70-90% do terreno
${feedbackErrors ? `\nCORRIGIR: ${feedbackErrors.join('; ')}` : ''}

Responda SOMENTE com JSON válido neste formato:
{"rooms":[{"name":"str","type":"str","x":0,"y":0,"width":num,"height":num,"floor":0}],"walls":[{"startX":num,"startY":num,"endX":num,"endY":num,"thickness":0.15,"isExternal":true}],"doors":[{"wallIndex":0,"position":0.5,"width":0.9,"type":"single"}],"windows":[{"wallIndex":0,"position":0.5,"width":1.2,"height":1.2,"sillHeight":1.0}]}`;
  }

  let prompt = `Você é um arquiteto especialista em projetos residenciais brasileiros.
Gere uma planta baixa conceitual em formato JSON com base nos seguintes parâmetros:

## Parâmetros do Projeto
- Tipo: ${params.propertyType}
- Terreno: ${params.lot.width}m (largura) × ${params.lot.length}m (comprimento) = ${lotArea}m²
- Quartos: ${params.rooms}
- Banheiros: ${params.bathrooms}
- Vagas de garagem: ${params.garageSpots}
- Piscina: ${params.hasPool ? 'Sim' : 'Não'}
- Área gourmet: ${params.hasGourmetArea ? 'Sim' : 'Não'}
- Estilo: ${params.style}

## Ambientes Obrigatórios
${requiredRooms.map(r => `- ${r.name} (tipo: ${r.type})`).join('\n')}

## Regras de Posicionamento
1. A área total de todos os ambientes deve ocupar entre 60% e 95% da área do terreno (${lotArea}m²)
2. Cada ambiente deve ter área mínima de ${MINIMUM_ROOM_AREA}m²
3. Os ambientes devem ser distribuídos de forma COMPACTA, sem grandes espaços vazios entre eles
4. Áreas sociais (sala_estar, sala_jantar, cozinha) devem ficar na parte frontal (y ≤ ${(params.lot.length * 0.5).toFixed(2)}m)
5. Áreas íntimas (quartos) devem ficar na parte posterior ou no andar superior
6. Garagem deve ficar na frente com acesso direto à rua (y = 0)
7. Piscina e área gourmet devem ficar nos fundos (y ≥ ${(params.lot.length * 0.6).toFixed(2)}m)
8. Nenhum ambiente pode ultrapassar os limites do terreno (0 ≤ x+width ≤ ${params.lot.width}, 0 ≤ y+height ≤ ${params.lot.length})
9. Ambientes NÃO podem se sobrepor
10. Ambientes adjacentes devem compartilhar paredes (sem gaps entre eles)
11. Mantenha corredores estreitos (largura entre 1.0m e 1.5m)
12. Quartos devem ter pelo menos 9m² (3x3m), suítes pelo menos 12m²
13. Banheiros devem ter pelo menos 4m² (2x2m)
14. A planta deve parecer uma casa REAL com circulação lógica

## Formato de Saída (JSON)
Retorne EXATAMENTE este formato JSON:
{
  "rooms": [
    {
      "name": "string (nome do ambiente)",
      "type": "string (tipo: sala_estar|sala_jantar|cozinha|quarto|banheiro|lavabo|garagem|area_servico|area_gourmet|piscina|corredor|hall|escritorio|varanda|despensa|closet)",
      "x": number (posição X em metros, ≥ 0),
      "y": number (posição Y em metros, ≥ 0),
      "width": number (largura em metros, > 0),
      "height": number (comprimento em metros, > 0),
      "floor": number (0 = térreo, 1 = primeiro andar para sobrado)
    }
  ],
  "walls": [
    {
      "startX": number,
      "startY": number,
      "endX": number,
      "endY": number,
      "thickness": 0.15,
      "isExternal": boolean
    }
  ],
  "doors": [
    {
      "wallIndex": number (índice da parede no array walls),
      "position": number (0-1, posição ao longo da parede),
      "width": number (largura em metros),
      "type": "single|double|sliding"
    }
  ],
  "windows": [
    {
      "wallIndex": number (índice da parede no array walls),
      "position": number (0-1),
      "width": number (largura em metros),
      "height": number (altura em metros),
      "sillHeight": number (altura do peitoril em metros)
    }
  ]
}`;

  if (feedbackErrors && feedbackErrors.length > 0) {
    prompt += `\n\n## CORREÇÕES NECESSÁRIAS
A geração anterior falhou na validação. Corrija os seguintes problemas:
${feedbackErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Gere uma nova planta que NÃO tenha esses problemas.`;
  }

  return prompt;
}

function buildVariationPrompt(
  params: ProjectParams,
  existingVariations: FloorPlanData[],
  feedbackErrors?: string[],
  compact?: boolean
): string {
  const basePrompt = buildGenerationPrompt(params, feedbackErrors, compact);

  if (compact) {
    return `${basePrompt}\nGere uma variação DIFERENTE das anteriores (mude posições/proporções de pelo menos 1 ambiente).`;
  }

  const variationInfo = existingVariations.map((v, i) => {
    const roomSummary = v.rooms
      .map(r => `  - ${r.name}: (${r.x}, ${r.y}) ${r.width}×${r.height}m`)
      .join('\n');
    return `### Variação ${i + 1}\n${roomSummary}`;
  }).join('\n\n');

  return `${basePrompt}

## REQUISITO DE VARIAÇÃO
Esta é uma variação. A planta DEVE ser diferente das variações anteriores.
Pelo menos 1 ambiente deve ter posição (x, y) ou proporções (width, height) diferentes.

### Variações Existentes
${variationInfo}

Gere uma distribuição DIFERENTE mantendo os mesmos parâmetros.`;
}

function buildRequiredRoomsList(params: ProjectParams): Array<{ name: string; type: string }> {
  const rooms: Array<{ name: string; type: string }> = [];

  // Living room
  rooms.push({ name: 'Sala de Estar', type: 'sala_estar' });
  rooms.push({ name: 'Sala de Jantar', type: 'sala_jantar' });

  // Kitchen
  rooms.push({ name: 'Cozinha', type: 'cozinha' });

  // Bedrooms
  for (let i = 1; i <= params.rooms; i++) {
    rooms.push({ name: `Quarto ${i}`, type: 'quarto' });
  }

  // Bathrooms
  for (let i = 1; i <= params.bathrooms; i++) {
    rooms.push({ name: `Banheiro ${i}`, type: 'banheiro' });
  }

  // Garage
  if (params.garageSpots > 0) {
    rooms.push({ name: 'Garagem', type: 'garagem' });
  }

  // Pool
  if (params.hasPool) {
    rooms.push({ name: 'Piscina', type: 'piscina' });
  }

  // Gourmet area
  if (params.hasGourmetArea) {
    rooms.push({ name: 'Área Gourmet', type: 'area_gourmet' });
  }

  // Service area
  rooms.push({ name: 'Área de Serviço', type: 'area_servico' });

  // Corridor (for separation between social and intimate)
  rooms.push({ name: 'Corredor', type: 'corredor' });

  return rooms;
}

// === Response Parsing ===

function parseAiResponse(responseText: string): FloorPlanData | null {
  try {
    // Try to extract JSON from the response
    let jsonStr = responseText.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    if (!parsed.rooms || !Array.isArray(parsed.rooms)) {
      return null;
    }

    const id = randomUUID();

    // Transform rooms with IDs and computed areas
    const rooms: Room[] = parsed.rooms.map((r: Record<string, unknown>) => ({
      id: randomUUID(),
      name: String(r.name || ''),
      type: String(r.type || 'sala_estar'),
      x: Number(r.x) || 0,
      y: Number(r.y) || 0,
      width: Number(r.width) || 2,
      height: Number(r.height) || 2,
      area: Math.round((Number(r.width) || 2) * (Number(r.height) || 2) * 10) / 10,
      floor: Number(r.floor) || 0,
    }));

    // Transform walls with IDs
    const walls: Wall[] = (parsed.walls || []).map((w: Record<string, unknown>) => ({
      id: randomUUID(),
      startX: Number(w.startX) || 0,
      startY: Number(w.startY) || 0,
      endX: Number(w.endX) || 0,
      endY: Number(w.endY) || 0,
      thickness: Number(w.thickness) || 0.15,
      isExternal: Boolean(w.isExternal),
    }));

    // Transform doors with IDs and wall references
    const doors: Door[] = (parsed.doors || []).map((d: Record<string, unknown>) => {
      const wallIndex = Number(d.wallIndex) || 0;
      const wallId = walls[wallIndex]?.id || walls[0]?.id || randomUUID();
      return {
        id: randomUUID(),
        wallId,
        position: Math.min(1, Math.max(0, Number(d.position) || 0.5)),
        width: Number(d.width) || 0.8,
        type: (d.type as 'single' | 'double' | 'sliding') || 'single',
      };
    });

    // Transform windows with IDs and wall references
    const windows: WindowElement[] = (parsed.windows || []).map((w: Record<string, unknown>) => {
      const wallIndex = Number(w.wallIndex) || 0;
      const wallId = walls[wallIndex]?.id || walls[0]?.id || randomUUID();
      return {
        id: randomUUID(),
        wallId,
        position: Math.min(1, Math.max(0, Number(w.position) || 0.5)),
        width: Number(w.width) || 1.0,
        height: Number(w.height) || 1.2,
        sillHeight: Number(w.sillHeight) || 1.0,
      };
    });

    const totalArea = Math.round(rooms.reduce((sum, r) => sum + r.area, 0) * 100) / 100;

    return {
      id,
      totalArea,
      rooms,
      walls,
      doors,
      windows,
    };
  } catch {
    return null;
  }
}

// === Infeasibility Check ===

function checkInfeasibility(params: ProjectParams): GenerationError | null {
  const lotArea = params.lot.width * params.lot.length;

  // Count total rooms needed
  let totalRoomsNeeded = 0;

  // Bedrooms
  totalRoomsNeeded += params.rooms;
  // Bathrooms
  totalRoomsNeeded += params.bathrooms;
  // Living room + dining room + kitchen + service area + corridor
  totalRoomsNeeded += 5;
  // Garage
  if (params.garageSpots > 0) totalRoomsNeeded += 1;
  // Pool
  if (params.hasPool) totalRoomsNeeded += 1;
  // Gourmet area
  if (params.hasGourmetArea) totalRoomsNeeded += 1;

  const sumMinAreas = totalRoomsNeeded * MINIMUM_ROOM_AREA;

  if (sumMinAreas > lotArea) {
    const excess = Math.round((sumMinAreas - lotArea) * 100) / 100;
    return {
      code: 'INFEASIBLE',
      message: `Os ambientes solicitados não cabem no terreno. Área mínima necessária: ${sumMinAreas}m², área do terreno: ${lotArea}m². Excedente: ${excess}m².`,
      details: {
        sumMinAreas,
        lotArea,
        excess,
        totalRoomsNeeded,
      },
    };
  }

  return null;
}

// === Variation Distinctness Check ===

function isDistinctVariation(newPlan: FloorPlanData, existingVariations: FloorPlanData[]): boolean {
  if (existingVariations.length === 0) return true;

  for (const existing of existingVariations) {
    let hasDifference = false;

    for (const newRoom of newPlan.rooms) {
      const matchingRoom = existing.rooms.find(r => r.type === newRoom.type && r.name === newRoom.name);
      if (!matchingRoom) {
        hasDifference = true;
        break;
      }

      const positionDiff = Math.abs(newRoom.x - matchingRoom.x) > 0.5 ||
        Math.abs(newRoom.y - matchingRoom.y) > 0.5;
      const proportionDiff = Math.abs(newRoom.width - matchingRoom.width) > 0.3 ||
        Math.abs(newRoom.height - matchingRoom.height) > 0.3;

      if (positionDiff || proportionDiff) {
        hasDifference = true;
        break;
      }
    }

    if (!hasDifference) {
      return false;
    }
  }

  return true;
}

// === Main Service Functions ===

/**
 * Generates a floor plan from project parameters using AI.
 * Validates the result against constraints and retries up to 2 times with feedback.
 * Timeout: 120 seconds.
 */
export async function generate(
  params: ProjectParams,
  aiCaller?: AiCaller
): Promise<GenerationResult> {
  // Check infeasibility before calling AI
  const infeasibilityError = checkInfeasibility(params);
  if (infeasibilityError) {
    return { success: false, error: infeasibilityError };
  }

  let caller: AiCaller;
  let useCompactPrompt = false;
  try {
    if (aiCaller) {
      caller = aiCaller;
    } else {
      const provider = await getActiveAiProvider();
      useCompactPrompt = provider === 'groq';
      caller = await createDefaultAiCaller();
    }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'AI_ERROR',
        message: `Erro ao inicializar provedor de IA: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      },
    };
  }

  let feedbackErrors: string[] | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const prompt = buildGenerationPrompt(params, feedbackErrors, useCompactPrompt);

    console.log(`[GENERATE] Attempt ${attempt + 1}/${MAX_RETRIES + 1} | Compact: ${useCompactPrompt} | Prompt length: ${prompt.length} chars`);
    console.log(`[GENERATE] Prompt:\n${prompt}`);

    let responseText: string;
    try {
      responseText = await caller(prompt, GENERATION_TIMEOUT_MS);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'A geração excedeu o tempo limite de 120 segundos.',
          },
        };
      }
      return {
        success: false,
        error: {
          code: 'AI_ERROR',
          message: `Erro na comunicação com a IA: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        },
      };
    }

    const floorPlan = parseAiResponse(responseText);
    if (!floorPlan) {
      feedbackErrors = ['A resposta não está no formato JSON válido. Retorne APENAS o JSON no formato especificado.'];
      continue;
    }

    // Validate the generated plan
    const validation = validateFloorPlan(floorPlan, params);
    if (validation.valid) {
      return { success: true, data: floorPlan };
    }

    // Collect errors for retry feedback
    feedbackErrors = validation.errors.map(e => e.message);
  }

  return {
    success: false,
    error: {
      code: 'VALIDATION_FAILED',
      message: 'A planta gerada não passou na validação após todas as tentativas.',
      details: { lastErrors: feedbackErrors },
    },
  };
}

/**
 * Generates a variation of the floor plan that differs from existing variations.
 * At least 1 room must have different position or proportions.
 * Timeout: 60 seconds. Up to 2 retries if variation isn't distinct enough.
 */
export async function generateVariation(
  params: ProjectParams,
  existingVariations: FloorPlanData[],
  aiCaller?: AiCaller
): Promise<GenerationResult> {
  // Check infeasibility before calling AI
  const infeasibilityError = checkInfeasibility(params);
  if (infeasibilityError) {
    return { success: false, error: infeasibilityError };
  }

  let caller: AiCaller;
  let useCompactPrompt = false;
  try {
    if (aiCaller) {
      caller = aiCaller;
    } else {
      const provider = await getActiveAiProvider();
      useCompactPrompt = provider === 'groq';
      caller = await createDefaultAiCaller();
    }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'AI_ERROR',
        message: `Erro ao inicializar provedor de IA: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      },
    };
  }
  let feedbackErrors: string[] | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const prompt = buildVariationPrompt(params, existingVariations, feedbackErrors, useCompactPrompt);

    let responseText: string;
    try {
      responseText = await caller(prompt, VARIATION_TIMEOUT_MS);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'A geração da variação excedeu o tempo limite de 60 segundos.',
          },
        };
      }
      return {
        success: false,
        error: {
          code: 'AI_ERROR',
          message: `Erro na comunicação com a IA: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        },
      };
    }

    const floorPlan = parseAiResponse(responseText);
    if (!floorPlan) {
      feedbackErrors = ['A resposta não está no formato JSON válido. Retorne APENAS o JSON no formato especificado.'];
      continue;
    }

    // Validate the generated plan
    const validation = validateFloorPlan(floorPlan, params);
    if (!validation.valid) {
      feedbackErrors = validation.errors.map(e => e.message);
      continue;
    }

    // Check distinctness
    if (!isDistinctVariation(floorPlan, existingVariations)) {
      feedbackErrors = [
        'A variação gerada é muito similar às variações existentes. Mude significativamente a posição ou proporções de pelo menos 1 ambiente.',
      ];
      continue;
    }

    return { success: true, data: floorPlan };
  }

  return {
    success: false,
    error: {
      code: 'VALIDATION_FAILED',
      message: 'Não foi possível gerar uma variação válida e distinta após todas as tentativas.',
      details: { lastErrors: feedbackErrors },
    },
  };
}

/**
 * Validates a floor plan against project parameters using the validation service.
 * Checks: total area constraint, room completeness, minimum areas, adjacency rules.
 */
export function validateFloorPlan(plan: FloorPlanData, params: ProjectParams): ValidationResult {
  const allErrors = validateAll(plan, params.lot.width, params.lot.length);

  // Realistic minimum sizes per room type
  const MIN_SIZES: Record<string, number> = {
    sala_estar: 12,
    sala_jantar: 8,
    cozinha: 6,
    quarto: 9,
    banheiro: 3.5,
    lavabo: 2.5,
    garagem: 12,
    area_servico: 4,
    area_gourmet: 8,
    piscina: 8,
    corredor: 2,
    hall: 3,
    escritorio: 6,
    varanda: 4,
    despensa: 2,
    closet: 3,
  };

  // Check realistic minimum sizes
  for (const room of plan.rooms) {
    const minSize = MIN_SIZES[room.type] ?? 4;
    if (room.area < minSize) {
      allErrors.errors.push({
        code: 'ROOM_TOO_SMALL',
        message: `${room.name} tem ${room.area.toFixed(1)}m² mas o mínimo para ${room.type} é ${minSize}m². Aumente para pelo menos ${minSize}m².`,
        field: 'rooms',
        details: { roomId: room.id, actual: room.area, minimum: minSize },
      });
    }
  }

  // Additional check: room completeness (correct number of rooms/bathrooms)
  const quartos = plan.rooms.filter(r => r.type === 'quarto');
  const banheiros = plan.rooms.filter(r => r.type === 'banheiro');

  if (quartos.length < params.rooms) {
    allErrors.errors.push({
      code: 'MISSING_ROOMS',
      message: `A planta possui ${quartos.length} quarto(s), mas ${params.rooms} foram solicitados.`,
      field: 'rooms',
      details: { expected: params.rooms, actual: quartos.length },
    });
  }

  if (banheiros.length < params.bathrooms) {
    allErrors.errors.push({
      code: 'MISSING_BATHROOMS',
      message: `A planta possui ${banheiros.length} banheiro(s), mas ${params.bathrooms} foram solicitados.`,
      field: 'rooms',
      details: { expected: params.bathrooms, actual: banheiros.length },
    });
  }

  // Check garage if requested
  if (params.garageSpots > 0) {
    const garagem = plan.rooms.filter(r => r.type === 'garagem');
    if (garagem.length === 0) {
      allErrors.errors.push({
        code: 'MISSING_GARAGE',
        message: `A planta não possui garagem, mas ${params.garageSpots} vaga(s) foram solicitadas.`,
        field: 'rooms',
        details: { expected: params.garageSpots },
      });
    }
  }

  // Check pool if requested
  if (params.hasPool) {
    const piscina = plan.rooms.filter(r => r.type === 'piscina');
    if (piscina.length === 0) {
      allErrors.errors.push({
        code: 'MISSING_POOL',
        message: 'A planta não possui piscina, mas foi solicitada.',
        field: 'rooms',
      });
    }
  }

  // Check gourmet area if requested
  if (params.hasGourmetArea) {
    const gourmet = plan.rooms.filter(r => r.type === 'area_gourmet');
    if (gourmet.length === 0) {
      allErrors.errors.push({
        code: 'MISSING_GOURMET_AREA',
        message: 'A planta não possui área gourmet, mas foi solicitada.',
        field: 'rooms',
      });
    }
  }

  return {
    valid: allErrors.errors.length === 0,
    errors: allErrors.errors,
  };
}

// === Exported for testing ===

export {
  buildGenerationPrompt,
  buildVariationPrompt,
  buildRequiredRoomsList,
  parseAiResponse,
  checkInfeasibility,
  isDistinctVariation,
  MINIMUM_ROOM_AREA,
  GENERATION_TIMEOUT_MS,
  VARIATION_TIMEOUT_MS,
  MAX_RETRIES,
};
