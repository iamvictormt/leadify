"use client"

import { useState } from "react"
import { Loader2, ImageIcon, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FloorPlan3DImageProps {
  projectId: string
}

export function FloorPlan3DImage({ projectId }: FloorPlan3DImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateImage = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/moratta/projects/${projectId}/floor-plan/image`, {
        method: "POST",
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.errors?.[0]?.message || "Erro ao gerar imagem")
        return
      }

      setImageUrl(data.data.imageUrl)
    } catch {
      setError("Erro de conexão ao gerar imagem")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!imageUrl) return

    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `planta-3d-${projectId}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in new tab
      window.open(imageUrl, "_blank")
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium">Gerando visualização 3D...</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Isso pode levar até 30 segundos
        </p>
      </div>
    )
  }

  if (imageUrl) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Planta 3D Isométrica</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={generateImage}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Gerar novamente
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <img
            src={imageUrl}
            alt="Planta 3D isométrica do projeto"
            className="w-full h-auto"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20">
      <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-medium">Visualização 3D da Planta</h3>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        Gere uma imagem 3D isométrica da sua planta baixa com mobília,
        texturas e dimensões — similar a um render arquitetônico profissional.
      </p>

      {error && (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      )}

      <Button onClick={generateImage} className="mt-6" size="lg">
        <ImageIcon className="mr-2 h-5 w-5" />
        Gerar Planta 3D
      </Button>
    </div>
  )
}
