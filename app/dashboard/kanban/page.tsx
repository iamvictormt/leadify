"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, MoreHorizontal, Phone, MessageSquare } from "lucide-react"

interface Lead {
  id: string
  name: string
  phone: string
  source: string
  time: string
}

interface Column {
  id: string
  title: string
  color: string
  leads: Lead[]
}

const initialColumns: Column[] = [
  {
    id: "novo",
    title: "Novo",
    color: "bg-primary",
    leads: [
      { id: "1", name: "Maria Santos", phone: "(11) 99999-0001", source: "WhatsApp", time: "Há 5 min" },
      { id: "2", name: "Pedro Costa", phone: "(11) 99999-0006", source: "Instagram", time: "Há 20 min" },
      { id: "3", name: "Lucia Mendes", phone: "(11) 99999-0007", source: "WhatsApp", time: "Há 1h" },
    ],
  },
  {
    id: "em-conversa",
    title: "Em Conversa",
    color: "bg-[#EEFF41]",
    leads: [
      { id: "4", name: "João Silva", phone: "(11) 99999-0002", source: "WhatsApp", time: "Há 15 min" },
      { id: "5", name: "Roberto Alves", phone: "(11) 99999-0008", source: "Site", time: "Há 2h" },
    ],
  },
  {
    id: "proposta",
    title: "Proposta",
    color: "bg-blue-400",
    leads: [
      { id: "6", name: "Ana Oliveira", phone: "(11) 99999-0003", source: "Instagram", time: "Há 30 min" },
    ],
  },
  {
    id: "fechado",
    title: "Fechado",
    color: "bg-green-500",
    leads: [
      { id: "7", name: "Fernanda Lima", phone: "(11) 99999-0005", source: "WhatsApp", time: "Há 2h" },
      { id: "8", name: "Marcos Souza", phone: "(11) 99999-0009", source: "WhatsApp", time: "Há 3h" },
    ],
  },
  {
    id: "perdido",
    title: "Perdido",
    color: "bg-red-400",
    leads: [
      { id: "9", name: "Carlos Pereira", phone: "(11) 99999-0004", source: "Site", time: "Há 1 dia" },
    ],
  },
]

export default function KanbanPage() {
  const [columns, setColumns] = useState<Column[]>(initialColumns)
  const [draggedLead, setDraggedLead] = useState<{ lead: Lead; fromColumn: string } | null>(null)

  const handleDragStart = (lead: Lead, columnId: string) => {
    setDraggedLead({ lead, fromColumn: columnId })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (toColumnId: string) => {
    if (!draggedLead) return

    if (draggedLead.fromColumn === toColumnId) {
      setDraggedLead(null)
      return
    }

    setColumns((prevColumns) => {
      return prevColumns.map((column) => {
        if (column.id === draggedLead.fromColumn) {
          return {
            ...column,
            leads: column.leads.filter((lead) => lead.id !== draggedLead.lead.id),
          }
        }
        if (column.id === toColumnId) {
          return {
            ...column,
            leads: [...column.leads, draggedLead.lead],
          }
        }
        return column
      })
    })

    setDraggedLead(null)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-balance md:text-2xl">Kanban</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Arraste e solte para mover leads entre as etapas
          </p>
        </div>
        <Button className="gap-2 bg-foreground text-background hover:bg-foreground/90">
          <Plus className="h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {columns.map((column) => (
          <div
            key={column.id}
            className="w-72 shrink-0 sm:w-80"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            <Card className="border-0 bg-secondary/30 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${column.color}`} />
                    <CardTitle className="text-sm font-semibold">{column.title}</CardTitle>
                    <Badge variant="secondary" className="ml-1">
                      {column.leads.length}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {column.leads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => handleDragStart(lead, column.id)}
                    className="cursor-grab rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                          <span className="text-xs font-semibold">
                            {lead.name.split(" ").map((n) => n[0]).join("")}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-sm text-muted-foreground">{lead.phone}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        <span>{lead.source}</span>
                        <span>•</span>
                        <span>{lead.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar lead
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}
