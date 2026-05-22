"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { LeadFormDialog } from "@/components/leads/lead-form-dialog"
import { DeleteConfirmDialog } from "@/components/leads/delete-confirm-dialog"

interface LeadStatus {
  id: string
  name: string
  color?: string | null
}

interface LeadUser {
  id: string
  name: string
}

interface Lead {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  source: string
  status: LeadStatus
  assignedTo?: LeadUser | null
  assignedToId?: string | null
  notes?: string | null
  createdAt: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingLead, setDeletingLead] = useState<{ id: string; name: string } | null>(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/leads")

      if (!response.ok) {
        throw new Error("Erro ao carregar leads")
      }

      const data = await response.json()
      setLeads(data.leads)
    } catch {
      setError("Não foi possível carregar os leads. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const filteredLeads = leads.filter((lead) => {
    const query = searchQuery.toLowerCase()
    return (
      lead.name.toLowerCase().includes(query) ||
      (lead.email?.toLowerCase().includes(query) ?? false) ||
      (lead.phone?.toLowerCase().includes(query) ?? false)
    )
  })

  function handleNewLead() {
    setEditingLead(null)
    setFormDialogOpen(true)
  }

  function handleEditLead(lead: Lead) {
    setEditingLead(lead)
    setFormDialogOpen(true)
  }

  function handleDeleteLead(lead: Lead) {
    setDeletingLead({ id: lead.id, name: lead.name })
    setDeleteDialogOpen(true)
  }

  function handleFormSuccess() {
    fetchLeads()
  }

  function handleDeleteSuccess() {
    fetchLeads()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance">Leads</h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie todos os seus leads em um só lugar
          </p>
        </div>
        <Button
          className="gap-2 bg-foreground text-background hover:bg-foreground/90"
          onClick={handleNewLead}
        >
          <Plus className="h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg font-semibold">Todos os leads</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 border-0 bg-secondary pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchLeads}>
                Tentar novamente
              </Button>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum lead cadastrado</p>
              <Button className="mt-4" onClick={handleNewLead}>
                <Plus className="mr-2 h-4 w-4" />
                Criar primeiro lead
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data de criação</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <p className="font-medium">{lead.name}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{lead.email ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{lead.phone ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{lead.source}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{lead.status.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {lead.assignedTo?.name ?? "Não atribuído"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(lead.createdAt), "dd/MM/yyyy")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditLead(lead)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteLead(lead)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <LeadFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        lead={editingLead}
        onSuccess={handleFormSuccess}
      />

      {deletingLead && (
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          leadId={deletingLead.id}
          leadName={deletingLead.name}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  )
}
