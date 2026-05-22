import { getCurrentUser } from "@/lib/current-user"
import { subscribe } from "@/lib/whatsapp/notification-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/whatsapp/notifications
 *
 * Returns a Server-Sent Events (SSE) stream for real-time notifications.
 * The stream emits events (new_message, new_lead, ai_suggestion) scoped
 * to the authenticated user's company.
 *
 * Requirements: 8.1
 */
export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const stream = subscribe(user.companyId)

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
