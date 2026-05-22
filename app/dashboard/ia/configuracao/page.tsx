"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useState } from "react"
import { ArrowRight, BriefcaseBusiness, Check, Clock3, HelpCircle, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type Step = "services" | "hours" | "faq"
type KnowledgeBaseItem = {
  id: string
  type: "SERVICE" | "BUSINESS_HOURS" | "FAQ"
  title: string
  content: string
  createdAt?: string
}

const steps = [
  { id: "services", label: "Serviços", icon: BriefcaseBusiness },
  { id: "hours", label: "Horários", icon: Clock3 },
  { id: "faq", label: "FAQ", icon: HelpCircle },
] as const

const weekDays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]

const emptyHours = Object.fromEntries(weekDays.map((day) => [day, day === "Domingo" ? "" : "08:00-18:00"]))

export default function AISetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("services")
  const [items, setItems] = useState<KnowledgeBaseItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [serviceForm, setServiceForm] = useState({ name: "", price: "" })
  const [hoursForm, setHoursForm] = useState<Record<string, string>>(emptyHours)
  const [faqForm, setFaqForm] = useState({ question: "", answer: "" })

  useEffect(() => {
    const loadItems = async () => {
      setIsLoading(true)
      setError("")

      try {
        const response = await fetch("/api/knowledge-base")

        if (response.status === 401) {
          router.push("/login")
          return
        }

        const data = await response.json()
        const loadedItems = (data.items ?? []) as KnowledgeBaseItem[]
        const seenHours = new Set<string>()
        const duplicatedHours: KnowledgeBaseItem[] = []
        const visibleItems = loadedItems.filter((item) => {
          if (item.type !== "BUSINESS_HOURS") {
            return true
          }

          const key = item.title.trim().toLowerCase()

          if (seenHours.has(key)) {
            duplicatedHours.push(item)
            return false
          }

          seenHours.add(key)
          return true
        })
        const loadedHours = visibleItems
          .filter((item) => item.type === "BUSINESS_HOURS")
          .reduce<Record<string, string>>((acc, item) => {
            acc[item.title] = item.content
            return acc
          }, { ...emptyHours })

        setItems(visibleItems)
        setHoursForm(loadedHours)

        await Promise.all(
          duplicatedHours.map((item) => fetch(`/api/knowledge-base/${item.id}`, { method: "DELETE" }).catch(() => null)),
        )
      } catch {
        setError("Não foi possível carregar a base de conhecimento.")
      } finally {
        setIsLoading(false)
      }
    }

    loadItems()
  }, [router])

  const saveItem = async (item: Omit<KnowledgeBaseItem, "id">) => {
    const existingItem = items.find(
      (currentItem) =>
        currentItem.type === item.type && currentItem.title.trim().toLowerCase() === item.title.trim().toLowerCase(),
    )
    const response = await fetch(existingItem ? `/api/knowledge-base/${existingItem.id}` : "/api/knowledge-base", {
      method: existingItem ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(data?.error ?? "Não foi possível salvar a base de conhecimento.")
    }

    setItems((currentItems) => {
      if (!existingItem) {
        return [...currentItems, data.item]
      }

      return currentItems.map((currentItem) => (currentItem.id === existingItem.id ? data.item : currentItem))
    })
  }

  const removeItem = async (item: KnowledgeBaseItem) => {
    const response = await fetch(`/api/knowledge-base/${item.id}`, { method: "DELETE" })

    if (!response.ok) {
      setError("Não foi possível remover o item.")
      return
    }

    setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))

    if (item.type === "BUSINESS_HOURS") {
      setHoursForm((current) => ({ ...current, [item.title]: "" }))
    }
  }

  const addService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!serviceForm.name.trim() || !serviceForm.price.trim()) {
      setError("Informe nome e preço do serviço.")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      await saveItem({
        type: "SERVICE",
        title: serviceForm.name.trim(),
        content: serviceForm.price.trim(),
      })
      setServiceForm({ name: "", price: "" })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível salvar o serviço.")
    } finally {
      setIsSaving(false)
    }
  }

  const saveHours = async () => {
    const filledHours = Object.entries(hoursForm).filter(([, value]) => value.trim())

    setIsSaving(true)
    setError("")

    try {
      for (const [day, value] of filledHours) {
        await saveItem({
          type: "BUSINESS_HOURS",
          title: day,
          content: value.trim(),
        })
      }

      const emptyExistingHours = items.filter(
        (item) => item.type === "BUSINESS_HOURS" && !hoursForm[item.title]?.trim(),
      )

      for (const item of emptyExistingHours) {
        await removeItem(item)
      }

      setStep("faq")
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível salvar os horários.")
    } finally {
      setIsSaving(false)
    }
  }

  const addFaq = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      setError("Informe pergunta e resposta.")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      await saveItem({
        type: "FAQ",
        title: faqForm.question.trim(),
        content: faqForm.answer.trim(),
      })
      setFaqForm({ question: "", answer: "" })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível salvar a FAQ.")
    } finally {
      setIsSaving(false)
    }
  }

  const finishSetup = () => {
    if (!items.length) {
      setError("Adicione pelo menos uma informação para ensinar a IA.")
      return
    }

    router.push("/dashboard/ia")
    router.refresh()
  }

  const currentStepIndex = steps.findIndex((item) => item.id === step)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="outline">Configuração inicial</Badge>
          <h1 className="mt-3 text-2xl font-bold text-balance">Ensine a IA sobre a sua empresa</h1>
          <p className="mt-1 text-muted-foreground">
            Cadastre serviços, horários e perguntas frequentes para gerar respostas mais precisas.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/ia">Pular por enquanto</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.7fr_0.3fr]">
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b">
            <div className="grid gap-3 sm:grid-cols-3">
              {steps.map((item, index) => {
                const Icon = item.icon
                const isActive = item.id === step
                const isDone = index < currentStepIndex

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStep(item.id)}
                    className={`flex items-center gap-3 rounded-md border px-3 py-3 text-left transition-colors ${
                      isActive ? "border-foreground bg-foreground text-background" : "border-border hover:bg-secondary"
                    }`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-md ${isActive ? "bg-background/15" : "bg-primary/40"}`}>
                      {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando base de conhecimento...</p>
            ) : (
              <>
                {step === "services" && (
                  <form onSubmit={addService} className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold">Serviços</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Exemplo: Clareamento por R$200.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="service-name" className="text-sm font-medium">
                          Nome
                        </label>
                        <Input
                          id="service-name"
                          value={serviceForm.name}
                          onChange={(event) => setServiceForm((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Clareamento"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="service-price" className="text-sm font-medium">
                          Preço
                        </label>
                        <Input
                          id="service-price"
                          value={serviceForm.price}
                          onChange={(event) => setServiceForm((current) => ({ ...current, price: event.target.value }))}
                          placeholder="R$200"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button type="submit" className="bg-foreground text-background hover:bg-foreground/90" disabled={isSaving}>
                        <Plus className="h-4 w-4" />
                        Adicionar serviço
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setStep("hours")}>
                        Continuar
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                )}

                {step === "hours" && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold">Horários</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Edite os horários existentes ou preencha novos dias.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {weekDays.map((day) => (
                        <div key={day} className="space-y-2">
                          <label htmlFor={`hours-${day}`} className="text-sm font-medium">
                            {day}
                          </label>
                          <Input
                            id={`hours-${day}`}
                            value={hoursForm[day] ?? ""}
                            onChange={(event) => setHoursForm((current) => ({ ...current, [day]: event.target.value }))}
                            placeholder="08:00-18:00"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button type="button" variant="outline" onClick={() => setStep("services")}>
                        Voltar
                      </Button>
                      <Button type="button" className="bg-foreground text-background hover:bg-foreground/90" onClick={saveHours} disabled={isSaving}>
                        {isSaving ? "Salvando..." : "Salvar horários"}
                        {!isSaving && <ArrowRight className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {step === "faq" && (
                  <form onSubmit={addFaq} className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold">FAQ</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Cadastre respostas para dúvidas recorrentes.</p>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="faq-question" className="text-sm font-medium">
                        Pergunta
                      </label>
                      <Input
                        id="faq-question"
                        value={faqForm.question}
                        onChange={(event) => setFaqForm((current) => ({ ...current, question: event.target.value }))}
                        placeholder="Aceita cartão?"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="faq-answer" className="text-sm font-medium">
                        Resposta
                      </label>
                      <Textarea
                        id="faq-answer"
                        value={faqForm.answer}
                        onChange={(event) => setFaqForm((current) => ({ ...current, answer: event.target.value }))}
                        placeholder="Sim"
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button type="button" variant="outline" onClick={() => setStep("hours")}>
                        Voltar
                      </Button>
                      <Button type="submit" variant="outline" disabled={isSaving}>
                        <Plus className="h-4 w-4" />
                        Adicionar FAQ
                      </Button>
                      <Button type="button" className="bg-foreground text-background hover:bg-foreground/90" onClick={finishSetup}>
                        Concluir
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}

            {error && <p className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Base cadastrada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length ? (
              items.map((item) => (
                <div key={item.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="outline">{typeLabel[item.type]}</Badge>
                      <p className="mt-2 font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.content}</p>
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma informação adicionada ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const typeLabel = {
  SERVICE: "Serviço",
  BUSINESS_HOURS: "Horário",
  FAQ: "FAQ",
}
