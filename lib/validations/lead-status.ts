import { z } from "zod"

export const updateLeadStatusSchema = z.object({
  statusId: z.string().uuid("statusId deve ser um UUID válido"),
})

export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>
