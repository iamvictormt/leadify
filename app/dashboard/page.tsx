import { redirect } from "next/navigation"

import { AIAssistantCard } from "@/components/dashboard/ai-assistant-card"
import { ConversionChart } from "@/components/dashboard/conversion-chart"
import { OverviewChart } from "@/components/dashboard/overview-chart"
import { RecentLeads } from "@/components/dashboard/recent-leads"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { UpcomingEvents } from "@/components/dashboard/upcoming-events"
import { getCurrentUser } from "@/lib/current-user"
import { getDashboardData } from "@/lib/dashboard"

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const dashboard = await getDashboardData(user.companyId)

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-balance md:text-2xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Visão rápida da sua operação de vendas
        </p>
      </div>

      <StatsCards
        conversion={dashboard.conversion}
        pending={dashboard.pending}
        todayLeads={dashboard.todayLeads}
        weekLeads={dashboard.weekLeads}
      />

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OverviewChart data={dashboard.leadsByDay} />
        </div>
        <div>
          <ConversionChart data={dashboard.origins} />
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentLeads leads={dashboard.recentLeads} />
        </div>
        <div className="space-y-4 md:space-y-6">
          <UpcomingEvents />
          <AIAssistantCard />
        </div>
      </div>
    </div>
  )
}
