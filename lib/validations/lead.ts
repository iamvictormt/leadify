import { z } from "zod"

export const leadSourceSchema = z.enum([
  "MANUAL",
  "WHATSAPP",
  "INSTAGRAM",
  "INDICACAO",
  "SITE",
])

export type LeadSource = z.infer<typeof leadSourceSchema>

export const createLeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  phone: z
    .string()
    .trim()
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .nullish(),
  email: z
    .string()
    .trim()
    .max(255, "Email deve ter no máximo 255 caracteres")
    .refine(
      (val) => !val || /^[^@]+@[^@]+\.[^@]+$/.test(val),
      "Formato de email inválido",
    )
    .nullish(),
  source: leadSourceSchema.default("MANUAL"),
  assignedToId: z.string().uuid().nullish(),
  notes: z.string().nullish(),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>

export const updateLeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .optional(),
  phone: z
    .string()
    .trim()
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .nullish(),
  email: z
    .string()
    .trim()
    .max(255, "Email deve ter no máximo 255 caracteres")
    .refine(
      (val) => !val || /^[^@]+@[^@]+\.[^@]+$/.test(val),
      "Formato de email inválido",
    )
    .nullish(),
  source: leadSourceSchema.optional(),
  statusId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().nullish(),
  notes: z.string().nullish(),
})

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
