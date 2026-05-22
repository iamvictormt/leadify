import type { KanbanColumn, KanbanLead, KanbanStatus } from "@/types/kanban"

/**
 * Groups leads by their statusId into columns, ordered by status.order ascending.
 * Statuses with no leads will still appear as empty columns.
 * Leads within each column are sorted by updatedAt desc, createdAt desc.
 */
export function groupLeadsByStatus(
  leads: KanbanLead[],
  statuses: KanbanStatus[],
): KanbanColumn[] {
  const leadsByStatus = new Map<string, KanbanLead[]>()

  for (const lead of leads) {
    const existing = leadsByStatus.get(lead.statusId) ?? []
    existing.push(lead)
    leadsByStatus.set(lead.statusId, existing)
  }

  const sortedStatuses = [...statuses].sort((a, b) => a.order - b.order)

  return sortedStatuses.map((status) => {
    const columnLeads = leadsByStatus.get(status.id) ?? []
    const sorted = sortLeadsInColumn(columnLeads)
    return {
      status,
      leads: sorted,
      totalCount: sorted.length,
    }
  })
}

/**
 * Sorts leads within a column by updatedAt descending,
 * then by createdAt descending as a tiebreaker.
 */
export function sortLeadsInColumn(leads: KanbanLead[]): KanbanLead[] {
  return [...leads].sort((a, b) => {
    const updatedDiff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    if (updatedDiff !== 0) return updatedDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

/**
 * Applies an optimistic move: removes the lead from the source column
 * and places it at the top of the target column.
 * Returns the same reference if fromStatusId === toStatusId (no-op).
 */
export function applyOptimisticMove(
  columns: KanbanColumn[],
  leadId: string,
  fromStatusId: string,
  toStatusId: string,
): KanbanColumn[] {
  if (fromStatusId === toStatusId) return columns

  // First, find the lead in the source column
  const sourceCol = columns.find((col) => col.status.id === fromStatusId)
  const lead = sourceCol?.leads.find((l) => l.id === leadId)

  if (!lead) return columns

  const movedLead: KanbanLead = { ...lead, statusId: toStatusId }

  return columns.map((col) => {
    if (col.status.id === fromStatusId) {
      const filteredLeads = col.leads.filter((l) => l.id !== leadId)
      return {
        ...col,
        leads: filteredLeads,
        totalCount: filteredLeads.length,
      }
    }
    if (col.status.id === toStatusId) {
      const newLeads = [movedLead, ...col.leads]
      return {
        ...col,
        leads: newLeads,
        totalCount: newLeads.length,
      }
    }
    return col
  })
}

/**
 * Reverts an optimistic move: moves the lead back from the target column
 * to the source column (at the top).
 */
export function revertOptimisticMove(
  columns: KanbanColumn[],
  leadId: string,
  fromStatusId: string,
  toStatusId: string,
): KanbanColumn[] {
  // First, find the lead in the target column
  const targetCol = columns.find((col) => col.status.id === toStatusId)
  const lead = targetCol?.leads.find((l) => l.id === leadId)

  if (!lead) return columns

  const movedLead: KanbanLead = { ...lead, statusId: fromStatusId }

  return columns.map((col) => {
    if (col.status.id === toStatusId) {
      const filteredLeads = col.leads.filter((l) => l.id !== leadId)
      return {
        ...col,
        leads: filteredLeads,
        totalCount: filteredLeads.length,
      }
    }
    if (col.status.id === fromStatusId) {
      const newLeads = [movedLead, ...col.leads]
      return {
        ...col,
        leads: newLeads,
        totalCount: newLeads.length,
      }
    }
    return col
  })
}
