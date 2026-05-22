"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Sparkles, MessageSquare, Zap } from "lucide-react"

export function AIAssistantCard() {
  return (
    <Card className="border-0 bg-primary shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-primary-foreground">
          <Brain className="h-5 w-5" />
          IA Assistente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-primary-foreground/80">
          Use a IA para gerar respostas personalizadas e aumentar suas conversões.
        </p>
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <Sparkles className="h-4 w-4" />
            <span>487 respostas geradas este mês</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <MessageSquare className="h-4 w-4" />
            <span>13 respostas restantes hoje</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
            <Zap className="h-4 w-4" />
            <span>Taxa de aproveitamento: 92%</span>
          </div>
        </div>
        <Button className="w-full bg-foreground text-background hover:bg-foreground/90">
          Abrir IA Assistente
        </Button>
      </CardContent>
    </Card>
  )
}
