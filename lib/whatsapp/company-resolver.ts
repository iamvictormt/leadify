import { prisma } from "@/lib/prisma"

/**
 * Resolves the company associated with a given WhatsApp Business Account ID.
 *
 * Looks up the WhatsAppConfig table by wabaId (unique field).
 * Returns the companyId if found, or null if the WABA ID is not recognized.
 */
export async function resolveCompanyByWabaId(
  wabaId: string
): Promise<string | null> {
  const config = await prisma.whatsAppConfig.findUnique({
    where: { wabaId },
    select: { companyId: true },
  })

  if (!config) {
    console.log(
      `[CompanyResolver] Unrecognized WABA ID: ${wabaId}. Discarding payload.`
    )
    return null
  }

  return config.companyId
}
