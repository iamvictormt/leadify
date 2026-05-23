"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProjectList, type Project } from "./components/ProjectList"

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function MorattaDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async (page: number = 1) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/moratta/projects?page=${page}&limit=20`)

      if (!response.ok) {
        throw new Error("Erro ao carregar projetos")
      }

      const data = await response.json()
      setProjects(data.data)
      setPagination(data.pagination)
    } catch {
      setError("Não foi possível carregar os projetos. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  function handlePageChange(page: number) {
    fetchProjects(page)
  }

  function handleRefresh() {
    fetchProjects(pagination.page)
  }

  return (
    <div className="max-w-full space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance">Meus Projetos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie seus projetos residenciais
          </p>
        </div>
        <Button
          className="min-h-[44px] gap-2 bg-foreground text-background hover:bg-foreground/90"
          asChild
        >
          <a href="/dashboard/moratta/novo">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo Projeto
          </a>
        </Button>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => fetchProjects()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <ProjectList
          projects={projects}
          pagination={pagination}
          loading={loading}
          onPageChange={handlePageChange}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  )
}
