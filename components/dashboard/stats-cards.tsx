"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Clock, Target, TrendingUp, UserCheck, Users } from "lucide-react"

type StatsCardsProps = {
  conversion: number
  pending: number
  todayLeads: number
  weekLeads: number
}

export function StatsCards({ conversion, pending, todayLeads, weekLeads }: StatsCardsProps) {
  const stats = [
    {
      title: "Leads hoje",
      value: todayLeads.toString(),
      helper: "Novos contatos recebidos hoje",
      icon: Users,
      bgColor: "bg-card",
    },
    {
      title: "Leads semana",
      value: weekLeads.toString(),
      helper: "Total dos últimos 7 dias",
      icon: Target,
      bgColor: "bg-card",
    },
    {
      title: "Conversão",
      value: `${conversion}%`,
      helper: "Leads com status de fechamento",
      icon: UserCheck,
      bgColor: "bg-card",
    },
    {
      title: "Pendentes",
      value: pending.toString(),
      helper: "Leads ainda não convertidos",
      icon: Clock,
      bgColor: "bg-card",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className={`${stat.bgColor} border-0 shadow-sm`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight">{stat.value}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/50">
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span>{stat.helper}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
