"use client"

import { useEffect, useState } from "react"
import { Moon, Sun, Globe, Bell, Palette, Cpu, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export default function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme()
  const [notifications, setNotifications] = useState({
    email: true,
    projectUpdates: true,
    marketing: false,
  })

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false)
  const [aiProvider, setAiProvider] = useState<"gemini" | "groq" | "openai">("gemini")
  const [loadingAdmin, setLoadingAdmin] = useState(true)
  const [savingProvider, setSavingProvider] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/moratta/admin/check")
        if (res.ok) {
          const data = await res.json()
          setIsAdmin(data.data?.isAdmin === true)

          if (data.data?.isAdmin) {
            // Fetch current settings
            const settingsRes = await fetch("/api/moratta/admin/settings")
            if (settingsRes.ok) {
              const settingsData = await settingsRes.json()
              setAiProvider(settingsData.data?.aiProvider ?? "gemini")
            }
          }
        }
      } catch {
        // Not admin or error
      } finally {
        setLoadingAdmin(false)
      }
    }

    checkAdmin()
  }, [])

  const handleSave = () => {
    toast.success("Configurações salvas com sucesso")
  }

  const handleProviderChange = async (provider: "gemini" | "groq" | "openai") => {
    setSavingProvider(true)
    try {
      const res = await fetch("/api/moratta/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiProvider: provider }),
      })

      if (res.ok) {
        setAiProvider(provider)
        const names: Record<string, string> = {
          gemini: "Google Gemini",
          groq: "Groq (Llama)",
          openai: "OpenAI GPT-5.5",
        }
        toast.success(`Provider alterado para ${names[provider]}`)
      } else {
        toast.error("Erro ao alterar provider")
      }
    } catch {
      toast.error("Erro ao alterar provider")
    } finally {
      setSavingProvider(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Ajuste as preferências do sistema</p>
      </div>

      {/* Admin - AI Provider */}
      {!loadingAdmin && isAdmin && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 space-y-4 dark:border-amber-700 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <h2 className="text-lg font-semibold">Provedor de IA</h2>
              <p className="text-xs text-muted-foreground">Visível apenas para administradores</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Escolha qual provedor de IA será usado para gerar plantas baixas
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => handleProviderChange("gemini")}
                disabled={savingProvider}
                className={`relative rounded-lg border p-4 text-left transition-colors ${
                  aiProvider === "gemini"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:border-primary/50"
                }`}
              >
                {savingProvider && aiProvider !== "gemini" && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                )}
                <p className="font-medium">Google Gemini</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  gemini-2.0-flash-lite
                </p>
                {aiProvider === "gemini" && (
                  <span className="mt-2 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Ativo
                  </span>
                )}
              </button>

              <button
                onClick={() => handleProviderChange("groq")}
                disabled={savingProvider}
                className={`relative rounded-lg border p-4 text-left transition-colors ${
                  aiProvider === "groq"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:border-primary/50"
                }`}
              >
                {savingProvider && aiProvider !== "groq" && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                )}
                <p className="font-medium">Groq</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  gemma2-9b-it • Free tier
                </p>
                {aiProvider === "groq" && (
                  <span className="mt-2 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Ativo
                  </span>
                )}
              </button>

              <button
                onClick={() => handleProviderChange("openai")}
                disabled={savingProvider}
                className={`relative rounded-lg border p-4 text-left transition-colors ${
                  aiProvider === "openai"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:border-primary/50"
                }`}
              >
                {savingProvider && aiProvider !== "openai" && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
                )}
                <p className="font-medium">OpenAI GPT-5.5</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  gpt-5.5 • Melhor qualidade
                </p>
                {aiProvider === "openai" && (
                  <span className="mt-2 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Ativo
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aparência */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Aparência</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Tema</Label>
              <p className="text-sm text-muted-foreground">
                Escolha entre claro, escuro ou automático
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="icon"
                onClick={() => setTheme("light")}
                aria-label="Tema claro"
              >
                <Sun className="h-4 w-4" />
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="icon"
                onClick={() => setTheme("dark")}
                aria-label="Tema escuro"
              >
                <Moon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Idioma */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Idioma</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Idioma do sistema</Label>
            <p className="text-sm text-muted-foreground">
              Selecione o idioma da interface
            </p>
          </div>
          <Select defaultValue="pt-BR">
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">Português (BR)</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notificações */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Notificações</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Notificações por email</Label>
              <p className="text-sm text-muted-foreground">
                Receba atualizações importantes por email
              </p>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, email: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Atualizações de projetos</Label>
              <p className="text-sm text-muted-foreground">
                Notificações quando projetos são gerados
              </p>
            </div>
            <Switch
              checked={notifications.projectUpdates}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, projectUpdates: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Marketing</Label>
              <p className="text-sm text-muted-foreground">
                Novidades e ofertas especiais
              </p>
            </div>
            <Switch
              checked={notifications.marketing}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, marketing: checked }))
              }
            />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full">
        Salvar configurações
      </Button>
    </div>
  )
}
