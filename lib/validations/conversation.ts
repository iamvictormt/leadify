import { z } from "zod"

export const channelSchema = z.enum(["WHATSAPP", "INSTAGRAM", "SITE", "MANUAL"])

export type Channel = z.infer<typeof channelSchema>

export const createConversationSchema = z.object({
  leadId: z.string().uuid("leadId deve ser um UUID válido"),
  channel: channelSchema,
})

export type CreateConversationInput = z.infer<typeof createConversationSchema>

export const createMessageSchema = z.object({
  conversationId: z.string().uuid("conversationId deve ser um UUID válido"),
  content: z
    .string()
    .trim()
    .min(1, "Conteúdo da mensagem é obrigatório")
    .max(5000, "Conteúdo deve ter no máximo 5000 caracteres"),
  senderType: z.enum(["USER", "CUSTOMER"], {
    errorMap: () => ({ message: "senderType deve ser USER ou CUSTOMER" }),
  }),
})

export type CreateMessageInput = z.infer<typeof createMessageSchema>

export const conversationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type ConversationListQuery = z.infer<typeof conversationListQuerySchema>
