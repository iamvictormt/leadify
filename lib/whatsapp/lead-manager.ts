import { prisma } from "@/lib/prisma"
import type { Lead } from "@/lib/generated/prisma/client"

export interface LeadLookupResult {
  lead: Lead
  isNew: boolean
}

/**
 * Finds an existing lead by exact phone + companyId match,
 * or creates a new one with source "WHATSAPP" and the lowest-order status.
 *
 * Uses a Prisma transaction for atomicity when creating a new lead.
 */
export async function findOrCreateLead(
  phone: string,
  companyId: string,
  profileName?: string | null
): Promise<LeadLookupResult> {
  // Look for existing lead with exact phone match within the same company
  const existingLead = await prisma.lead.findFirst({
    where: {
      phone: phone,
      companyId: companyId,
    },
  })

  if (existingLead) {
    return { lead: existingLead, isNew: false }
  }

  // No existing lead — create one inside a transaction for atomicity
  const lead = await prisma.$transaction(async (tx) => {
    // Find the LeadStatus with the lowest order for this company
    const defaultStatus = await tx.leadStatus.findFirst({
      where: { companyId },
      orderBy: { order: "asc" },
    })

    if (!defaultStatus) {
      console.error(
        `[LeadManager] No LeadStatus configured for company ${companyId}. Cannot create lead.`
      )
      throw new Error(
        `No LeadStatus configured for company ${companyId}. Please create at least one lead status before receiving WhatsApp messages.`
      )
    }

    // Determine lead name: use profileName if non-empty, otherwise "Desconhecido"
    const name =
      profileName && profileName.trim().length > 0
        ? profileName.trim()
        : "Desconhecido"

    const newLead = await tx.lead.create({
      data: {
        companyId,
        name,
        phone,
        source: "WHATSAPP",
        statusId: defaultStatus.id,
      },
    })

    return newLead
  })

  return { lead, isNew: true }
}
