"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Heart, Loader2, Home, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface FavoriteProject {
  id: string
  name: string
  params: {
    propertyType: string
    lot: { width: number; length: number }
    rooms: number
    style: string
  }
  createdAt: string
}

export default function FavoritosPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<FavoriteProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Favoritos são armazenados localmente por enquanto
    // Em uma versão futura, serão persistidos no banco
    const stored = localStorage.getItem("moratta_favorites")
    if (stored) {
      try {
        setFavorites(JSON.parse(stored))
      } catch {
        setFavorites([])
      }
    }
    setLoading(false)
  }, [])

  const removeFavorite = (id: string) => {
    const updated = favorites.filter((f) => f.id !== id)
    setFavorites(updated)
    localStorage.setItem("moratta_favorites", JSON.stringify(updated))
    toast.success("Removido dos favoritos")
  }

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
        <h1 className="text-2xl font-bold">Favoritos</h1>
        <p className="text-muted-foreground">Seus projetos e inspirações salvos</p>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Heart className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Nenhum favorito ainda</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Marque projetos como favoritos para acessá-los rapidamente aqui
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/dashboard/moratta")}
          >
            Ver projetos
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((project) => (
            <div
              key={project.id}
              className="group relative rounded-lg border p-4 transition-colors hover:border-primary/50"
            >
              <button
                onClick={() => removeFavorite(project.id)}
                className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                aria-label="Remover dos favoritos"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {project.params.lot.width}m × {project.params.lot.length}m •{" "}
                    {project.params.rooms} quartos
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground capitalize">
                    {project.params.style}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full"
                onClick={() => router.push(`/dashboard/moratta/${project.id}`)}
              >
                Abrir projeto
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
