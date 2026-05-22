"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, UserCheck, Clock, Target } from "lucide-react"

const stats = [
  {
    title: "Leads Hoje",
    value: "24",
    change: "+12%",
    trend: "up",
    icon: Users,
    bgColor: "bg-primary",
  },
  {
    title: "Leads da Semana",
    value: "156",
    change: "+8.2%",
    trend: "up",
    icon: Target,
    bgColor: "bg-[#EEFF41]",
  },
  {
    title: "Em Aberto",
    value: "43",
    change: "-3%",
    trend: "down",
    icon: Clock,
    bgColor: "bg-card",
  },
  {
    title: "Fechados",
    value: "89",
    change: "+15%",
    trend: "up",
    icon: UserCheck,
    bgColor: "bg-card",
  },
]

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className={`${stat.bgColor} border-0 shadow-sm`}
        >
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
            <div className="mt-4 flex items-center gap-1 text-sm">
              {stat.trend === "up" ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={stat.trend === "up" ? "text-green-600" : "text-red-500"}>
                {stat.change}
              </span>
              <span className="text-muted-foreground">vs semana passada</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
