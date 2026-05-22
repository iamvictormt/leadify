"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const colors = ["#CCE2C8", "#303030", "#8E8F8E", "#D8D8D8"]

type ConversionChartProps = {
  data: Array<{
    name: string
    value: number
  }>
}

export function ConversionChart({ data }: ConversionChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    color: colors[index] ?? "#D8D8D8",
  }))
  const total = chartData.reduce((acc, item) => acc + item.value, 0)
  const displayData = total > 0 ? chartData : [
    { name: "WhatsApp", value: 0, color: colors[0] },
    { name: "Instagram", value: 0, color: colors[1] },
    { name: "Site", value: 0, color: colors[2] },
    { name: "Manual", value: 0, color: colors[3] },
  ]

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Origens</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <div className="relative h-[180px] w-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={displayData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {displayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-bold">{total}</span>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {displayData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="text-sm font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
