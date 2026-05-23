"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Home, AlertCircle } from "lucide-react"

import { FloorPlanCanvas } from "@/app/dashboard/moratta/components/FloorPlanCanvas"
import type { FloorPlanData, CostEstimate, ProjectParams } from "@/lib/moratta/types"

// === Types ===

interface SharedVariation {
  id: string
  version: number
  floorPlan: FloorPlanData | null
  estimate: CostEstimate | null
}

interface SharedProjectData {
  id: string
  name: string
  status: string
  params: ProjectParams
  activeVariation: SharedVariation | null
  variations: SharedVariation[]
  createdAt: string
  updatedAt: string
}

// === Component ===

export default function SharedProjectPage() {
  const params = useParams<{ token: string }>()
  const [project, setProject] = useState<SharedProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchSharedProject() {
      if (!params.token) {
        setNotFound(true)
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/moratta/shared/${params.token}`)

        if (response.status === 404) {
          setNotFound(true)
          return
        }

        if (!response.ok) {
          setNotFound(true)
          return
        }

        const data = await response.json()
        if (data.success) {
          setProject(data.data)
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchSharedProject()
  }, [params.token])

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
            aria-hidden="true"
          />
          <p className="mt-4 text-sm text-muted-foreground">
            Carregando projeto...
          </p>
        </div>
      </div>
    )
  }

  // Not found state
  if (notFound || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle
            className="mx-auto h-12 w-12 text-muted-foreground"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-xl font-semibold">Projeto não encontrado</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Este link pode ter expirado ou o compartilhamento foi desativado pelo
            proprietário do projeto.
          </p>
        </div>
      </div>
    )
  }

  const activeVariation = project.activeVariation
  const floorPlan = activeVariation?.floorPlan ?? null
  const estimate = activeVariation?.estimate ?? null
  const projectParams = project.params

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <Home className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <p className="text-xs text-muted-foreground">
              Visualização compartilhada • Somente leitura
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6">
        {/* Floor Plan */}
        {floorPlan && projectParams && (
          <section aria-labelledby="floor-plan-heading">
            <h2 id="floor-plan-heading" className="mb-3 text-lg font-semibold">
              Planta Baixa
            </h2>
            <FloorPlanCanvas
              floorPlan={floorPlan}
              lotWidth={projectParams.lot.width}
              lotLength={projectParams.lot.length}
            />
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                Área total: <strong>{floorPlan.totalArea.toFixed(1)} m²</strong>
              </span>
              <span>
                Ambientes: <strong>{floorPlan.rooms.length}</strong>
              </span>
              <span>
                Terreno: <strong>{projectParams.lot.width}m × {projectParams.lot.length}m</strong>
              </span>
            </div>
          </section>
        )}

        {/* Cost Estimate Summary */}
        {estimate && (
          <section aria-labelledby="cost-heading">
            <h2 id="cost-heading" className="mb-3 text-lg font-semibold">
              Estimativa de Custo
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Área Construída</p>
                <p className="mt-1 text-xl font-bold">
                  {estimate.totalArea.toFixed(2)} m²
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Custo por m²</p>
                <p className="mt-1 text-xl font-bold">
                  {formatCurrency(estimate.costPerSqm)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Custo Total</p>
                <p className="mt-1 text-xl font-bold">
                  {formatCurrency(estimate.totalCost)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Padrão</p>
                <p className="mt-1 text-xl font-bold capitalize">
                  {estimate.finishLevel}
                </p>
              </div>
            </div>

            {/* Materials summary */}
            {estimate.materials && estimate.materials.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium">Materiais por Categoria</h3>
                <div className="space-y-2">
                  {estimate.materials.map((category) => (
                    <div
                      key={category.name}
                      className="flex items-center justify-between rounded-md border px-4 py-2 text-sm"
                    >
                      <span className="capitalize">{category.name}</span>
                      <span className="font-medium">
                        {formatCurrency(category.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline summary */}
            {estimate.timeline && estimate.timeline.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium">Cronograma Estimado</h3>
                <div className="flex flex-wrap gap-3">
                  {estimate.timeline.map((phase) => (
                    <div
                      key={phase.name}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="capitalize">{phase.name}</span>
                      <span className="ml-2 text-muted-foreground">
                        {phase.durationWeeks} sem.
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* No data state */}
        {!floorPlan && !estimate && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            <Home className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">
              Este projeto ainda não possui uma planta gerada.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Projeto compartilhado via Moratta
      </footer>
    </div>
  )
}

// === Helpers ===

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
