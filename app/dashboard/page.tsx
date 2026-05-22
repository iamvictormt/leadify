import { StatsCards } from "@/components/dashboard/stats-cards"
import { OverviewChart } from "@/components/dashboard/overview-chart"
import { RecentLeads } from "@/components/dashboard/recent-leads"
import { ConversionChart } from "@/components/dashboard/conversion-chart"
import { UpcomingEvents } from "@/components/dashboard/upcoming-events"
import { AIAssistantCard } from "@/components/dashboard/ai-assistant-card"

export default function DashboardPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-balance md:text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Visão geral da sua operação de vendas
        </p>
      </div>

      <StatsCards />

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OverviewChart />
        </div>
        <div>
          <ConversionChart />
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentLeads />
        </div>
        <div className="space-y-4 md:space-y-6">
          <UpcomingEvents />
          <AIAssistantCard />
        </div>
      </div>
    </div>
  )
}
