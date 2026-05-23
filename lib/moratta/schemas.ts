import { z } from 'zod';

export const projectParamsSchema = z.object({
  propertyType: z.enum(['casa_terrea', 'sobrado', 'apartamento']),
  lot: z.object({
    width: z.number().min(5).max(100),
    length: z.number().min(5).max(200),
  }),
  rooms: z.number().int().min(1).max(10),
  bathrooms: z.number().int().min(1).max(10),
  garageSpots: z.number().int().min(0).max(10),
  hasPool: z.boolean(),
  hasGourmetArea: z.boolean(),
  style: z.enum(['moderno', 'classico', 'minimalista', 'rustico', 'contemporaneo']),
  budget: z.number().min(50000).max(50000000),
  finishLevel: z.enum(['baixo', 'medio', 'alto']).optional().default('medio'),
});

export const roomSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum([
    'sala_estar', 'sala_jantar', 'cozinha', 'quarto',
    'banheiro', 'lavabo', 'garagem', 'area_servico',
    'area_gourmet', 'piscina', 'corredor', 'hall',
    'escritorio', 'varanda', 'despensa', 'closet',
  ]),
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(0.1),
  height: z.number().min(0.1),
  area: z.number().min(0),
  floor: z.number().int().min(0).max(2),
});

export const floorPlanSchema = z.object({
  id: z.string().uuid(),
  totalArea: z.number().min(0),
  rooms: z.array(roomSchema).min(1).max(30),
  walls: z.array(z.object({
    id: z.string().uuid(),
    startX: z.number(),
    startY: z.number(),
    endX: z.number(),
    endY: z.number(),
    thickness: z.number().positive(),
    isExternal: z.boolean(),
  })),
  doors: z.array(z.object({
    id: z.string().uuid(),
    wallId: z.string().uuid(),
    position: z.number().min(0).max(1),
    width: z.number().positive(),
    type: z.enum(['single', 'double', 'sliding']),
  })),
  windows: z.array(z.object({
    id: z.string().uuid(),
    wallId: z.string().uuid(),
    position: z.number().min(0).max(1),
    width: z.number().positive(),
    height: z.number().positive(),
    sillHeight: z.number().min(0),
  })),
});

// Inferred types from schemas
export type ProjectParamsInput = z.input<typeof projectParamsSchema>;
export type ProjectParamsOutput = z.output<typeof projectParamsSchema>;
export type RoomInput = z.input<typeof roomSchema>;
export type FloorPlanInput = z.input<typeof floorPlanSchema>;
