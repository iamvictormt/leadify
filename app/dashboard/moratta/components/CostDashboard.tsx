"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertTriangle,
  DollarSign,
  Ruler,
  Clock,
  Package,
  Lightbulb,
  RefreshCw,
} from "lucide-react"
import type {
  CostEstimate,
  FinishLevel,
  MaterialCategory,
  ConstructionPhase,
  CostReductionSuggestion,
} from "@/lib/moratta/types"

// === Helpers ===

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatArea(value: number): string {
  return `${value.toFixed(2)} m²`
}

const FINISH_LEVEL_LABELS: Record<FinishLevel, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
}

const FINISH_LEVEL_DESCRIPTIONS: Record<FinishLevel, string> = {
  baixo: "Materiais econômicos, acabamento funcional",
  medio: "Materiais de qualidade intermediária, bom custo-benefício",
  alto: "Materiais premium, acabamento refinado",
}

// === Component Props ===

interface CostDashboardProps {
  projectId: string
  estimate?: CostEstimate | null
}

// === Main Component ===

export function CostDashboard({ projectId, estimate: initialEstimate }: CostDashboardProps) {
  const [estimate, setEstimate] = useState<CostEstimate | null>(initialEstimate ?? null)
  const [isLoading, setIsLoading] = useState(!initialEstimate)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEstimate = useCallback(async () => {
    try {
      const response = await fetch(`/api/moratta/projects/${projectId}/estimate`)
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.errors?.[0]?.message ?? "Erro ao carregar estimativa de custo.")
      }
      const data = await response.json()
      if (data?.success && data.data) {
        setEstimate(data.data as CostEstimate)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar estimativa de custo.")
    }
  }, [projectId])

  useEffect(() => {
    if (!initialEstimate) {
      setIsLoading(true)
      fetchEstimate().finally(() => setIsLoading(false))
    }
  }, [initialEstimate, fetchEstimate])

  // Update estimate when prop changes (e.g., after floor plan edit)
  useEffect(() => {
    if (initialEstimate) {
      setEstimate(initialEstimate)
      setIsLoading(false)
    }
  }, [initialEstimate])

  const handleFinishLevelChange = useCallback(
    async (newLevel: FinishLevel) => {
      if (!estimate || newLevel === estimate.finishLevel) return

      setIsRecalculating(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/moratta/projects/${projectId}/estimate/finish-level`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ finishLevel: newLevel }),
          }
        )

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(
            data?.errors?.[0]?.message ?? "Erro ao alterar padrão de acabamento."
          )
        }

        const data = await response.json()
        if (data?.success && data.data) {
          setEstimate(data.data as CostEstimate)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao alterar padrão de acabamento.")
      } finally {
        setIsRecalculating(false)
      }
    },
    [projectId, estimate]
  )

  if (isLoading) {
    return <CostDashboardSkeleton />
  }

  if (error && !estimate) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!estimate) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <DollarSign className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-muted-foreground">
          Nenhuma estimativa de custo disponível.
        </p>
        <p className="text-sm text-muted-foreground">
          Gere uma planta baixa para calcular os custos.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-full space-y-6 overflow-x-hidden" aria-label="Painel de estimativa de custos">
      {/* Recalculating indicator */}
      {isRecalculating && (
        <div
          className="flex items-center gap-2 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          Recalculando estimativa...
        </div>
      )}

      {/* Error banner */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Over-budget alert */}
      {estimate.isOverBudget && (
        <OverBudgetAlert
          overBudgetAmount={estimate.overBudgetAmount}
          suggestions={estimate.suggestions}
        />
      )}

      {/* Summary */}
      <CostSummary estimate={estimate} />

      {/* Finish level selector */}
      <FinishLevelSelector
        currentLevel={estimate.finishLevel}
        onChange={handleFinishLevelChange}
        disabled={isRecalculating}
      />

      {/* Materials list */}
      <MaterialsList materials={estimate.materials} />

      {/* Timeline */}
      <Timeline phases={estimate.timeline} />
    </div>
  )
}

// === Sub-components ===

function CostSummary({ estimate }: { estimate: CostEstimate }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="flex items-center gap-3 pt-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Ruler className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Área Total</p>
            <p className="text-lg font-bold">{formatArea(estimate.totalArea)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 pt-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <DollarSign className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Custo Estimado</p>
            <p className="text-lg font-bold">{formatCurrency(estimate.totalCost)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 pt-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
            <DollarSign className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Custo por m²</p>
            <p className="text-lg font-bold">{formatCurrency(estimate.costPerSqm)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 pt-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <Package className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Padrão</p>
            <p className="text-lg font-bold">
              {FINISH_LEVEL_LABELS[estimate.finishLevel]}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function OverBudgetAlert({
  overBudgetAmount,
  suggestions,
}: {
  overBudgetAmount: number
  suggestions: CostReductionSuggestion[]
}) {
  return (
    <Alert variant="destructive" className="border-amber-500/50 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-900 dark:text-amber-200">
        Custo acima do orçamento
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-300">
        <p>
          O custo estimado excede o orçamento em{" "}
          <strong>{formatCurrency(overBudgetAmount)}</strong>.
        </p>
        {suggestions.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="flex items-center gap-1 font-medium">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
              Sugestões para reduzir o custo:
            </p>
            <ul className="space-y-1.5" aria-label="Sugestões de redução de custo">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="flex items-start justify-between gap-2 rounded-md bg-amber-100/50 px-3 py-2 text-sm dark:bg-amber-900/20"
                >
                  <span className="flex items-center gap-2">
                    <ImpactBadge impact={suggestion.impact} />
                    {suggestion.description}
                  </span>
                  <span className="shrink-0 font-medium text-green-700 dark:text-green-400">
                    -{formatCurrency(suggestion.savingsAmount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}

function ImpactBadge({ impact }: { impact: "low" | "medium" | "high" }) {
  const labels: Record<string, string> = {
    low: "Baixo",
    medium: "Médio",
    high: "Alto",
  }
  const variants: Record<string, "secondary" | "outline" | "destructive"> = {
    low: "secondary",
    medium: "outline",
    high: "destructive",
  }

  return (
    <Badge variant={variants[impact]} className="text-[10px] px-1.5 py-0">
      {labels[impact]}
    </Badge>
  )
}

function FinishLevelSelector({
  currentLevel,
  onChange,
  disabled,
}: {
  currentLevel: FinishLevel
  onChange: (level: FinishLevel) => void
  disabled: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Padrão de Acabamento</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={currentLevel}
          onValueChange={(value) => onChange(value as FinishLevel)}
          disabled={disabled}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          aria-label="Selecionar padrão de acabamento"
        >
          {(["baixo", "medio", "alto"] as FinishLevel[]).map((level) => (
            <div key={level} className="relative">
              <RadioGroupItem
                value={level}
                id={`finish-level-${level}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`finish-level-${level}`}
                className="flex cursor-pointer flex-col gap-1 rounded-lg border-2 border-muted p-4 transition-colors hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
              >
                <span className="font-medium">{FINISH_LEVEL_LABELS[level]}</span>
                <span className="text-xs text-muted-foreground">
                  {FINISH_LEVEL_DESCRIPTIONS[level]}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}

function MaterialsList({ materials }: { materials: MaterialCategory[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4" aria-hidden="true" />
          Lista de Materiais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {materials.map((category) => (
            <AccordionItem key={category.name} value={category.name}>
              <AccordionTrigger className="capitalize">
                <span className="flex w-full items-center justify-between pr-2">
                  <span className="capitalize">{category.name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {formatCurrency(category.subtotal)}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <table
                    className="w-full text-sm"
                    aria-label={`Materiais de ${category.name}`}
                  >
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Material</th>
                        <th className="pb-2 pr-4 font-medium text-right">Qtd</th>
                        <th className="pb-2 pr-4 font-medium">Unid</th>
                        <th className="pb-2 pr-4 font-medium text-right">Custo Unit.</th>
                        <th className="pb-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.items.map((item, index) => (
                        <tr
                          key={index}
                          className="border-b last:border-b-0"
                        >
                          <td className="py-2 pr-4">
                            <span className="flex items-center gap-2">
                              {item.name}
                              {item.marginPercent > 0 && (
                                <span
                                  className="text-[10px] text-muted-foreground"
                                  title={`Margem de variação: ±${item.marginPercent}%`}
                                >
                                  ±{item.marginPercent}%
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {item.quantity.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {item.unit}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {formatCurrency(item.unitCost)}
                          </td>
                          <td className="py-2 text-right font-medium tabular-nums">
                            {formatCurrency(item.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Total */}
        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <span className="font-medium">Total de Materiais</span>
          <span className="text-lg font-bold">
            {formatCurrency(
              materials.reduce((sum, cat) => sum + cat.subtotal, 0)
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function Timeline({ phases }: { phases: ConstructionPhase[] }) {
  const sortedPhases = [...phases].sort((a, b) => a.order - b.order)
  const totalWeeks = sortedPhases.reduce((sum, phase) => sum + phase.durationWeeks, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" aria-hidden="true" />
          Cronograma Estimado
          <Badge variant="secondary" className="ml-auto">
            {totalWeeks} semanas
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3" role="list" aria-label="Fases da construção">
          {sortedPhases.map((phase, index) => {
            const widthPercent = (phase.durationWeeks / totalWeeks) * 100

            return (
              <div key={phase.name} role="listitem" className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {index + 1}
                    </span>
                    {phase.name}
                  </span>
                  <span className="text-muted-foreground">
                    {phase.durationWeeks} {phase.durationWeeks === 1 ? "semana" : "semanas"}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${widthPercent}%` }}
                    role="progressbar"
                    aria-valuenow={phase.durationWeeks}
                    aria-valuemin={0}
                    aria-valuemax={totalWeeks}
                    aria-label={`${phase.name}: ${phase.durationWeeks} semanas de ${totalWeeks}`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// === Skeleton ===

function CostDashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Carregando estimativa de custos">
      {/* Summary skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 pt-0">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Finish level skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Materials skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>

      {/* Timeline skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
