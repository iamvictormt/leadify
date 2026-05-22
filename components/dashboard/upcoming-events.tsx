"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock } from "lucide-react"

const events = [
  {
    id: 1,
    title: "Reunião com Maria Santos",
    date: "30 Jan",
    time: "14:00",
  },
  {
    id: 2,
    title: "Demonstração produto",
    date: "02 Fev",
    time: "10:00",
  },
  {
    id: 3,
    title: "Fechamento João Silva",
    date: "05 Fev",
    time: "15:30",
  },
  {
    id: 4,
    title: "Proposta Empresa XYZ",
    date: "08 Fev",
    time: "09:00",
  },
]

export function UpcomingEvents() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Próximos Eventos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary"
            >
              <div className="flex-1">
                <p className="font-medium">{event.title}</p>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {event.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {event.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
