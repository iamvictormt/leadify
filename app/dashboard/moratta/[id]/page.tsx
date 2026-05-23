"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, ArrowLeft, Save, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { FloorPlanData, CostEstimate, ProjectParams } from "@/lib/moratta/types"
import { FloorPlanEditor } from "../components/FloorPlanEditor"
import { CostDashboard } from "../components/CostDashboard"
import { VariationComparator, type MorattaVariation } from "../components/VariationComparator"
import { ErrorBoundary } from "../components/ErrorBoundary"

// === Types ===

interface ProjectData {
  id: string
  name: string
  status: string
  params: ProjectParams
  activeVariation: string | null
  variations: MorattaVariation[]
}

type AutoSaveStatus = "idle" | "saving" | "saved" | "error"

// === Constants ===

const AUTO_SAVE_DEBOUNCE_MS = 2000

// === Component ===

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  // Project data
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Active floor plan (from active variation)
  const [floorPlan, setFloorPlan] = useState<FloorPlanData | null>(null)

  // Cost estimate
  const [estimate, setEstimate] = useState<CostEstimate | null>(null)
  const [isRecalculatingCost, setIsRecalculatingCost] = useState(false)

  // 3D model
  const [threeDModel, setThreeDModel] = useState<ThreeDModelData | null>(null)
  const [threeDStale, setThreeDStale] = useState(false)

  // Auto-save
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle")
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestFloorPlanRef = useRef<FloorPlanData | null>(null)

  // === Fetch Project ===

  const fetchProject = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/moratta/projects/${projectId}`)
      if (!response.ok) {
        throw new Error("Erro ao carregar projeto.")
      }

      const data = await response.json()
      const projectData: ProjectData = data.data ?? data

      setProject(projectData)

      // Set active floor plan from active variation
      const activeVar = projectData.variations.find(
        (v) => v.id === projectData.activeVariation
      ) ?? projectData.variations[0]

      if (activeVar) {
        setFloorPlan(activeVar.floorPlan)
        setEstimate((activeVar.estimate as CostEstimate) ?? null)
        setThreeDModel((activeVar.threeDModel as ThreeDModelData) ?? null)
      }
    } catch {
      setError("Não foi possível carregar o projeto. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  // === Auto-save (debounced PUT after edits) ===

  const autoSave = useCallback(
    async (plan: FloorPlanData) => {
      setAutoSaveStatus("saving")
      try {
        const response = await fetch(
          `/api/moratta/projects/${projectId}/floor-plan`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(plan),
          }
        )
        if (!response.ok) {
          throw new Error("Auto-save failed")
        }
        setAutoSaveStatus("saved")
        // Reset to idle after 2s
        setTimeout(() => setAutoSaveStatus("idle"), 2000)
      } catch {
        setAutoSaveStatus("error")
      }
    },
    [projectId]
  )

  const scheduleAutoSave = useCallback(
    (plan: FloorPlanData) => {
      latestFloorPlanRef.current = plan

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }

      autoSaveTimerRef.current = setTimeout(() => {
        if (latestFloorPlanRef.current) {
          autoSave(latestFloorPlanRef.current)
        }
      }, AUTO_SAVE_DEBOUNCE_MS)
    },
    [autoSave]
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // === Floor Plan Change Handler ===

  const handleFloorPlanChange = useCallback(
    (updatedPlan: FloorPlanData) => {
      setFloorPlan(updatedPlan)

      // Mark 3D as stale (needs regeneration)
      setThreeDStale(true)

      // Trigger cost recalculation
      setIsRecalculatingCost(true)
      fetch(`/api/moratta/projects/${projectId}/estimate`)
        .then((res) => {
          if (res.ok) return res.json()
          throw new Error("Cost recalculation failed")
        })
        .then((data) => {
          if (data?.success && data.data) {
            setEstimate(data.data as CostEstimate)
          } else if (data?.data) {
            setEstimate(data.data as CostEstimate)
          }
        })
        .catch(() => {
          // Silently fail - cost dashboard will show stale data
        })
        .finally(() => setIsRecalculatingCost(false))

      // Schedule auto-save
      scheduleAutoSave(updatedPlan)
    },
    [projectId, scheduleAutoSave]
  )

  // === Regenerate Handler ===

  const handleRegenerate = useCallback(async () => {
    try {
      const res = await fetch(`/api/moratta/projects/${projectId}/generate`, {
        method: "POST",
      })
      if (res.ok) {
        // Reload project data
        fetchProject()
      }
    } catch {
      // Silently fail
    }
  }, [projectId, fetchProject])

  // === Active Variation Change Handler ===

  const handleActiveVariationChange = useCallback(
    (variationId: string) => {
      if (!project) return

      const variation = project.variations.find((v) => v.id === variationId)
      if (variation) {
        setFloorPlan(variation.floorPlan)
        setEstimate((variation.estimate as CostEstimate) ?? null)
        setThreeDModel((variation.threeDModel as ThreeDModelData) ?? null)
        setThreeDStale(false)
        setProject((prev) =>
          prev ? { ...prev, activeVariation: variationId } : prev
        )
      }
    },
    [project]
  )

  // === Variations Change Handler ===

  const handleVariationsChange = useCallback(
    (variations: MorattaVariation[]) => {
      setProject((prev) => (prev ? { ...prev, variations } : prev))
    },
    []
  )

  // === 3D Regenerate ===

  const handleRegenerate3D = useCallback(() => {
    setThreeDStale(false)
    setThreeDModel(null) // Reset to trigger generate button in ThreeDViewer
  }, [])

  // === Loading State ===

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando projeto...</p>
        </div>
      </div>
    )
  }

  // === Error State ===

  if (error || !project) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error ?? "Projeto não encontrado."}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/dashboard/moratta")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={fetchProject}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  // === Render ===

  return (
    <div className="max-w-full space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/moratta")}
            aria-label="Voltar para lista de projetos"
            className="min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              {project.params.lot.width}m × {project.params.lot.length}m •{" "}
              {project.params.rooms} quartos • {project.params.bathrooms} banheiros
            </p>
          </div>
        </div>

        {/* Auto-save status indicator */}
        <AutoSaveIndicator status={autoSaveStatus} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="editor" className="min-h-[44px]">
            Editor
          </TabsTrigger>
          <TabsTrigger value="custos" className="min-h-[44px]">
            Custos
          </TabsTrigger>
          <TabsTrigger value="variacoes" className="min-h-[44px]">
            Variações
          </TabsTrigger>
        </TabsList>

        {/* Editor Tab */}
        <TabsContent value="editor" className="mt-4">
          <ErrorBoundary sectionName="Editor">
            {floorPlan ? (
              <FloorPlanEditor
                floorPlan={floorPlan}
                projectId={projectId}
                lotWidth={project.params.lot.width}
                lotLength={project.params.lot.length}
                onChange={handleFloorPlanChange}
                onRegenerate={handleRegenerate}
              />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
                <p className="text-muted-foreground">
                  Nenhuma planta baixa disponível. Gere uma variação primeiro.
                </p>
              </div>
            )}
          </ErrorBoundary>
        </TabsContent>

        {/* Custos Tab */}
        <TabsContent value="custos" className="mt-4">
          <ErrorBoundary sectionName="Custos">
            {isRecalculatingCost && (
              <div className="mb-4 flex items-center gap-2 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Recalculando custos após edição...
              </div>
            )}
            <CostDashboard projectId={projectId} estimate={estimate} />
          </ErrorBoundary>
        </TabsContent>

        {/* Variações Tab */}
        <TabsContent value="variacoes" className="mt-4">
          <ErrorBoundary sectionName="Variações">
            <VariationComparator
              projectId={projectId}
              variations={project.variations}
              activeVariationId={project.activeVariation}
              onActiveVariationChange={handleActiveVariationChange}
              onVariationsChange={handleVariationsChange}
            />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// === Auto-save Status Indicator ===

function AutoSaveIndicator({ status }: { status: AutoSaveStatus }) {
  if (status === "idle") return null

  return (
    <div
      className="flex items-center gap-2 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      {status === "saving" && (
        <>
          <Save className="h-4 w-4 animate-pulse" aria-hidden="true" />
          <span>Salvando...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
          <span className="text-green-600">Salvo</span>
        </>
      )}
      {status === "error" && (
        <span className="text-destructive">Erro ao salvar</span>
      )}
    </div>
  )
}
