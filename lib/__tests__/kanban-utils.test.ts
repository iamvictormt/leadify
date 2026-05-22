import { describe, expect, it } from "vitest"

import type { KanbanColumn, KanbanLead, KanbanStatus } from "@/types/kanban"

import {
  applyOptimisticMove,
  groupLeadsByStatus,
  revertOptimisticMove,
  sortLeadsInColumn,
} from "../kanban-utils"

// --- Helpers ---

function makeLead(overrides: Partial<KanbanLead> = {}): KanbanLead {
  return {
    id: "lead-1",
    name: "Test Lead",
    phone: null,
    source: "website",
    statusId: "status-1",
    updatedAt: "2024-01-15T10:00:00Z",
    createdAt: "2024-01-10T10:00:00Z",
    ...overrides,
  }
}

function makeStatus(overrides: Partial<KanbanStatus> = {}): KanbanStatus {
  return {
    id: "status-1",
    name: "Novo",
    color: "#3b82f6",
    order: 1,
    ...overrides,
  }
}

// --- groupLeadsByStatus ---

describe("groupLeadsByStatus", () => {
  it("returns columns ordered by status.order ascending", () => {
    const statuses: KanbanStatus[] = [
      makeStatus({ id: "s3", name: "Fechado", order: 3 }),
      makeStatus({ id: "s1", name: "Novo", order: 1 }),
      makeStatus({ id: "s2", name: "Em conversa", order: 2 }),
    ]

    const columns = groupLeadsByStatus([], statuses)

    expect(columns.map((c) => c.status.id)).toEqual(["s1", "s2", "s3"])
  })

  it("groups leads into the correct columns", () => {
    const statuses: KanbanStatus[] = [
      makeStatus({ id: "s1", order: 1 }),
      makeStatus({ id: "s2", order: 2 }),
    ]
    const leads: KanbanLead[] = [
      makeLead({ id: "l1", statusId: "s1" }),
      makeLead({ id: "l2", statusId: "s2" }),
      makeLead({ id: "l3", statusId: "s1" }),
    ]

    const columns = groupLeadsByStatus(leads, statuses)

    expect(columns[0].leads).toHaveLength(2)
    expect(columns[0].totalCount).toBe(2)
    expect(columns[1].leads).toHaveLength(1)
    expect(columns[1].totalCount).toBe(1)
  })

  it("returns empty leads array for statuses with no matching leads", () => {
    const statuses: KanbanStatus[] = [makeStatus({ id: "s1", order: 1 })]
    const columns = groupLeadsByStatus([], statuses)

    expect(columns[0].leads).toEqual([])
    expect(columns[0].totalCount).toBe(0)
  })

  it("sorts leads within each column by updatedAt desc", () => {
    const statuses: KanbanStatus[] = [makeStatus({ id: "s1", order: 1 })]
    const leads: KanbanLead[] = [
      makeLead({ id: "l1", statusId: "s1", updatedAt: "2024-01-10T00:00:00Z" }),
      makeLead({ id: "l2", statusId: "s1", updatedAt: "2024-01-15T00:00:00Z" }),
    ]

    const columns = groupLeadsByStatus(leads, statuses)

    expect(columns[0].leads[0].id).toBe("l2")
    expect(columns[0].leads[1].id).toBe("l1")
  })
})

// --- sortLeadsInColumn ---

describe("sortLeadsInColumn", () => {
  it("sorts by updatedAt descending", () => {
    const leads: KanbanLead[] = [
      makeLead({ id: "l1", updatedAt: "2024-01-10T00:00:00Z" }),
      makeLead({ id: "l2", updatedAt: "2024-01-15T00:00:00Z" }),
      makeLead({ id: "l3", updatedAt: "2024-01-12T00:00:00Z" }),
    ]

    const sorted = sortLeadsInColumn(leads)

    expect(sorted.map((l) => l.id)).toEqual(["l2", "l3", "l1"])
  })

  it("uses createdAt descending as tiebreaker when updatedAt is equal", () => {
    const leads: KanbanLead[] = [
      makeLead({ id: "l1", updatedAt: "2024-01-15T00:00:00Z", createdAt: "2024-01-01T00:00:00Z" }),
      makeLead({ id: "l2", updatedAt: "2024-01-15T00:00:00Z", createdAt: "2024-01-05T00:00:00Z" }),
    ]

    const sorted = sortLeadsInColumn(leads)

    expect(sorted[0].id).toBe("l2")
    expect(sorted[1].id).toBe("l1")
  })

  it("does not mutate the original array", () => {
    const leads: KanbanLead[] = [
      makeLead({ id: "l1", updatedAt: "2024-01-10T00:00:00Z" }),
      makeLead({ id: "l2", updatedAt: "2024-01-15T00:00:00Z" }),
    ]
    const original = [...leads]

    sortLeadsInColumn(leads)

    expect(leads).toEqual(original)
  })

  it("returns empty array for empty input", () => {
    expect(sortLeadsInColumn([])).toEqual([])
  })
})

// --- applyOptimisticMove ---

describe("applyOptimisticMove", () => {
  const baseColumns: KanbanColumn[] = [
    {
      status: makeStatus({ id: "s1", order: 1 }),
      leads: [
        makeLead({ id: "l1", statusId: "s1" }),
        makeLead({ id: "l2", statusId: "s1" }),
      ],
      totalCount: 2,
    },
    {
      status: makeStatus({ id: "s2", order: 2 }),
      leads: [makeLead({ id: "l3", statusId: "s2" })],
      totalCount: 1,
    },
  ]

  it("removes lead from source column and places at top of destination", () => {
    const result = applyOptimisticMove(baseColumns, "l1", "s1", "s2")

    expect(result[0].leads.map((l) => l.id)).toEqual(["l2"])
    expect(result[0].totalCount).toBe(1)
    expect(result[1].leads[0].id).toBe("l1")
    expect(result[1].totalCount).toBe(2)
  })

  it("updates the lead's statusId to the destination status", () => {
    const result = applyOptimisticMove(baseColumns, "l1", "s1", "s2")

    expect(result[1].leads[0].statusId).toBe("s2")
  })

  it("returns same columns when fromStatusId equals toStatusId", () => {
    const result = applyOptimisticMove(baseColumns, "l1", "s1", "s1")

    expect(result).toBe(baseColumns)
  })

  it("does not mutate the original columns", () => {
    const originalSourceCount = baseColumns[0].leads.length
    const originalDestCount = baseColumns[1].leads.length

    applyOptimisticMove(baseColumns, "l1", "s1", "s2")

    expect(baseColumns[0].leads.length).toBe(originalSourceCount)
    expect(baseColumns[1].leads.length).toBe(originalDestCount)
  })
})

// --- revertOptimisticMove ---

describe("revertOptimisticMove", () => {
  it("moves lead back from destination to source column", () => {
    const afterMove: KanbanColumn[] = [
      {
        status: makeStatus({ id: "s1", order: 1 }),
        leads: [makeLead({ id: "l2", statusId: "s1" })],
        totalCount: 1,
      },
      {
        status: makeStatus({ id: "s2", order: 2 }),
        leads: [
          makeLead({ id: "l1", statusId: "s2" }),
          makeLead({ id: "l3", statusId: "s2" }),
        ],
        totalCount: 2,
      },
    ]

    const result = revertOptimisticMove(afterMove, "l1", "s1", "s2")

    expect(result[0].leads.map((l) => l.id)).toContain("l1")
    expect(result[1].leads.map((l) => l.id)).not.toContain("l1")
  })

  it("restores the lead's statusId to the original source status", () => {
    const afterMove: KanbanColumn[] = [
      {
        status: makeStatus({ id: "s1", order: 1 }),
        leads: [],
        totalCount: 0,
      },
      {
        status: makeStatus({ id: "s2", order: 2 }),
        leads: [makeLead({ id: "l1", statusId: "s2" })],
        totalCount: 1,
      },
    ]

    const result = revertOptimisticMove(afterMove, "l1", "s1", "s2")

    const revertedLead = result[0].leads.find((l) => l.id === "l1")
    expect(revertedLead?.statusId).toBe("s1")
  })
})
