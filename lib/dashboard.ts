import { prisma } from "@/lib/prisma"

const sourceLabels: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  SITE: "Site",
  MANUAL: "Manual",
}

const convertedStatusNames = ["fechado", "fechados", "convertido", "convertidos", "ganho", "ganhos", "venda"]

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function isConverted(statusName?: string) {
  if (!statusName) {
    return false
  }

  const normalizedStatus = statusName.trim().toLowerCase()

  return convertedStatusNames.some((name) => normalizedStatus.includes(name))
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function getDashboardData(companyId: string) {
  const todayStart = startOfDay(new Date())
  const tomorrowStart = addDays(todayStart, 1)
  const weekStart = addDays(todayStart, -6)
  const chartDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))

  const [todayLeads, weekLeads, totalLeads, leads, recentLeads, messagesCount] = await Promise.all([
    prisma.lead.count({
      where: {
        companyId,
        createdAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.lead.count({
      where: {
        companyId,
        createdAt: {
          gte: weekStart,
          lt: tomorrowStart,
        },
      },
    }),
    prisma.lead.count({
      where: {
        companyId,
      },
    }),
    prisma.lead.findMany({
      where: {
        companyId,
      },
      select: {
        id: true,
        source: true,
        createdAt: true,
        status: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.lead.findMany({
      where: {
        companyId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        source: true,
        createdAt: true,
        status: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    }),
    prisma.message.count({
      where: {
        conversation: {
          companyId,
        },
      },
    }),
  ])

  const convertedLeads = leads.filter((lead) => isConverted(lead.status.name)).length
  const conversion = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0
  const pending = leads.filter((lead) => !isConverted(lead.status.name)).length
  const leadsByDayMap = new Map(chartDays.map((date) => [formatDateKey(date), 0]))
  const originsMap = new Map([
    ["WhatsApp", 0],
    ["Instagram", 0],
    ["Site", 0],
    ["Manual", 0],
  ])

  for (const lead of leads) {
    const dateKey = formatDateKey(lead.createdAt)

    if (leadsByDayMap.has(dateKey)) {
      leadsByDayMap.set(dateKey, (leadsByDayMap.get(dateKey) ?? 0) + 1)
    }

    const sourceKey = lead.source.trim().toUpperCase()
    const sourceLabel = sourceLabels[sourceKey] ?? "Manual"
    originsMap.set(sourceLabel, (originsMap.get(sourceLabel) ?? 0) + 1)
  }

  return {
    todayLeads,
    weekLeads,
    conversion,
    pending,
    messages: messagesCount,
    leadsByDay: chartDays.map((date) => ({
      date: formatDateKey(date),
      label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      leads: leadsByDayMap.get(formatDateKey(date)) ?? 0,
    })),
    origins: Array.from(originsMap.entries()).map(([name, value]) => ({
      name,
      value,
    })),
    recentLeads: recentLeads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: sourceLabels[lead.source.trim().toUpperCase()] ?? "Manual",
      status: lead.status.name,
      statusColor: lead.status.color,
      createdAt: lead.createdAt.toISOString(),
    })),
  }
}
