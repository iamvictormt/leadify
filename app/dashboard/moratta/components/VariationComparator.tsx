"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Check, Plus, RefreshCw, AlertCircle } from "lucide-react"
import type { FloorPlanData, Room } from "@/lib/moratta/types"

const MAX_VARIATIONS = 3

export interface MorattaVariation {
  id: string
  projectId: string
  version: number
  floorPlan: FloorPlanData
  estimate?: unknown
  threeDModel?: unknown
  createdAt: string
  updatedAt: string
}

interface VariationComparatorProps {
  projectId: string
  variations: MorattaVariation[]
  activeVariationId?: string | null
  onVariationsChange?: (variations: MorattaVariation[]) => void
  onActiveVariationChange?: (variationId: string) => void
}

export function VariationComparator({
  projectId,
  variations: initialVariations,
  activeVariationId: initialActiveId,
  onVariationsChange,
  onActiveVariationChange,
}: VariationComparatorProps) {
  const [variations, setVariations] = useState<MorattaVariation[]>(initialVariations)
  const [activeVariationId, setActiveVariationId] = useState<string | null>(
    initialActiveId ?? (initialVariations.length > 0 ? initialVariations[0].id : null)
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectVariation = useCallback(
    async (variationId: string) => {
      const previousActiveId = activeVariationId
      setActiveVariationId(variationId)
      setError(null)

      try {
        const response = await fetch(`/api/moratta/projects/${projectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeVariation: variationId }),
        })

        if (!response.ok) {
          setActiveVariationId(previousActiveId)
          const data = await response.json().catch(() => null)
          const message =
            data?.errors?.[0]?.message ?? "Erro ao selecionar variação."
          setError(message)
          return
        }

        onActiveVariationChange?.(variationId)
      } catch {
        setActiveVariationId(previousActiveId)
        setError("Erro de conexão ao selecionar variação.")
      }
    },
    [projectId, activeVariationId, onActiveVariationChange]
  )

  const handleGenerateVariation = useCallback(async () => {
    if (variations.length >= MAX_VARIATIONS) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/moratta/projects/${projectId}/generate/variation`,
        { method: "POST" }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const message =
          data?.errors?.[0]?.message ?? "Erro ao gerar variação. Tente novamente."
        setError(message)
        return
      }

      if (data?.success && data.data) {
        const newVariation: MorattaVariation = {
          id: data.data.id,
          projectId: data.data.projectId,
          version: data.data.version,
          floorPlan: data.data.floorPlan as FloorPlanData,
          estimate: data.data.estimate,
          threeDModel: data.data.threeDModel,
          createdAt: data.data.createdAt,
          updatedAt: data.data.updatedAt,
        }
        const updatedVariations = [...variations, newVariation]
        setVariations(updatedVariations)
        onVariationsChange?.(updatedVariations)
      }
    } catch {
      setError("Erro de conexão ao gerar variação.")
    } finally {
      setIsGenerating(false)
    }
  }, [projectId, variations, onVariationsChange])

  const getRoomSummary = (rooms: Room[]) => {
    return rooms.map((room) => ({
      name: room.name,
      area: room.area,
    }))
  }

  const getTotalArea = (floorPlan: FloorPlanData) => {
    return floorPlan.totalArea
  }

  const getRoomCount = (floorPlan: FloorPlanData) => {
    return floorPlan.rooms.length
  }

  return (
    <div className="max-w-full space-y-4 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Variações do Projeto</h2>
          <p className="text-sm text-muted-foreground">
            Compare até {MAX_VARIATIONS} variações lado a lado
          </p>
        </div>
        <Button
          onClick={handleGenerateVariation}
          disabled={variations.length >= MAX_VARIATIONS || isGenerating}
          className="gap-2"
          aria-label="Gerar nova variação"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              Gerando...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Gerar Nova Variação
            </>
          )}
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-destructive hover:text-destructive"
            onClick={handleGenerateVariation}
            aria-label="Tentar novamente"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {isGenerating && variations.length === 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <VariationSkeleton />
        </div>
      )}

      {variations.length === 0 && !isGenerating && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground">Nenhuma variação gerada ainda.</p>
          <Button className="mt-4" onClick={handleGenerateVariation}>
            <Plus className="mr-2 h-4 w-4" />
            Gerar Primeira Variação
          </Button>
        </div>
      )}

      {variations.length > 0 && (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Lista de variações do projeto"
        >
          {variations.map((variation) => {
            const isActive = variation.id === activeVariationId
            const roomSummary = getRoomSummary(variation.floorPlan.rooms)
            const totalArea = getTotalArea(variation.floorPlan)
            const roomCount = getRoomCount(variation.floorPlan)

            return (
              <Card
                key={variation.id}
                role="listitem"
                className={`relative transition-all ${
                  isActive
                    ? "ring-2 ring-primary shadow-md"
                    : "hover:shadow-sm"
                }`}
              >
                {isActive && (
                  <Badge
                    className="absolute right-3 top-3 gap-1"
                    variant="default"
                  >
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Principal
                  </Badge>
                )}

                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Variação {variation.version}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Summary stats */}
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{totalArea.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">m² total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{roomCount}</p>
                      <p className="text-xs text-muted-foreground">ambientes</p>
                    </div>
                  </div>

                  {/* Room list preview */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Ambientes
                    </p>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-sm" aria-label={`Ambientes da variação ${variation.version}`}>
                      {roomSummary.map((room, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between rounded px-2 py-1 odd:bg-muted/50"
                        >
                          <span className="truncate">{room.name}</span>
                          <span className="ml-2 shrink-0 text-muted-foreground">
                            {room.area.toFixed(1)} m²
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Select button */}
                  {!isActive && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSelectVariation(variation.id)}
                      aria-label={`Selecionar variação ${variation.version} como principal`}
                    >
                      Selecionar como Principal
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {/* Placeholder for generating new variation */}
          {isGenerating && variations.length < MAX_VARIATIONS && (
            <VariationSkeleton />
          )}
        </div>
      )}

      {variations.length >= MAX_VARIATIONS && (
        <p className="text-center text-sm text-muted-foreground">
          Limite máximo de {MAX_VARIATIONS} variações atingido.
        </p>
      )}
    </div>
  )
}

function VariationSkeleton() {
  return (
    <Card className="animate-pulse" role="listitem" aria-label="Carregando variação">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="text-center">
            <Skeleton className="mx-auto h-8 w-16" />
            <Skeleton className="mx-auto mt-1 h-3 w-12" />
          </div>
          <div className="text-center">
            <Skeleton className="mx-auto h-8 w-8" />
            <Skeleton className="mx-auto mt-1 h-3 w-16" />
          </div>
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  )
}
