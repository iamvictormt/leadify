"use client"

import type { KanbanLead } from "@/types/kanban"

export interface LeadCardProps {
  lead: KanbanLead
}

export function LeadCard({ lead }: LeadCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", lead.id)
    e.dataTransfer.effectAllowed = "move"
  }

  const initials = lead.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="cursor-grab rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md active:cursor-grabbing active:opacity-70"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
          <span className="text-xs font-semibold">{initials}</span>
        </div>
        <div>
          <p className="font-medium">{lead.name}</p>
          <p className="text-sm text-muted-foreground">
            {lead.phone || "Sem telefone cadastrado"}
          </p>
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{lead.source}</div>
    </div>
  )
}
