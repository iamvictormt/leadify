"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Phone, Mail } from "lucide-react"

const leads = [
  {
    id: 1,
    name: "Maria Santos",
    email: "maria@email.com",
    phone: "(11) 99999-0001",
    source: "WhatsApp",
    status: "Novo",
    statusColor: "bg-primary text-primary-foreground",
    time: "Há 5 min",
  },
  {
    id: 2,
    name: "João Silva",
    email: "joao@email.com",
    phone: "(11) 99999-0002",
    source: "Instagram",
    status: "Em conversa",
    statusColor: "bg-[#EEFF41] text-foreground",
    time: "Há 15 min",
  },
  {
    id: 3,
    name: "Ana Oliveira",
    email: "ana@email.com",
    phone: "(11) 99999-0003",
    source: "WhatsApp",
    status: "Proposta",
    statusColor: "bg-blue-100 text-blue-700",
    time: "Há 30 min",
  },
  {
    id: 4,
    name: "Carlos Pereira",
    email: "carlos@email.com",
    phone: "(11) 99999-0004",
    source: "Site",
    status: "Novo",
    statusColor: "bg-primary text-primary-foreground",
    time: "Há 1h",
  },
  {
    id: 5,
    name: "Fernanda Lima",
    email: "fernanda@email.com",
    phone: "(11) 99999-0005",
    source: "WhatsApp",
    status: "Fechado",
    statusColor: "bg-green-100 text-green-700",
    time: "Há 2h",
  },
]

export function RecentLeads() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Leads Recentes</CardTitle>
        <a href="/dashboard/leads" className="text-sm text-primary hover:underline">
          Ver todos
        </a>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between rounded-xl bg-secondary/50 p-4 transition-colors hover:bg-secondary"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <span className="text-sm font-semibold text-primary-foreground">
                    {lead.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {lead.source}
                    </span>
                    <span>{lead.time}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={lead.statusColor}>{lead.status}</Badge>
                <div className="flex items-center gap-1">
                  <button className="rounded-lg p-2 hover:bg-background">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button className="rounded-lg p-2 hover:bg-background">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
