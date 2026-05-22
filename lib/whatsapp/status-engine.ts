import { prisma } from "@/lib/prisma"
import type { StatusTransitionInput } from "@/lib/whatsapp/types"

/**
 * Status Engine - Handles automatic and manual lead status progression.
 *
 * Two modes of operation:
 * 1. Automatic (targetOrder provided): find the LeadStatus with that order for the company, transition to it
 * 2. Manual (targetStatusId provided): validate the status belongs to the same company, then transition
 *
 * Guarantees:
 * - Idempotence: if lead already has the target status, returns without creating duplicate history
 * - Cross-company validation: rejects if targetStatusId belongs to a different company
 * - Atomicity: uses Prisma transaction to update lead + create history in one operation
 */
export async function progressStatus(input: StatusTransitionInput) {
  const { leadId, companyId, triggeredByUserId, targetOrder, targetStatusId } = input

  // Fetch the lead with its current status
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { status: true },
  })

  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`)
  }

  // Determine the target status
  let resolvedTargetStatusId: string

  if (targetStatusId) {
    // Manual transition: validate cross-company
    const targetStatus = await prisma.leadStatus.findUnique({
      where: { id: targetStatusId },
    })

    if (!targetStatus) {
      throw new Error(`Target status not found: ${targetStatusId}`)
    }

    if (targetStatus.companyId !== companyId) {
      throw new Error(
        `Cross-company status rejection: status ${targetStatusId} belongs to company ${targetStatus.companyId}, not ${companyId}`
      )
    }

    resolvedTargetStatusId = targetStatus.id
  } else if (targetOrder !== undefined) {
    // Automatic transition: find status by order within the company
    const targetStatus = await prisma.leadStatus.findFirst({
      where: {
        companyId,
        order: targetOrder,
      },
    })

    if (!targetStatus) {
      throw new Error(
        `No status found with order ${targetOrder} for company ${companyId}`
      )
    }

    resolvedTargetStatusId = targetStatus.id
  } else {
    throw new Error(
      "Either targetOrder or targetStatusId must be provided"
    )
  }

  // Idempotence: if lead already has the target status, return without creating history
  if (lead.statusId === resolvedTargetStatusId) {
    return lead
  }

  // Perform atomic transition: update lead status + create history record
  const updatedLead = await prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id: leadId },
      data: { statusId: resolvedTargetStatusId },
    })

    await tx.leadHistory.create({
      data: {
        leadId,
        oldStatus: lead.statusId,
        newStatus: resolvedTargetStatusId,
        userId: triggeredByUserId,
      },
    })

    return updated
  })

  return updatedLead
}
