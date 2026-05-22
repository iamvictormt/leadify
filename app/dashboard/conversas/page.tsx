"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, MessageSquare, Phone, User } from "lucide-react"

interface Conversation {
  id: string
  leadName: string
  leadInitials: string
  lastMessage: string
  channel: string
  time: string
  unread: number
  status: string
}

const conversations: Conversation[] = [
  {
    id: "1",
    leadName: "Maria Santos",
    leadInitials: "MS",
    lastMessage: "Quanto custa o clareamento dental?",
    channel: "WhatsApp",
    time: "Há 5 min",
    unread: 2,
    status: "Novo",
  },
  {
    id: "2",
    leadName: "João Silva",
    leadInitials: "JS",
    lastMessage: "Obrigado pelas informações! Vou pensar e retorno.",
    channel: "Instagram",
    time: "Há 15 min",
    unread: 0,
    status: "Em conversa",
  },
  {
    id: "3",
    leadName: "Ana Oliveira",
    leadInitials: "AO",
    lastMessage: "Perfeito! Pode me enviar a proposta por email?",
    channel: "WhatsApp",
    time: "Há 30 min",
    unread: 1,
    status: "Proposta",
  },
  {
    id: "4",
    leadName: "Carlos Pereira",
    leadInitials: "CP",
    lastMessage: "Vocês atendem aos sábados?",
    channel: "Site",
    time: "Há 1h",
    unread: 0,
    status: "Novo",
  },
  {
    id: "5",
    leadName: "Fernanda Lima",
    leadInitials: "FL",
    lastMessage: "Combinado! Nos vemos na quarta então.",
    channel: "WhatsApp",
    time: "Há 2h",
    unread: 0,
    status: "Fechado",
  },
]

interface Message {
  id: string
  sender: "customer" | "user"
  content: string
  time: string
}

const selectedConversationMessages: Message[] = [
  { id: "1", sender: "customer", content: "Olá, boa tarde!", time: "14:25" },
  { id: "2", sender: "user", content: "Olá! Como posso ajudar?", time: "14:26" },
  { id: "3", sender: "customer", content: "Quanto custa o clareamento dental?", time: "14:30" },
]

export default function ConversasPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation>(conversations[0])
  const [searchQuery, setSearchQuery] = useState("")

  const filteredConversations = conversations.filter((conv) =>
    conv.leadName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance">Conversas</h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie todas as suas conversas com leads
          </p>
        </div>
        <Button className="gap-2 bg-foreground text-background hover:bg-foreground/90">
          <Plus className="h-4 w-4" />
          Nova Conversa
        </Button>
      </div>

      <div className="grid h-[600px] gap-6 lg:grid-cols-3">
        {/* Conversations List */}
        <Card className="flex flex-col border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 bg-secondary pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-2 overflow-y-auto">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`w-full rounded-xl p-3 text-left transition-colors ${
                  selectedConversation.id === conversation.id
                    ? "bg-primary/10 border border-primary"
                    : "hover:bg-secondary"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                      <span className="text-sm font-semibold">{conversation.leadInitials}</span>
                    </div>
                    {conversation.unread > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                        {conversation.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{conversation.leadName}</p>
                      <span className="text-xs text-muted-foreground">{conversation.time}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {conversation.channel}
                      </Badge>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex flex-col border-0 shadow-sm lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <span className="text-sm font-semibold">{selectedConversation.leadInitials}</span>
                </div>
                <div>
                  <CardTitle className="text-base">{selectedConversation.leadName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.channel} • {selectedConversation.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {selectedConversationMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "customer" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      message.sender === "customer"
                        ? "bg-secondary text-foreground"
                        : "bg-foreground text-background"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="mt-1 text-right text-[10px] opacity-70">{message.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="border-t p-4">
            <div className="flex gap-3">
              <Input placeholder="Digite sua mensagem..." className="flex-1" />
              <Button className="gap-2 bg-foreground text-background hover:bg-foreground/90">
                <MessageSquare className="h-4 w-4" />
                Enviar
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
