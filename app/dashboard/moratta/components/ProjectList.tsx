"use client"

import { useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  Copy,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

export interface Project {
  id: string
  name: string
  status: "DRAFT" | "GENERATING" | "READY" | "ERROR"
  params: unknown
  activeVariation: string | null
  createdAt: string
  updatedAt: string
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ProjectListProps {
  projects: Project[]
  pagination: PaginationData
  loading: boolean
  onPageChange: (page: number) => void
  onRefresh: () => void
}

const STATUS_MAP: Record<Project["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Rascunho", variant: "secondary" },
  GENERATING: { label: "Gerando", variant: "outline" },
  READY: { label: "Pronto", variant: "default" },
  ERROR: { label: "Erro", variant: "destructive" },
}

export function ProjectList({
  projects,
  pagination,
  loading,
  onPageChange,
  onRefresh,
}: ProjectListProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; project: Project | null }>({
    open: false,
    project: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDuplicate(project: Project) {
    setActionLoading(project.id)
    try {
      const response = await fetch(`/api/moratta/projects/${project.id}/duplicate`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const message = errorData?.errors?.[0]?.message ?? "Erro ao duplicar projeto"
        toast.error(message)
        return
      }

      toast.success("Projeto duplicado com sucesso")
      onRefresh()
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
    } finally {
      setActionLoading(null)
    }
  }

  function handleOpenDeleteDialog(project: Project) {
    setDeleteDialog({ open: true, project })
  }

  async function handleDelete() {
    if (!deleteDialog.project) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/moratta/projects/${deleteDialog.project.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const message = errorData?.errors?.[0]?.message ?? "Erro ao excluir projeto"
        toast.error(message)
        return
      }

      toast.success("Projeto excluído com sucesso")
      setDeleteDialog({ open: false, project: null })
      onRefresh()
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
              <Skeleton className="h-6 w-[80px]" />
              <Skeleton className="h-8 w-8 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <p className="text-muted-foreground">Nenhum projeto encontrado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie seu primeiro projeto para começar
        </p>
      </div>
    )
  }

  function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }

    const pages: (number | "ellipsis")[] = [1]

    if (current > 3) {
      pages.push("ellipsis")
    }

    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (current < total - 2) {
      pages.push("ellipsis")
    }

    pages.push(total)
    return pages
  }

  return (
    <>
      <div className="space-y-3">
        {projects.map((project) => (
          <Card key={project.id} className="border-0 shadow-sm transition-colors hover:bg-muted/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium">{project.name}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Modificado em {format(new Date(project.updatedAt), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              </div>

              <Badge variant={STATUS_MAP[project.status].variant}>
                {STATUS_MAP[project.status].label}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    aria-label={`Ações do projeto ${project.name}`}
                    disabled={actionLoading === project.id}
                  >
                    {actionLoading === project.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <a href={`/dashboard/moratta/${project.id}`} aria-label={`Abrir projeto ${project.name}`}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(project)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleOpenDeleteDialog(project)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={pagination.page <= 1}
                className={`min-h-[44px] min-w-[44px] ${pagination.page <= 1 ? "pointer-events-none opacity-50" : ""}`}
                onClick={(e) => {
                  e.preventDefault()
                  if (pagination.page > 1) onPageChange(pagination.page - 1)
                }}
              />
            </PaginationItem>

            {getPageNumbers(pagination.page, pagination.totalPages).map((pageNum, idx) =>
              pageNum === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    isActive={pageNum === pagination.page}
                    className="min-h-[44px] min-w-[44px]"
                    onClick={(e) => {
                      e.preventDefault()
                      onPageChange(pageNum)
                    }}
                    aria-label={`Ir para página ${pageNum}`}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={pagination.page >= pagination.totalPages}
                className={`min-h-[44px] min-w-[44px] ${pagination.page >= pagination.totalPages ? "pointer-events-none opacity-50" : ""}`}
                onClick={(e) => {
                  e.preventDefault()
                  if (pagination.page < pagination.totalPages) onPageChange(pagination.page + 1)
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, project: open ? deleteDialog.project : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o projeto{" "}
              <strong>{deleteDialog.project?.name}</strong>? Esta ação é
              irreversível e todos os dados associados serão permanentemente
              removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
