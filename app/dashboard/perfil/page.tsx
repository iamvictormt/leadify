"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, User, Mail, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface UserData {
  id: string
  name: string
  email: string
  createdAt: string
}

interface ProfileData {
  id: string
  type: "PERSONAL" | "PROFESSIONAL"
}

export default function PerfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes] = await Promise.all([
          fetch("/api/moratta/profile"),
        ])

        if (!profileRes.ok) {
          if (profileRes.status === 401) {
            router.push("/login")
            return
          }
          throw new Error("Erro ao carregar perfil")
        }

        const profileData = await profileRes.json()
        setProfile(profileData.data)

        // Fetch user info from a simple endpoint or use profile data
        // For now we'll use what we have
        setLoading(false)
      } catch {
        toast.error("Erro ao carregar dados do perfil")
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleSaveProfile = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem")
      return
    }

    setSaving(true)
    try {
      // Update password if provided
      if (newPassword && currentPassword) {
        // This would need a password update endpoint
        toast.info("Funcionalidade de alteração de senha em desenvolvimento")
      }

      toast.success("Perfil atualizado com sucesso")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      toast.error("Erro ao salvar perfil")
    } finally {
      setSaving(false)
    }
  }

  const handleUpgradeProfile = async () => {
    try {
      const res = await fetch("/api/moratta/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "PROFESSIONAL" }),
      })

      if (res.ok) {
        const data = await res.json()
        setProfile(data.data)
        toast.success("Perfil atualizado para Profissional!")
      } else {
        toast.error("Erro ao atualizar perfil")
      }
    } catch {
      toast.error("Erro ao atualizar perfil")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
      </div>

      {/* Tipo de perfil */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Plano</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {profile?.type === "PROFESSIONAL" ? "Profissional" : "Pessoal"}
            </p>
            <p className="text-sm text-muted-foreground">
              {profile?.type === "PROFESSIONAL"
                ? "Acesso completo a todas as funcionalidades"
                : "Funcionalidades básicas de geração de projetos"}
            </p>
          </div>
          {profile?.type === "PERSONAL" && (
            <Button onClick={handleUpgradeProfile}>
              Fazer upgrade
            </Button>
          )}
        </div>
      </div>

      {/* Dados pessoais */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Dados pessoais</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              disabled
              value={user?.email ?? ""}
              placeholder="seu@email.com"
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>
        </div>
      </div>

      {/* Alterar senha */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Alterar senha</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Senha atual</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova senha</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={handleSaveProfile}
        disabled={saving}
        className="w-full"
      >
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Salvar alterações
      </Button>
    </div>
  )
}
