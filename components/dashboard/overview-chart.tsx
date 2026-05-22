"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const data = [
  { name: "Jan", leads: 40, conversoes: 24 },
  { name: "Fev", leads: 30, conversoes: 13 },
  { name: "Mar", leads: 45, conversoes: 28 },
  { name: "Abr", leads: 50, conversoes: 39 },
  { name: "Mai", leads: 65, conversoes: 48 },
  { name: "Jun", leads: 55, conversoes: 38 },
  { name: "Jul", leads: 70, conversoes: 52 },
]

export function OverviewChart() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Visão geral</CardTitle>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Leads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-foreground" />
            <span className="text-muted-foreground">Conversões</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#CCE2C8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#CCE2C8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorConversoes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#303030" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#303030" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8E8F8E", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8E8F8E", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="leads"
                stroke="#CCE2C8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorLeads)"
              />
              <Area
                type="monotone"
                dataKey="conversoes"
                name="Conversões"
                stroke="#303030"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorConversoes)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
