"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { projectParamsSchema, type ProjectParamsInput } from "@/lib/moratta/schemas"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

type GenerationStatus = "idle" | "aguardando" | "processando" | "finalizando" | "success" | "error"

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  casa_terrea: "Casa Térrea",
  sobrado: "Sobrado",
  apartamento: "Apartamento",
}

const STYLE_LABELS: Record<string, string> = {
  moderno: "Moderno",
  classico: "Clássico",
  minimalista: "Minimalista",
  rustico: "Rústico",
  contemporaneo: "Contemporâneo",
}

const STATUS_LABELS: Record<string, string> = {
  aguardando: "Aguardando...",
  processando: "Processando planta...",
  finalizando: "Finalizando...",
}

const STATUS_PROGRESS: Record<string, number> = {
  aguardando: 20,
  processando: 60,
  finalizando: 90,
}

const POLLING_INTERVAL_MS = 5000
const GENERATION_TIMEOUT_MS = 120000

export function ProjectWizard() {
  const router = useRouter()
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const form = useForm<ProjectParamsInput>({
    resolver: zodResolver(projectParamsSchema),
    defaultValues: {
      propertyType: undefined,
      lot: { width: undefined, length: undefined },
      rooms: undefined,
      bathrooms: undefined,
      garageSpots: 0,
      hasPool: false,
      hasGourmetArea: false,
      style: undefined,
      budget: undefined,
    },
  })

  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const pollGenerationStatus = useCallback(
    (id: string) => {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/moratta/projects/${id}/generation-status`)
          if (!res.ok) {
            cleanup()
            setGenerationStatus("error")
            setErrorMessage("Erro ao verificar status da geração.")
            return
          }
          const data = await res.json()
          const status = (data.data?.status || data.status) as string

          if (status === "READY" || status === "ready" || status === "concluido") {
            cleanup()
            setGenerationStatus("success")
            router.push(`/dashboard/moratta/${id}`)
          } else if (status === "ERROR" || status === "error" || status === "erro") {
            cleanup()
            setGenerationStatus("error")
            setErrorMessage(data.data?.message || data.message || "Erro na geração da planta. Tente novamente.")
          } else if (status === "GENERATING" || status === "generating" || status === "processando" || status === "finalizando") {
            setGenerationStatus(data.data?.phase || data.phase || "processando")
          }
        } catch {
          cleanup()
          setGenerationStatus("error")
          setErrorMessage("Erro de conexão ao verificar status da geração.")
        }
      }, POLLING_INTERVAL_MS)

      timeoutRef.current = setTimeout(() => {
        cleanup()
        setGenerationStatus("error")
        setErrorMessage(
          "A geração excedeu o tempo limite de 120 segundos. Seus parâmetros foram preservados. Tente novamente."
        )
      }, GENERATION_TIMEOUT_MS)
    },
    [cleanup, router]
  )

  async function onSubmit(data: ProjectParamsInput) {
    setGenerationStatus("aguardando")
    setErrorMessage(null)

    try {
      // Step 1: Create the project
      const createRes = await fetch("/api/moratta/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Projeto ${new Date().toLocaleDateString("pt-BR")}`, params: data }),
      })

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => null)
        setGenerationStatus("error")
        setErrorMessage(err?.errors?.[0]?.message || "Erro ao criar o projeto.")
        return
      }

      const project = await createRes.json()
      const id = project.data?.id || project.id
      setProjectId(id)

      // Step 2: Trigger generation
      const generateRes = await fetch(`/api/moratta/projects/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!generateRes.ok) {
        const err = await generateRes.json().catch(() => null)
        setGenerationStatus("error")
        setErrorMessage(err?.errors?.[0]?.message || "Erro ao iniciar a geração da planta.")
        return
      }

      setGenerationStatus("processando")
      // Step 3: Start polling
      pollGenerationStatus(id)
    } catch {
      setGenerationStatus("error")
      setErrorMessage("Erro de conexão. Verifique sua internet e tente novamente.")
    }
  }

  function handleRetry() {
    setGenerationStatus("idle")
    setErrorMessage(null)
    if (projectId) {
      // Retry generation with existing project
      setGenerationStatus("aguardando")
      fetch(`/api/moratta/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Retry failed")
          setGenerationStatus("processando")
          pollGenerationStatus(projectId)
        })
        .catch(() => {
          setGenerationStatus("error")
          setErrorMessage("Erro ao tentar novamente. Verifique sua conexão.")
        })
    }
  }

  const isGenerating = ["aguardando", "processando", "finalizando"].includes(generationStatus)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Novo Projeto</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Progress Indicator */}
        {isGenerating && (
          <div className="mb-6 space-y-3" role="status" aria-live="polite">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">
                {STATUS_LABELS[generationStatus] || "Processando..."}
              </span>
            </div>
            <Progress value={STATUS_PROGRESS[generationStatus] || 50} />
            <p className="text-xs text-muted-foreground">
              Isso pode levar até 2 minutos. Não feche esta página.
            </p>
          </div>
        )}

        {/* Error State */}
        {generationStatus === "error" && errorMessage && (
          <div className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 p-4" role="alert">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={handleRetry}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Form */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
          >
            {/* Tipo do Imóvel */}
            <FormField
              control={form.control}
              name="propertyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo do Imóvel</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isGenerating}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dimensões do Terreno */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="lot.width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Largura do Terreno (m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={5}
                        max={100}
                        placeholder="Ex: 12.50"
                        disabled={isGenerating}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lot.length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comprimento do Terreno (m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min={5}
                        max={200}
                        placeholder="Ex: 25.00"
                        disabled={isGenerating}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Quartos, Banheiros, Garagem */}
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="rooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quartos</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        placeholder="1-10"
                        disabled={isGenerating}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banheiros</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        placeholder="1-10"
                        disabled={isGenerating}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="garageSpots"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vagas de Garagem</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        placeholder="0-10"
                        disabled={isGenerating}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value !== "" ? parseInt(e.target.value, 10) : 0)}
                        value={field.value ?? 0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Piscina e Área Gourmet */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="hasPool"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="cursor-pointer">Piscina</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isGenerating}
                        aria-label="Incluir piscina"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hasGourmetArea"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="cursor-pointer">Área Gourmet</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isGenerating}
                        aria-label="Incluir área gourmet"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Estilo Arquitetônico */}
            <FormField
              control={form.control}
              name="style"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estilo Arquitetônico</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isGenerating}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o estilo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(STYLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Orçamento */}
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orçamento Estimado (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={50000}
                      max={50000000}
                      step={1000}
                      placeholder="Ex: 500000"
                      disabled={isGenerating}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <Button
              type="submit"
              className="w-full bg-foreground text-background hover:bg-foreground/90"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando planta...
                </>
              ) : (
                "Gerar Planta"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
