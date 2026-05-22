"use client"

import { useEffect, useState } from "react"
import {
  Building2,
  Crown,
  Loader2,
  Plus,
  Save,
  Settings2,
  Trash2,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- Types ---

type Company = {
  id: string
  name: string
  segment: string
  phone: string | null
  email: string | null
  document: string | null
}

type CompanyUser = {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

type PlanInfo = {
  subscription: {
    id: string
    status: string
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
    plan: {
      id: string
      name: string
      price: number
      aiLimit: number
      leadLimit: number | null
      userLimit: number | null
    }
  } | null
  usage: {
    leads: number
    users: number
    aiTokens: number
  }
}

// --- Component ---

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState("empresa")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Company state
  const [company, setCompany] = useState<Company | null>(null)
  const [companyLoading, setCompanyLoading] = useState(true)
  const [companySaving, setCompanySaving] = useState(false)

  // Users state
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [showNewUser, setShowNewUser] = useState(false)
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "USER" })
  const [creatingUser, setCreatingUser] = useState(false)

  // Plan state
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
  const [planLoading, setPlanLoading] = useState(true)

  // Preferences state
  const [preferences, setPreferences] = useState({
    notifications: true,
    aiAutoSuggest: true,
    darkMode: false,
  })

  useEffect(() => {
    loadCompany()
    loadUsers()
    loadPlan()
  }, [])

  const clearMessages = () => {
    setError("")
    setSuccess("")
  }

  // --- Company ---

  const loadCompany = async () => {
    setCompanyLoading(true)
    try {
      const res = await fetch("/api/settings/company")
      if (res.status === 401) { window.location.href = "/login"; return }
      const data = await res.json()
      setCompany(data.company)
    } catch {
      setError("Erro ao carregar dados da empresa.")
    } finally {
      setCompanyLoading(false)
    }
  }

  const saveCompany = async () => {
    if (!company) return
    clearMessages()
    setCompanySaving(true)

    try {
      const res = await fetch("/api/settings/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: company.name,
          segment: company.segment,
          phone: company.phone,
          email: company.email,
          document: company.document,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar.")
        return
      }

      setCompany(data.company)
      setSuccess("Dados da empresa atualizados com sucesso.")
    } catch {
      setError("Erro ao salvar dados da empresa.")
    } finally {
      setCompanySaving(false)
    }
  }

  // --- Users ---

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await fetch("/api/settings/users")
      if (res.status === 401) return
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch {
      setError("Erro ao carregar usuários.")
    } finally {
      setUsersLoading(false)
    }
  }

  const createUser = async () => {
    clearMessages()
    setCreatingUser(true)

    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Erro ao criar usuário.")
        return
      }

      setUsers((current) => [...current, data.user])
      setNewUser({ name: "", email: "", password: "", role: "USER" })
      setShowNewUser(false)
      setSuccess("Usuário criado com sucesso.")
    } catch {
      setError("Erro ao criar usuário.")
    } finally {
      setCreatingUser(false)
    }
  }

  const deleteUser = async (id: string) => {
    clearMessages()

    try {
      const res = await fetch(`/api/settings/users/${id}`, { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Erro ao remover usuário.")
        return
      }

      setUsers((current) => current.filter((u) => u.id !== id))
      setSuccess("Usuário removido.")
    } catch {
      setError("Erro ao remover usuário.")
    }
  }

  // --- Plan ---

  const loadPlan = async () => {
    setPlanLoading(true)
    try {
      const res = await fetch("/api/settings/plan")
      if (res.status === 401) return
      const data = await res.json()
      setPlanInfo(data)
    } catch {
      setError("Erro ao carregar informações do plano.")
    } finally {
      setPlanLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="mt-1 text-muted-foreground">
          Gerencie sua empresa, equipe, plano e preferências.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </p>
      )}

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); clearMessages() }}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="plano" className="gap-2">
            <Crown className="h-4 w-4" />
            Plano
          </TabsTrigger>
          <TabsTrigger value="preferencias" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Preferências
          </TabsTrigger>
        </TabsList>

        {/* --- Empresa --- */}
        <TabsContent value="empresa" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Dados da empresa</CardTitle>
              <CardDescription>Informações gerais da sua empresa.</CardDescription>
            </CardHeader>
            <CardContent>
              {companyLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : company ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Nome da empresa</Label>
                    <Input
                      id="company-name"
                      value={company.name}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-segment">Segmento</Label>
                    <Input
                      id="company-segment"
                      value={company.segment}
                      onChange={(e) => setCompany({ ...company, segment: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-phone">Telefone</Label>
                    <Input
                      id="company-phone"
                      value={company.phone ?? ""}
                      onChange={(e) => setCompany({ ...company, phone: e.target.value || null })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-email">Email</Label>
                    <Input
                      id="company-email"
                      type="email"
                      value={company.email ?? ""}
                      onChange={(e) => setCompany({ ...company, email: e.target.value || null })}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="company-document">CNPJ / Documento</Label>
                    <Input
                      id="company-document"
                      value={company.document ?? ""}
                      onChange={(e) => setCompany({ ...company, document: e.target.value || null })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button onClick={saveCompany} disabled={companySaving} className="gap-2">
                      {companySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Salvar alterações
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Empresa não encontrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Usuários --- */}
        <TabsContent value="usuarios" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Equipe</CardTitle>
                <CardDescription>Gerencie os usuários da sua empresa.</CardDescription>
              </div>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setShowNewUser(!showNewUser)}
              >
                <Plus className="h-4 w-4" />
                Novo usuário
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showNewUser && (
                <div className="rounded-md border border-border bg-secondary/30 p-4 space-y-3">
                  <p className="text-sm font-medium">Adicionar usuário</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="new-user-name">Nome</Label>
                      <Input
                        id="new-user-name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-user-email">Email</Label>
                      <Input
                        id="new-user-email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-user-password">Senha</Label>
                      <Input
                        id="new-user-password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="new-user-role">Papel</Label>
                      <select
                        id="new-user-role"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      >
                        <option value="USER">Usuário</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={createUser} disabled={creatingUser} className="gap-2">
                      {creatingUser && <Loader2 className="h-4 w-4 animate-spin" />}
                      Criar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowNewUser(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {usersLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
              ) : (
                <div className="divide-y divide-border rounded-md border border-border">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-medium">
                          {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                          {u.role === "ADMIN" ? "Admin" : "Usuário"}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteUser(u.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Plano --- */}
        <TabsContent value="plano" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Plano e uso</CardTitle>
              <CardDescription>Veja seu plano atual e consumo de recursos.</CardDescription>
            </CardHeader>
            <CardContent>
              {planLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : planInfo ? (
                <div className="space-y-6">
                  {planInfo.subscription ? (
                    <div className="rounded-md border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-semibold">{planInfo.subscription.plan.name}</p>
                          <p className="text-sm text-muted-foreground">
                            R$ {(planInfo.subscription.plan.price / 100).toFixed(2)}/mês
                          </p>
                        </div>
                        <Badge variant={planInfo.subscription.status === "active" ? "default" : "secondary"}>
                          {planInfo.subscription.status === "active" ? "Ativo" : planInfo.subscription.status}
                        </Badge>
                      </div>
                      {planInfo.subscription.currentPeriodEnd && (
                        <p className="text-xs text-muted-foreground">
                          Próxima renovação:{" "}
                          {new Date(planInfo.subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border p-4">
                      <p className="text-sm text-muted-foreground">
                        Nenhum plano ativo. Você está usando o plano gratuito.
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="mb-3 text-sm font-medium">Uso atual</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-md border border-border p-3 text-center">
                        <p className="text-2xl font-bold">{planInfo.usage.leads}</p>
                        <p className="text-xs text-muted-foreground">
                          Leads{planInfo.subscription?.plan.leadLimit ? ` / ${planInfo.subscription.plan.leadLimit}` : ""}
                        </p>
                      </div>
                      <div className="rounded-md border border-border p-3 text-center">
                        <p className="text-2xl font-bold">{planInfo.usage.users}</p>
                        <p className="text-xs text-muted-foreground">
                          Usuários{planInfo.subscription?.plan.userLimit ? ` / ${planInfo.subscription.plan.userLimit}` : ""}
                        </p>
                      </div>
                      <div className="rounded-md border border-border p-3 text-center">
                        <p className="text-2xl font-bold">{planInfo.usage.aiTokens.toLocaleString("pt-BR")}</p>
                        <p className="text-xs text-muted-foreground">
                          Tokens IA{planInfo.subscription?.plan.aiLimit ? ` / ${planInfo.subscription.plan.aiLimit.toLocaleString("pt-BR")}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Não foi possível carregar informações do plano.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Preferências --- */}
        <TabsContent value="preferencias" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Preferências</CardTitle>
              <CardDescription>Ajuste o comportamento do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Notificações</p>
                  <p className="text-xs text-muted-foreground">Receber alertas de novos leads e mensagens.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.notifications}
                  onClick={() => setPreferences({ ...preferences, notifications: !preferences.notifications })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${preferences.notifications ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${preferences.notifications ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Sugestão automática da IA</p>
                  <p className="text-xs text-muted-foreground">Gerar sugestões automaticamente ao receber mensagens.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.aiAutoSuggest}
                  onClick={() => setPreferences({ ...preferences, aiAutoSuggest: !preferences.aiAutoSuggest })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${preferences.aiAutoSuggest ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${preferences.aiAutoSuggest ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Modo escuro</p>
                  <p className="text-xs text-muted-foreground">Alternar entre tema claro e escuro.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.darkMode}
                  onClick={() => setPreferences({ ...preferences, darkMode: !preferences.darkMode })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${preferences.darkMode ? "bg-primary" : "bg-muted"}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${preferences.darkMode ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>

              <p className="text-xs text-muted-foreground pt-2">
                As preferências são salvas localmente no navegador.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
