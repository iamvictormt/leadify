"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useKanbanData } from "@/hooks/use-kanban-data"
import { KanbanColumn } from "@/components/kanban/kanban-column"
import { AlertCircle, Inbox, Plus, RefreshCw } from "lucide-react"

export default function KanbanPage() {
  const { columns, isLoading, error, moveLead, loadMore, refresh } = useKanbanData()

  if (isLoading) {
    return <KanbanLoadingSkeleton />
  }

  if (error) {
    return <KanbanErrorState error={error} onRetry={refresh} />
  }

  if (columns.length === 0) {
    return <KanbanEmptyState />
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-balance md:text-2xl">Kanban</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Arraste e solte para mover leads entre as etapas
          </p>
        </div>
        <Button className="gap-2 bg-foreground text-background hover:bg-foreground/90">
          <Plus className="h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {columns.map((column) => (
          <KanbanColumn
            key={column.status.id}
            status={column.status}
            leads={column.leads}
            totalCount={column.totalCount}
            hasMore={column.hasMore}
            onDrop={moveLead}
            onLoadMore={() => loadMore(column.status.id)}
          />
        ))}
      </div>
    </div>
  )
}

function KanbanLoadingSkeleton() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-2 h-5 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 sm:w-80">
            <Card className="border-0 bg-secondary/30 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-6 rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 - i }).map((_, j) => (
                  <Skeleton key={j} className="h-24 w-full rounded-xl" />
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}

function KanbanErrorState({
  error,
  onRetry,
}: {
  error: string
  onRetry: () => Promise<void>
}) {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-balance md:text-2xl">Kanban</h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Arraste e solte para mover leads entre as etapas
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-lg font-semibold">Erro ao carregar dados</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {error}
        </p>
        <Button onClick={onRetry} variant="outline" className="mt-4 gap-2">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}

function KanbanEmptyState() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-balance md:text-2xl">Kanban</h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Arraste e solte para mover leads entre as etapas
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <Inbox className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Nenhuma etapa configurada</h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Configure as etapas do pipeline para começar a usar o Kanban.
        </p>
      </div>
    </div>
  )
}
