"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import type { KanbanColumn, KanbanLead, KanbanStatus } from "@/types/kanban"
import {
  applyOptimisticMove,
  groupLeadsByStatus,
  revertOptimisticMove,
} from "@/lib/kanban-utils"

const LEADS_PER_COLUMN = 50
const PATCH_TIMEOUT_MS = 10_000

export interface KanbanColumnData {
  status: KanbanStatus
  leads: KanbanLead[]
  hasMore: boolean
  totalCount: number
}

export interface KanbanData {
  columns: KanbanColumnData[]
  isLoading: boolean
  error: string | null
  moveLead: (leadId: string, toStatusId: string) => Promise<void>
  loadMore: (statusId: string) => void
  refresh: () => Promise<void>
}

function toColumnData(
  columns: KanbanColumn[],
  visibleCounts: Record<string, number>,
): KanbanColumnData[] {
  return columns.map((col) => {
    const limit = visibleCounts[col.status.id] ?? LEADS_PER_COLUMN
    return {
      status: col.status,
      leads: col.leads.slice(0, limit),
      hasMore: col.totalCount > limit,
      totalCount: col.totalCount,
    }
  })
}


export function useKanbanData(): KanbanData {
  const [columns, setColumns] = useState<KanbanColumnData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({})
  const fullColumnsRef = useRef<KanbanColumn[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  const updateDisplayedColumns = useCallback(
    (fullCols: KanbanColumn[], counts: Record<string, number>) => {
      fullColumnsRef.current = fullCols
      setColumns(toColumnData(fullCols, counts))
    },
    [],
  )

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [leadsRes, statusesRes] = await Promise.all([
        fetch("/api/leads"),
        fetch("/api/lead-statuses"),
      ])

      if (!leadsRes.ok) {
        throw new Error("Falha ao carregar leads")
      }

      if (!statusesRes.ok) {
        throw new Error("Falha ao carregar status")
      }

      const { leads } = (await leadsRes.json()) as { leads: LeadFromAPI[] }
      const { statuses } = (await statusesRes.json()) as { statuses: KanbanStatus[] }

      const kanbanLeads: KanbanLead[] = leads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        statusId: lead.statusId,
        updatedAt: lead.updatedAt,
        createdAt: lead.createdAt,
      }))

      const grouped = groupLeadsByStatus(kanbanLeads, statuses)
      // Reset visible counts on fresh fetch
      setVisibleCounts({})
      updateDisplayedColumns(grouped, {})
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar dados do Kanban"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [updateDisplayedColumns])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const moveLead = useCallback(
    async (leadId: string, toStatusId: string) => {
      // Find the lead's current column from full data
      const sourceColumn = fullColumnsRef.current.find((col) =>
        col.leads.some((lead) => lead.id === leadId),
      )

      if (!sourceColumn) return

      const fromStatusId = sourceColumn.status.id

      // Same-column drop: no-op
      if (fromStatusId === toStatusId) return

      // Apply optimistic update to full columns using pure utility functions
      const movedColumns = applyOptimisticMove(fullColumnsRef.current, leadId, fromStatusId, toStatusId)
      fullColumnsRef.current = movedColumns
      setColumns(toColumnData(movedColumns, visibleCounts))

      // Cancel any previous in-flight PATCH
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const controller = new AbortController()
      abortControllerRef.current = controller

      // Set up 10s timeout
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, PATCH_TIMEOUT_MS)

      try {
        const response = await fetch(`/api/leads/${leadId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statusId: toStatusId }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error("Falha ao atualizar status do lead")
        }
      } catch (err) {
        clearTimeout(timeoutId)

        // Revert optimistic update
        const revertedKanban = revertOptimisticMove(movedColumns, leadId, fromStatusId, toStatusId)
        fullColumnsRef.current = revertedKanban
        setColumns(toColumnData(revertedKanban, visibleCounts))

        const message =
          err instanceof Error && err.name === "AbortError"
            ? "Tempo limite excedido ao atualizar status"
            : "Erro ao mover lead. Tente novamente."

        toast.error(message, { duration: 5000 })
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null
        }
      }
    },
    [visibleCounts],
  )

  const loadMore = useCallback(
    (statusId: string) => {
      setVisibleCounts((prev) => {
        const currentLimit = prev[statusId] ?? LEADS_PER_COLUMN
        const newCounts = { ...prev, [statusId]: currentLimit + LEADS_PER_COLUMN }
        // Update displayed columns with new counts
        setColumns(toColumnData(fullColumnsRef.current, newCounts))
        return newCounts
      })
    },
    [],
  )

  const refresh = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  return {
    columns,
    isLoading,
    error,
    moveLead,
    loadMore,
    refresh,
  }
}

// Internal type for the API response shape
interface LeadFromAPI {
  id: string
  name: string
  phone: string | null
  source: string
  statusId: string
  updatedAt: string
  createdAt: string
  status: {
    id: string
    name: string
    color: string | null
    order: number
  }
  assignedTo: {
    id: string
    name: string
  } | null
}
