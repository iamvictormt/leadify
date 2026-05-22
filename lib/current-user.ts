import { cookies } from "next/headers"

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value)

  if (!session) {
    return null
  }

  return prisma.user.findFirst({
    where: {
      id: session.userId,
      companyId: session.companyId,
    },
    include: {
      company: true,
    },
  })
}
