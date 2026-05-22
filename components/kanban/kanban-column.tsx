"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { KanbanLead, KanbanStatus } from "@/types/kanban"
import { LeadCard } from "@/components/kanban/lead-card"

export interface KanbanColumnProps {
  status: KanbanStatus
  leads: KanbanLead[]
  totalCount: number
  hasMore: boolean
  onDrop: (leadId: string, targetStatusId: string) => void
  onLoadMore?: () => void
}

export function KanbanColumn({
  status,
  leads,
  totalCount,
  hasMore,
  onDrop,
  onLoadMore,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set false if we're leaving the column container itself
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const leadId = e.dataTransfer.getData("text/plain")
    if (leadId) {
      onDrop(leadId, status.id)
    }
  }

  const colorIndicator = status.color || "#9ca3af"

  return (
    <div
      className="w-72 shrink-0 sm:w-80"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Card
        className={`border-0 bg-secondary/30 shadow-sm transition-colors ${
          isDragOver ? "ring-2 ring-primary/50 bg-primary/5" : ""
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: colorIndicator }}
            />
            <CardTitle className="text-sm font-semibold">
              {status.name}
            </CardTitle>
            <Badge variant="secondary" className="ml-1">
              {totalCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {leads.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum lead neste estágio
            </p>
          ) : (
            leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))
          )}
          {hasMore && onLoadMore && (
            <button
              type="button"
              onClick={onLoadMore}
              className="w-full rounded-md py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              Carregar mais
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
