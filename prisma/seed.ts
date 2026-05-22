import { config } from "dotenv"
config({ path: ".env.local" })

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../lib/generated/prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Find all companies that don't have any LeadStatus
  const companies = await prisma.company.findMany({
    where: {
      statuses: {
        none: {},
      },
    },
  })

  const defaultStatuses = [
    { name: "Novo", order: 1, color: "#3b82f6" },
    { name: "Contatado", order: 2, color: "#f59e0b" },
    { name: "Qualificado", order: 3, color: "#8b5cf6" },
    { name: "Proposta", order: 4, color: "#06b6d4" },
    { name: "Fechado", order: 5, color: "#22c55e" },
    { name: "Perdido", order: 6, color: "#ef4444" },
  ]

  for (const company of companies) {
    console.log(`Criando statuses para empresa: ${company.name} (${company.id})`)
    await prisma.leadStatus.createMany({
      data: defaultStatuses.map((s) => ({
        ...s,
        companyId: company.id,
      })),
    })
  }

  console.log(`Seed concluído. ${companies.length} empresa(s) atualizada(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
