"use client"

import { useCallback, useEffect, useState } from "react"
import { BarChart3, FolderOpen, Share2, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// === Types ===

interface MetricsData {
  totalProjects: number
  sharedProjects: number
  uniqueClients: number
}

// === Component ===

export default function MetricasPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    setUpgradeRequired(false)

    try {
      const response = await fetch("/api/moratta/metrics")

      if (response.status === 403) {
        const data = await response.json()
        const err = data.errors?.[0]
        if (err?.code === "PROFESSIONAL_REQUIRED") {
          setUpgradeRequired(true)
          return
        }
      }

      if (!response.ok) {
        throw new Error("Erro ao carregar métricas")
      }

      const data = await response.json()
      setMetrics(data.data)
    } catch {
      setError("Não foi possível carregar as métricas. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  // Upgrade required view
  if (upgradeRequired) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BarChart3 className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold">Funcionalidade Profissional</h2>
        <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
          O painel de métricas requer perfil Profissional. Faça upgrade do seu perfil
          para acessar esta funcionalidade.
        </p>
        <Button className="mt-6" asChild>
          <a href="/dashboard/moratta/perfil">Fazer Upgrade</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Métricas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão geral do uso da plataforma
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive" role="alert">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => fetchMetrics()}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border bg-muted/50"
              aria-hidden="true"
            />
          ))}
          <p className="sr-only">Carregando métricas...</p>
        </div>
      )}

      {/* Metrics cards */}
      {!loading && metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Projetos
              </CardTitle>
              <FolderOpen
                className="h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" aria-label={`${metrics.totalProjects} projetos criados`}>
                {metrics.totalProjects}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                projetos criados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Projetos Compartilhados
              </CardTitle>
              <Share2
                className="h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" aria-label={`${metrics.sharedProjects} projetos compartilhados`}>
                {metrics.sharedProjects}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                com link ativo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clientes Únicos
              </CardTitle>
              <Users
                className="h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" aria-label={`${metrics.uniqueClients} clientes com projetos`}>
                {metrics.uniqueClients}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                com pelo menos 1 projeto
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
