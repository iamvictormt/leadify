"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Brain, Send, Sparkles, User, Bot, Copy, Check } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant" | "customer"
  content: string
  timestamp: string
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "customer",
    content: "Olá, quanto custa o clareamento dental?",
    timestamp: "14:30",
  },
]

const knowledgeBase = [
  { type: "Serviço", title: "Clareamento Dental", content: "A partir de R$ 200" },
  { type: "Serviço", title: "Limpeza", content: "R$ 80" },
  { type: "FAQ", title: "Formas de pagamento", content: "Aceitamos PIX, cartão e parcelamento" },
  { type: "Horário", title: "Funcionamento", content: "Segunda a sexta, 08h às 18h" },
]

export default function IAPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const generateResponse = () => {
    setIsGenerating(true)
    
    // Simula geração de resposta com IA
    setTimeout(() => {
      const aiResponse: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "Olá! 😊 O clareamento dental começa em R$ 200. Temos várias opções que se adaptam às suas necessidades. Gostaria de agendar uma avaliação gratuita para conhecer melhor nossos tratamentos? Nosso horário de funcionamento é de segunda a sexta, das 08h às 18h.",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsGenerating(false)
    }, 1500)
  }

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-balance">IA Assistente</h1>
        <p className="mt-1 text-muted-foreground">
          Gere respostas personalizadas com base na sua base de conhecimento
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat Area */}
        <div className="lg:col-span-2">
          <Card className="flex h-[600px] flex-col border-0 shadow-sm">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <span className="text-sm font-semibold">MS</span>
                  </div>
                  <div>
                    <CardTitle className="text-base">Maria Santos</CardTitle>
                    <p className="text-sm text-muted-foreground">WhatsApp • Lead Novo</p>
                  </div>
                </div>
                <Badge className="bg-primary text-primary-foreground">Novo</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "customer" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`group relative max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "customer"
                          ? "bg-secondary text-foreground"
                          : message.role === "assistant"
                          ? "bg-primary text-primary-foreground"
                          : "bg-foreground text-background"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
                        {message.role === "customer" ? (
                          <>
                            <User className="h-3 w-3" />
                            Cliente
                          </>
                        ) : message.role === "assistant" ? (
                          <>
                            <Bot className="h-3 w-3" />
                            IA Sugestão
                          </>
                        ) : (
                          <>
                            <User className="h-3 w-3" />
                            Você
                          </>
                        )}
                        <span>•</span>
                        <span>{message.timestamp}</span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                      {message.role === "assistant" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -right-10 top-1/2 h-8 w-8 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => copyToClipboard(message.content, message.id)}
                        >
                          {copied === message.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-3">
                      <div className="flex items-center gap-2 text-xs text-primary-foreground/70">
                        <Bot className="h-3 w-3" />
                        IA Gerando...
                      </div>
                      <div className="mt-2 flex gap-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary-foreground/50" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary-foreground/50 [animation-delay:0.1s]" />
                        <div className="h-2 w-2 animate-bounce rounded-full bg-primary-foreground/50 [animation-delay:0.2s]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <div className="border-t p-4">
              <div className="flex gap-3">
                <Button
                  onClick={generateResponse}
                  disabled={isGenerating}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Sparkles className="h-4 w-4" />
                  Gerar Resposta
                </Button>
                <div className="relative flex-1">
                  <Textarea
                    placeholder="Digite sua resposta ou edite a sugestão da IA..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="min-h-[44px] resize-none pr-12"
                    rows={1}
                  />
                  <Button
                    onClick={handleSend}
                    size="icon"
                    className="absolute bottom-2 right-2 h-8 w-8 bg-foreground text-background hover:bg-foreground/90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Knowledge Base */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5" />
                Base de Conhecimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {knowledgeBase.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border bg-secondary/30 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.content}</p>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                Gerenciar Base
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 bg-primary shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-primary-foreground">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold">Dica</span>
              </div>
              <p className="mt-2 text-sm text-primary-foreground/80">
                A IA usa sua base de conhecimento para gerar respostas precisas. 
                Quanto mais informações você cadastrar, melhores serão as respostas!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
