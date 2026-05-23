import type { FloorPlanData, ProjectParams } from '../types';

/**
 * Generates a 3D isometric floor plan image using OpenAI DALL-E.
 * Takes the floor plan data and project params to create a detailed prompt.
 */

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

function buildImagePrompt(plan: FloorPlanData, params: ProjectParams): string {
  // Build room layout description with exact dimensions
  const roomLines = plan.rooms
    .map((r, i) => `- ${r.name}: ${r.width.toFixed(1)}m x ${r.height.toFixed(1)}m${i === 0 ? ' na frente esquerda' : ''}`)
    .join('\n');

  // Style mapping
  const styleMap: Record<string, string> = {
    moderno: 'moderna minimalista',
    classico: 'clássica tradicional',
    minimalista: 'minimalista',
    rustico: 'rústica com madeira e pedra',
    contemporaneo: 'contemporânea',
  };
  const styleDesc = styleMap[params.style] || 'moderna';

  // Property type
  const typeMap: Record<string, string> = {
    casa_terrea: 'casa térrea',
    sobrado: 'sobrado de dois andares',
    apartamento: 'apartamento',
  };
  const typeDesc = typeMap[params.propertyType] || 'casa térrea';

  // Features
  const features: string[] = [];
  if (params.hasPool) features.push('piscina nos fundos');
  if (params.hasGourmetArea) features.push('área gourmet');
  if (!params.hasPool) features.push('sem piscina');
  if (!params.hasGourmetArea) features.push('sem área gourmet');

  // Furniture descriptions per room type
  const furnitureMap: Record<string, string> = {
    sala_estar: 'sofá, rack e TV',
    sala_jantar: `mesa de jantar para ${Math.max(4, params.rooms + 2)} lugares`,
    cozinha: 'armários, bancada, pia, fogão e geladeira',
    quarto: 'cama, guarda-roupa e mesa lateral',
    banheiro: 'box, vaso e pia',
    lavabo: 'vaso e pia',
    garagem: 'carro estacionado',
    area_servico: 'tanque e máquina de lavar',
    area_gourmet: 'churrasqueira, bancada e mesa',
    piscina: 'piscina com deck',
    corredor: '',
    hall: '',
    escritorio: 'mesa, cadeira e estante',
    varanda: 'cadeiras e plantas',
    despensa: 'prateleiras',
    closet: 'cabideiro e prateleiras',
  };

  const furnitureLines = plan.rooms
    .filter(r => furnitureMap[r.type])
    .map(r => `- ${r.name}: ${furnitureMap[r.type]}`)
    .filter(line => !line.endsWith(': '))
    .join('\n');

  return `Crie uma planta baixa 3D isométrica ultra detalhada de uma ${typeDesc} ${styleDesc} brasileira em um terreno de ${params.lot.width}m x ${params.lot.length}m.
Use visão aérea em ângulo (axonometric/isometric view), com paredes cortadas para mostrar o interior completo da casa.

Layout obrigatório:
${roomLines}

Estilo:
- arquitetura ${styleDesc} brasileira
- tons neutros
- piso porcelanato claro
- madeira clara
- móveis modernos
- iluminação natural
- design compacto e realista
- ${features.join('\n- ')}

Adicionar móveis completos:
${furnitureLines}

Detalhes visuais:
- paredes externas mais espessas
- portas e janelas reais
- plantas decorativas
- calçada frontal
- rua em frente
- cotas com medidas (${params.lot.width}m x ${params.lot.length}m)
- nomes dos ambientes em português
- renderização arquitetônica realista
- alta qualidade
- iluminação suave
- ultra detailed
- photorealistic`;
}

export async function generateFloorPlanImage(
  plan: FloorPlanData,
  params: ProjectParams
): Promise<ImageGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'OPENAI_API_KEY not configured' };
  }

  const prompt = buildImagePrompt(plan, params);
  console.log('[IMAGE_GEN] Generating floor plan image...');
  console.log('[IMAGE_GEN] Prompt:', prompt.substring(0, 200) + '...');

  try {
    // Use GPT-5.5 with built-in image generation tool via Responses API
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.5-2026-04-23',
        input: prompt,
        tools: [{ type: 'image_generation', quality: 'high', size: '1536x1024' }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[IMAGE_GEN] Error:', err);
      return { success: false, error: `Erro ao gerar imagem: ${response.status}` };
    }

    const data = await response.json();

    // Extract image from response output
    const imageOutput = data.output?.find((item: { type: string }) => item.type === 'image_generation_call');

    if (imageOutput?.result) {
      const imageUrl = `data:image/png;base64,${imageOutput.result}`;
      console.log('[IMAGE_GEN] Image generated successfully');
      return { success: true, imageUrl };
    }

    // Fallback: check for other response formats
    console.error('[IMAGE_GEN] Unexpected response format:', JSON.stringify(data).substring(0, 500));
    return { success: false, error: 'Formato de resposta inesperado da API' };
  } catch (err) {
    console.error('[IMAGE_GEN] Exception:', err);
    return {
      success: false,
      error: `Erro na geração: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
    };
  }
}
