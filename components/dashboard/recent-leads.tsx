"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, MessageSquare, Phone } from "lucide-react"

type RecentLead = {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string
  status: string
  statusColor: string | null
  createdAt: string
}

type RecentLeadsProps = {
  leads: RecentLead[]
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function relativeTime(value: string) {
  const date = new Date(value)
  const diffInMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))

  if (diffInMinutes < 1) return "Agora"
  if (diffInMinutes < 60) return `Há ${diffInMinutes} min`

  const diffInHours = Math.floor(diffInMinutes / 60)

  if (diffInHours < 24) return `Há ${diffInHours}h`

  return date.toLocaleDateString("pt-BR")
}

export function RecentLeads({ leads }: RecentLeadsProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Últimos leads</CardTitle>
        <a href="/dashboard/leads" className="text-sm text-primary hover:underline">
          Ver todos
        </a>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!leads.length && (
            <div className="rounded-xl bg-secondary/50 p-6 text-sm text-muted-foreground">
              Nenhum lead cadastrado ainda.
            </div>
          )}
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between rounded-xl bg-secondary/50 p-4 transition-colors hover:bg-secondary"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <span className="text-sm font-semibold text-primary-foreground">{initials(lead.name)}</span>
                </div>
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {lead.source}
                    </span>
                    <span>{relativeTime(lead.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-primary text-primary-foreground">{lead.status}</Badge>
                <div className="flex items-center gap-1">
                  <button className="rounded-lg p-2 hover:bg-background" aria-label={`Ligar para ${lead.name}`}>
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button className="rounded-lg p-2 hover:bg-background" aria-label={`Enviar email para ${lead.name}`}>
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
