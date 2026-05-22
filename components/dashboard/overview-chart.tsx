"use client"

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type OverviewChartProps = {
  data: Array<{
    label: string
    leads: number
  }>
}

export function OverviewChart({ data }: OverviewChartProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Leads por dia</CardTitle>
        <div className="flex items-center gap-2 text-sm">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <span className="text-muted-foreground">Leads</span>
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
              </defs>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8E8F8E", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8E8F8E", fontSize: 12 }} allowDecimals={false} />
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
                name="Leads"
                stroke="#CCE2C8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorLeads)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
