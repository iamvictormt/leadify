"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Plus, Phone, User, AlertCircle, MessageCircle, Loader2, Send } from "lucide-react"
import type { ConversationListItem, ConversationDetail, MessageItem } from "@/lib/types/conversation"

function getRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return "Agora"
  if (diffMinutes < 60) return `Há ${diffMinutes} min`
  if (diffHours < 24) return `Há ${diffHours}h`
  if (diffDays === 1) return "Ontem"
  return `Há ${diffDays} dias`
}

function truncateMessage(content: string | null, maxLength = 100): string {
  if (!content) return "Sem mensagens"
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength) + "..."
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default function ConversasPage() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<ConversationListItem | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/conversations")
      if (!response.ok) {
        throw new Error("Falha ao carregar conversas")
      }
      const data = await response.json()
      setConversations(data.conversations)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de conexão")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (conversationId: string) => {
    setMessagesLoading(true)
    setMessagesError(null)
    try {
      const response = await fetch(`/api/conversations/${conversationId}`)
      if (!response.ok) {
        throw new Error("Falha ao carregar mensagens")
      }
      const data: { conversation: ConversationDetail } = await response.json()
      setMessages(data.conversation.messages)
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Erro de conexão")
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
    } else {
      setMessages([])
      setMessagesError(null)
    }
  }, [selectedConversation, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const isInputEmpty = messageInput.trim().length === 0

  const handleSendMessage = useCallback(async () => {
    if (!selectedConversation || messageInput.trim().length === 0) return

    const content = messageInput.trim()
    setSendError(null)
    setSendingMessage(true)

    // Optimistically append the message
    const optimisticMessage: MessageItem = {
      id: `temp-${Date.now()}`,
      senderType: "USER",
      content,
      aiGenerated: false,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMessage])
    setMessageInput("")

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content,
          senderType: "USER",
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Falha ao enviar mensagem")
      }

      const data: { message: { id: string; conversationId: string; content: string; senderType: string; aiGenerated: boolean; sentAt: string; createdAt: string } } = await response.json()

      // Replace optimistic message with the real one from the server
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticMessage.id
            ? {
                id: data.message.id,
                senderType: data.message.senderType,
                content: data.message.content,
                aiGenerated: data.message.aiGenerated,
                createdAt: data.message.createdAt,
              }
            : msg
        )
      )

      // Update the conversation list to reflect the new last message
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation.id
            ? { ...conv, lastMessageContent: content, updatedAt: new Date().toISOString() }
            : conv
        )
      )
    } catch (err) {
      // Remove the optimistic message on failure
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id))
      setSendError(err instanceof Error ? err.message : "Erro ao enviar mensagem")
    } finally {
      setSendingMessage(false)
    }
  }, [selectedConversation, messageInput])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isInputEmpty) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSelectConversation = (conversation: ConversationListItem) => {
    setSelectedConversation(conversation)
  }

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
            {loading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl p-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchConversations}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {!loading && !error && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma conversa encontrada
                </p>
              </div>
            )}

            {!loading && !error && filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation)}
                className={`w-full rounded-xl p-3 text-left transition-colors ${
                  selectedConversation?.id === conversation.id
                    ? "bg-primary/10 border border-primary"
                    : "hover:bg-secondary"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                      <span className="text-sm font-semibold">
                        {getInitials(conversation.leadName)}
                      </span>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{conversation.leadName}</p>
                      <span className="text-xs text-muted-foreground">
                        {getRelativeTime(conversation.updatedAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground truncate">
                      {truncateMessage(conversation.lastMessageContent)}
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
          {selectedConversation ? (
            <>
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                      <span className="text-sm font-semibold">
                        {getInitials(selectedConversation.leadName)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{selectedConversation.leadName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedConversation.channel}
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
                {messagesLoading && (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!messagesLoading && messagesError && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                    <p className="text-sm text-muted-foreground">{messagesError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchMessages(selectedConversation.id)}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                )}

                {!messagesLoading && !messagesError && messages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Nenhuma mensagem nesta conversa
                  </div>
                )}

                {!messagesLoading && !messagesError && messages.length > 0 && (
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderType === "USER" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-xl px-4 py-2 ${
                            message.senderType === "USER"
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          <p
                            className={`mt-1 text-[10px] ${
                              message.senderType === "USER"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {message.aiGenerated && " • IA"}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </CardContent>
              <div className="border-t p-4">
                {sendError && (
                  <p className="mb-2 text-sm text-destructive">{sendError}</p>
                )}
                <div className="flex gap-3">
                  <Input
                    placeholder="Digite sua mensagem..."
                    className="flex-1"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sendingMessage}
                  />
                  <Button
                    className="gap-2 bg-foreground text-background hover:bg-foreground/90"
                    onClick={handleSendMessage}
                    disabled={isInputEmpty || sendingMessage}
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Enviar
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="mx-auto h-12 w-12 mb-3" />
                <p className="text-sm">Selecione uma conversa para começar</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
