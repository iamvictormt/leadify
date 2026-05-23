"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  FileText,
  Cuboid,
  PencilRuler,
  Image,
  FolderOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface LibraryItem {
  id: string
  projectId: string
  projectName: string
  type: "planta" | "fachada" | "modelo3d" | "pdf"
  createdAt: string
}

export default function BibliotecaPage() {
  const router = useRouter()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLibrary() {
      try {
        // Busca todos os projetos e extrai os itens da biblioteca
        const res = await fetch("/api/moratta/projects?limit=50")
        if (res.ok) {
          const data = await res.json()
          const projects = data.data ?? []

          // Gera itens de biblioteca a partir dos projetos existentes
          const libraryItems: LibraryItem[] = []
          for (const project of projects) {
            if (project.status === "READY") {
              libraryItems.push({
                id: `${project.id}-planta`,
                projectId: project.id,
                projectName: project.name,
                type: "planta",
                createdAt: project.createdAt,
              })
              libraryItems.push({
                id: `${project.id}-modelo3d`,
                projectId: project.id,
                projectName: project.name,
                type: "modelo3d",
                createdAt: project.createdAt,
              })
            }
          }
          setItems(libraryItems)
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }

    fetchLibrary()
  }, [])

  const getIcon = (type: LibraryItem["type"]) => {
    switch (type) {
      case "planta":
        return PencilRuler
      case "fachada":
        return Image
      case "modelo3d":
        return Cuboid
      case "pdf":
        return FileText
    }
  }

  const getLabel = (type: LibraryItem["type"]) => {
    switch (type) {
      case "planta":
        return "Planta Baixa"
      case "fachada":
        return "Fachada"
      case "modelo3d":
        return "Modelo 3D"
      case "pdf":
        return "PDF"
    }
  }

  const filterByType = (type: LibraryItem["type"]) =>
    items.filter((item) => item.type === type)

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Biblioteca</h1>
        <p className="text-muted-foreground">
          Todas as suas plantas, fachadas e modelos salvos
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Biblioteca vazia</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie projetos para que plantas e modelos apareçam aqui
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/dashboard/moratta/novo")}
          >
            Criar projeto
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="todos">
          <TabsList>
            <TabsTrigger value="todos">Todos ({items.length})</TabsTrigger>
            <TabsTrigger value="plantas">
              Plantas ({filterByType("planta").length})
            </TabsTrigger>
            <TabsTrigger value="modelos3d">
              3D ({filterByType("modelo3d").length})
            </TabsTrigger>
            <TabsTrigger value="fachadas">
              Fachadas ({filterByType("fachada").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todos" className="mt-4">
            <LibraryGrid
              items={items}
              getIcon={getIcon}
              getLabel={getLabel}
              onOpen={(item) =>
                router.push(`/dashboard/moratta/${item.projectId}`)
              }
            />
          </TabsContent>

          <TabsContent value="plantas" className="mt-4">
            <LibraryGrid
              items={filterByType("planta")}
              getIcon={getIcon}
              getLabel={getLabel}
              onOpen={(item) =>
                router.push(`/dashboard/moratta/${item.projectId}`)
              }
            />
          </TabsContent>

          <TabsContent value="modelos3d" className="mt-4">
            <LibraryGrid
              items={filterByType("modelo3d")}
              getIcon={getIcon}
              getLabel={getLabel}
              onOpen={(item) =>
                router.push(`/dashboard/moratta/${item.projectId}`)
              }
            />
          </TabsContent>

          <TabsContent value="fachadas" className="mt-4">
            <LibraryGrid
              items={filterByType("fachada")}
              getIcon={getIcon}
              getLabel={getLabel}
              onOpen={(item) =>
                router.push(`/dashboard/moratta/${item.projectId}`)
              }
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function LibraryGrid({
  items,
  getIcon,
  getLabel,
  onOpen,
}: {
  items: LibraryItem[]
  getIcon: (type: LibraryItem["type"]) => React.ComponentType<{ className?: string }>
  getLabel: (type: LibraryItem["type"]) => string
  onOpen: (item: LibraryItem) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = getIcon(item.type)
        return (
          <button
            key={item.id}
            onClick={() => onOpen(item)}
            className="flex flex-col items-center gap-3 rounded-lg border p-6 text-center transition-colors hover:border-primary/50 hover:bg-accent/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{item.projectName}</p>
              <p className="text-xs text-muted-foreground">{getLabel(item.type)}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </button>
        )
      })}
    </div>
  )
}
