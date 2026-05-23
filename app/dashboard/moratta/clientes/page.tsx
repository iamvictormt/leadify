"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Pencil, Trash2, Users, FolderOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// === Types ===

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  createdAt: string
  _count?: { projects: number }
  projects?: { id: string; name: string; status: string; updatedAt: string }[]
}

// === Component ===

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upgradeRequired, setUpgradeRequired] = useState(false)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    setUpgradeRequired(false)

    try {
      const response = await fetch("/api/moratta/clients")

      if (response.status === 403) {
        const data = await response.json()
        const err = data.errors?.[0]
        if (err?.code === "PROFESSIONAL_REQUIRED") {
          setUpgradeRequired(true)
          return
        }
      }

      if (!response.ok) {
        throw new Error("Erro ao carregar clientes")
      }

      const data = await response.json()
      setClients(data.data)
    } catch {
      setError("Não foi possível carregar os clientes. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  function resetForm() {
    setFormName("")
    setFormEmail("")
    setFormPhone("")
    setFormError(null)
    setEditingClient(null)
    setShowForm(false)
  }

  function handleEdit(client: Client) {
    setEditingClient(client)
    setFormName(client.name)
    setFormEmail(client.email ?? "")
    setFormPhone(client.phone ?? "")
    setFormError(null)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!formName.trim()) {
      setFormError("O nome é obrigatório.")
      return
    }

    if (!formEmail.trim() && !formPhone.trim()) {
      setFormError("Informe ao menos e-mail ou telefone.")
      return
    }

    setSubmitting(true)

    try {
      const body = {
        name: formName.trim(),
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
      }

      let response: Response

      if (editingClient) {
        response = await fetch(`/api/moratta/clients/${editingClient.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        response = await fetch("/api/moratta/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }

      if (!response.ok) {
        const data = await response.json()
        const msg = data.errors?.[0]?.message ?? "Erro ao salvar cliente."
        setFormError(msg)
        return
      }

      resetForm()
      fetchClients()
    } catch {
      setFormError("Erro de conexão. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/moratta/clients/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Erro ao excluir cliente")
      }

      setDeletingId(null)
      fetchClients()
    } catch {
      setError("Não foi possível excluir o cliente. Tente novamente.")
      setDeletingId(null)
    }
  }

  // Upgrade required view
  if (upgradeRequired) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Users className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold">Funcionalidade Profissional</h2>
        <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
          A gestão de clientes requer perfil Profissional. Faça upgrade do seu perfil
          para acessar esta funcionalidade.
        </p>
        <Button className="mt-6" asChild>
          <a href="/dashboard/moratta/perfil">Fazer Upgrade</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie seus clientes e projetos vinculados
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo Cliente
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingClient ? "Editar Cliente" : "Novo Cliente"}
            </CardTitle>
            <CardDescription>
              {editingClient
                ? "Atualize os dados do cliente."
                : "Preencha os dados para cadastrar um novo cliente."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Nome *</Label>
                <Input
                  id="client-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nome do cliente"
                  required
                  aria-required="true"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client-email">E-mail</Label>
                  <Input
                    id="client-email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone">Telefone</Label>
                  <Input
                    id="client-phone"
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                * Informe ao menos e-mail ou telefone.
              </p>

              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? "Salvando..."
                    : editingClient
                      ? "Atualizar"
                      : "Cadastrar"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive" role="alert">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => fetchClients()}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border bg-muted/50"
              aria-hidden="true"
            />
          ))}
          <p className="sr-only">Carregando clientes...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && clients.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Users className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda.
          </p>
          {!showForm && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowForm(true)}
            >
              Cadastrar primeiro cliente
            </Button>
          )}
        </div>
      )}

      {/* Client list */}
      {!loading && clients.length > 0 && (
        <div className="space-y-3">
          {clients.map((client) => (
            <Card key={client.id} className="py-4">
              <CardContent className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate">{client.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {client.email && <span>{client.email}</span>}
                    {client.phone && <span>{client.phone}</span>}
                    <span className="inline-flex items-center gap-1">
                      <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      {client._count?.projects ?? 0} projeto(s)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {deletingId === client.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Excluir?</span>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(client.id)}
                        aria-label={`Confirmar exclusão de ${client.name}`}
                      >
                        Sim
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingId(null)}
                        aria-label="Cancelar exclusão"
                      >
                        Não
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(client)}
                        aria-label={`Editar ${client.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeletingId(client.id)}
                        aria-label={`Excluir ${client.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
