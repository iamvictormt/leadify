import Groq from "groq-sdk"

import { prisma } from "@/lib/prisma"

/** Result type for AI suggestion generation */
export type AiSuggestionResult =
  | { success: true; suggestion: string }
  | { success: false; error: string }
  | { success: false; noKnowledgeBase: true }

const MODEL = "llama-3.1-8b-instant"
const MAX_TOKENS = 300

/**
 * Generates an AI response suggestion for an inbound WhatsApp message
 * using the company's knowledge base.
 *
 * - If the knowledge base is empty, returns a noKnowledgeBase indication.
 * - If the Groq API fails, returns an error indication without throwing.
 * - On success, logs token usage to the AiLog table.
 *
 * @param messageContent - The customer's message text
 * @param leadName - The lead's name (falls back to "Cliente" if empty/null/undefined)
 * @param companyId - The company ID to fetch knowledge base and log usage
 */
export async function generateWhatsAppSuggestion(
  messageContent: string,
  leadName: string | null | undefined,
  companyId: string
): Promise<AiSuggestionResult> {
  // Fetch knowledge base for the company
  const knowledgeItems = await prisma.knowledgeBase.findMany({
    where: { companyId },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  })

  // Requirement 5.3: If knowledge base is empty, skip suggestion
  if (knowledgeItems.length === 0) {
    return { success: false, noKnowledgeBase: true }
  }

  // Build context sections from knowledge base
  const contextSections: string[] = []

  const services = knowledgeItems.filter((item) => item.type === "SERVICE")
  const hours = knowledgeItems.filter((item) => item.type === "BUSINESS_HOURS")
  const faqs = knowledgeItems.filter((item) => item.type === "FAQ")

  if (services.length > 0) {
    contextSections.push(
      "Serviços:\n" + services.map((s) => `- ${s.title}: ${s.content}`).join("\n")
    )
  }

  if (hours.length > 0) {
    contextSections.push(
      "Horários de atendimento:\n" + hours.map((h) => `- ${h.title}: ${h.content}`).join("\n")
    )
  }

  if (faqs.length > 0) {
    contextSections.push(
      "Perguntas frequentes:\n" + faqs.map((f) => `- ${f.title}: ${f.content}`).join("\n")
    )
  }

  // Requirement 5.2: Use lead name or "Cliente" as fallback
  const name = leadName?.trim() || "Cliente"

  const systemPrompt = `Você é um assistente de atendimento via WhatsApp.
Sua função é sugerir respostas para mensagens de clientes.

Use APENAS as informações abaixo para responder. Não invente dados.

${contextSections.join("\n\n")}

Regras:
- Seja cordial e profissional.
- Use o nome do cliente quando disponível.
- Respostas curtas e objetivas.
- Se não souber a resposta com base nas informações acima, diga que vai verificar e retornar.
- Nunca invente preços, horários ou serviços que não estejam listados acima.
- Responda sempre em português brasileiro.`

  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return { success: false, error: "Chave da API de IA não configurada (GROQ_API_KEY)" }
  }

  try {
    const groq = new Groq({ apiKey })

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Cliente "${name}" perguntou: "${messageContent}"` },
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.7,
    })

    const suggestion = completion.choices[0]?.message?.content ?? ""
    const tokensUsed = completion.usage?.completion_tokens ?? 0

    // Requirement 5.4: Log token count, model, and companyId
    await prisma.aiLog.create({
      data: {
        companyId,
        tokens: tokensUsed,
        model: MODEL,
      },
    })

    return { success: true, suggestion }
  } catch (error: unknown) {
    // Requirement 5.5: On API error, return error indication without throwing
    const message =
      error instanceof Error ? error.message : "Erro ao gerar sugestão de IA"

    return { success: false, error: message }
  }
}
