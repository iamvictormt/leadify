import Groq from "groq-sdk"
import { NextResponse } from "next/server"
import { z } from "zod"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const suggestSchema = z.object({
  message: z.string().trim().min(1, "Mensagem é obrigatória"),
  conversationId: z.string().uuid().optional(),
  leadName: z.string().optional(),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  const parsed = suggestSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "Chave da API de IA não configurada. Adicione GROQ_API_KEY no .env.local" },
      { status: 500 },
    )
  }

  // RN011: IA usa apenas base cadastrada
  const knowledgeItems = await prisma.knowledgeBase.findMany({
    where: { companyId: user.companyId },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  })

  if (knowledgeItems.length === 0) {
    return NextResponse.json(
      { error: "Base de conhecimento vazia. Cadastre serviços, horários e FAQ antes de usar a IA." },
      { status: 422 },
    )
  }

  // Build context from knowledge base
  const contextSections: string[] = []

  const services = knowledgeItems.filter((item) => item.type === "SERVICE")
  const hours = knowledgeItems.filter((item) => item.type === "BUSINESS_HOURS")
  const faqs = knowledgeItems.filter((item) => item.type === "FAQ")

  if (services.length > 0) {
    contextSections.push(
      "Serviços:\n" + services.map((s) => `- ${s.title}: ${s.content}`).join("\n"),
    )
  }

  if (hours.length > 0) {
    contextSections.push(
      "Horários de atendimento:\n" + hours.map((h) => `- ${h.title}: ${h.content}`).join("\n"),
    )
  }

  if (faqs.length > 0) {
    contextSections.push(
      "Perguntas frequentes:\n" + faqs.map((f) => `- ${f.title}: ${f.content}`).join("\n"),
    )
  }

  const companyName = user.company.name
  const leadName = parsed.data.leadName || "Cliente"
  const model = "llama-3.1-8b-instant"

  const systemPrompt = `Você é um assistente de atendimento da empresa "${companyName}".
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

  try {
    const groq = new Groq({ apiKey })

    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Cliente "${leadName}" perguntou: "${parsed.data.message}"` },
      ],
      max_tokens: 300,
      temperature: 0.7,
    })

    const suggestion = completion.choices[0]?.message?.content ?? ""
    const tokensUsed = completion.usage?.total_tokens ?? 0

    // RN012: Salvar uso da IA
    await prisma.aiLog.create({
      data: {
        companyId: user.companyId,
        messageId: parsed.data.conversationId ?? null,
        tokens: tokensUsed,
        model,
      },
    })

    // RN010: IA nunca envia automaticamente — retorna sugestão para aprovação
    return NextResponse.json({
      suggestion,
      tokens: tokensUsed,
      model,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Erro ao gerar sugestão"

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
