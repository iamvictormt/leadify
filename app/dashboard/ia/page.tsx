"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Bot, Brain, Check, Copy, Pencil, Plus, Send, Sparkles, Trash2, User } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Message = {
  id: string
  role: "user" | "assistant" | "customer"
  content: string
  timestamp: string
}

type KnowledgeBaseItem = {
  id: string
  type: "SERVICE" | "BUSINESS_HOURS" | "FAQ"
  title: string
  content: string
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "customer",
    content: "Olá, quanto custa o clareamento?",
    timestamp: "14:30",
  },
]

const typeLabel = {
  SERVICE: "Serviço",
  BUSINESS_HOURS: "Horário",
  FAQ: "FAQ",
}

export default function IAPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseItem[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<KnowledgeBaseItem | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadKnowledgeBase = async () => {
      setIsLoading(true)

      try {
        const response = await fetch("/api/knowledge-base")

        if (response.status === 401) {
          window.location.href = "/login"
          return
        }

        const data = await response.json()
        setKnowledgeBase(data.items ?? [])
      } catch {
        setError("Não foi possível carregar a base de conhecimento.")
      } finally {
        setIsLoading(false)
      }
    }

    loadKnowledgeBase()
  }, [])

  const generateResponse = async () => {
    const lastCustomerMessage = [...messages].reverse().find((m) => m.role === "customer")

    if (!lastCustomerMessage) return

    setIsGenerating(true)
    setError("")

    try {
      const response = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: lastCustomerMessage.content,
          leadName: "Maria Santos",
        }),
      })

      if (response.status === 401) {
        window.location.href = "/login"
        return
      }

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Erro ao gerar sugestão da IA.")
        return
      }

      const aiResponse: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.suggestion,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      }

      setMessages((current) => [...current, aiResponse])
    } catch {
      setError("Não foi possível conectar ao serviço de IA.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSend = () => {
    if (!input.trim()) return

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: input.trim(),
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      },
    ])
    setInput("")
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    window.setTimeout(() => setCopied(null), 2000)
  }

  const deleteItem = async (item: KnowledgeBaseItem) => {
    const response = await fetch(`/api/knowledge-base/${item.id}`, { method: "DELETE" })

    if (response.ok) {
      setKnowledgeBase((current) => current.filter((currentItem) => currentItem.id !== item.id))
    }
  }

  const saveEditingItem = async () => {
    if (!editingItem) return

    const response = await fetch(`/api/knowledge-base/${editingItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editingItem.title,
        content: editingItem.content,
      }),
    })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      setError(data?.error ?? "Não foi possível atualizar o item.")
      return
    }

    setKnowledgeBase((current) => current.map((item) => (item.id === editingItem.id ? data.item : item)))
    setEditingItem(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance">IA Assistente</h1>
          <p className="mt-1 text-muted-foreground">
            Gere respostas personalizadas com base nos serviços, horários e FAQ da empresa.
          </p>
        </div>
        <Button className="bg-foreground text-background hover:bg-foreground/90" asChild>
          <Link href="/dashboard/ia/configuracao">
            <Plus className="h-4 w-4" />
            Configurar base
          </Link>
        </Button>
      </div>

      {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="flex h-[620px] flex-col border-0 shadow-sm">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/40">
                    <span className="text-sm font-semibold">MS</span>
                  </div>
                  <div>
                    <CardTitle className="text-base">Maria Santos</CardTitle>
                    <p className="text-sm text-muted-foreground">WhatsApp - Lead novo</p>
                  </div>
                </div>
                <Badge className="bg-primary text-primary-foreground">Novo</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "customer" ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`group relative max-w-[80%] rounded-md px-4 py-3 ${
                        message.role === "customer"
                          ? "bg-secondary text-foreground"
                          : message.role === "assistant"
                            ? "bg-primary text-primary-foreground"
                            : "bg-foreground text-background"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
                        {message.role === "assistant" ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {message.role === "customer" ? "Cliente" : message.role === "assistant" ? "IA" : "Você"}
                        <span>{message.timestamp}</span>
                      </div>
                      <p className="text-sm leading-6">{message.content}</p>
                      {message.role === "assistant" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -right-10 top-1/2 h-8 w-8 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => copyToClipboard(message.content, message.id)}
                        >
                          {copied === message.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex justify-end">
                    <div className="rounded-md bg-primary px-4 py-3 text-sm text-primary-foreground">Gerando resposta...</div>
                  </div>
                )}
              </div>
            </CardContent>
            <div className="border-t p-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <Button onClick={generateResponse} disabled={isGenerating} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Sparkles className="h-4 w-4" />
                  Gerar resposta
                </Button>
                <div className="relative flex-1">
                  <Textarea
                    placeholder="Digite sua resposta ou edite a sugestão da IA..."
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    className="min-h-11 resize-none pr-12"
                    rows={1}
                  />
                  <Button onClick={handleSend} size="icon" className="absolute bottom-2 right-2 h-8 w-8 bg-foreground text-background hover:bg-foreground/90">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5" />
                Base de conhecimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading && <p className="text-sm text-muted-foreground">Carregando base...</p>}
              {!isLoading && !knowledgeBase.length && (
                <div className="rounded-md border border-dashed border-border p-4">
                  <p className="text-sm text-muted-foreground">A IA ainda não recebeu informações sobre a empresa.</p>
                  <Button className="mt-4 w-full" variant="outline" asChild>
                    <Link href="/dashboard/ia/configuracao">Iniciar configuração</Link>
                  </Button>
                </div>
              )}
              {knowledgeBase.map((item) => (
                <div key={item.id} className="rounded-md border border-border bg-secondary/30 p-3">
                  {editingItem?.id === item.id ? (
                    <div className="space-y-3">
                      <Input value={editingItem.title} onChange={(event) => setEditingItem({ ...editingItem, title: event.target.value })} />
                      <Textarea value={editingItem.content} onChange={(event) => setEditingItem({ ...editingItem, content: event.target.value })} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEditingItem}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {typeLabel[item.type]}
                            </Badge>
                            <span className="text-sm font-medium">{item.title}</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.content}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon-sm" variant="ghost" onClick={() => setEditingItem(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => deleteItem(item)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
