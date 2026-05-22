"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  Filter,
  MoreHorizontal,
  Phone,
  Mail,
  MessageSquare,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react"

const leads = [
  {
    id: "1",
    name: "Maria Santos",
    email: "maria@email.com",
    phone: "(11) 99999-0001",
    source: "WhatsApp",
    status: "Novo",
    statusColor: "bg-primary text-primary-foreground",
    assignedTo: "Victor Silva",
    createdAt: "22/01/2024",
  },
  {
    id: "2",
    name: "João Silva",
    email: "joao@email.com",
    phone: "(11) 99999-0002",
    source: "Instagram",
    status: "Em conversa",
    statusColor: "bg-[#EEFF41] text-foreground",
    assignedTo: "Victor Silva",
    createdAt: "21/01/2024",
  },
  {
    id: "3",
    name: "Ana Oliveira",
    email: "ana@email.com",
    phone: "(11) 99999-0003",
    source: "WhatsApp",
    status: "Proposta",
    statusColor: "bg-blue-100 text-blue-700",
    assignedTo: "Maria Costa",
    createdAt: "20/01/2024",
  },
  {
    id: "4",
    name: "Carlos Pereira",
    email: "carlos@email.com",
    phone: "(11) 99999-0004",
    source: "Site",
    status: "Novo",
    statusColor: "bg-primary text-primary-foreground",
    assignedTo: "Victor Silva",
    createdAt: "19/01/2024",
  },
  {
    id: "5",
    name: "Fernanda Lima",
    email: "fernanda@email.com",
    phone: "(11) 99999-0005",
    source: "WhatsApp",
    status: "Fechado",
    statusColor: "bg-green-100 text-green-700",
    assignedTo: "Maria Costa",
    createdAt: "18/01/2024",
  },
  {
    id: "6",
    name: "Pedro Costa",
    email: "pedro@email.com",
    phone: "(11) 99999-0006",
    source: "Instagram",
    status: "Perdido",
    statusColor: "bg-red-100 text-red-700",
    assignedTo: "Victor Silva",
    createdAt: "17/01/2024",
  },
  {
    id: "7",
    name: "Lucia Mendes",
    email: "lucia@email.com",
    phone: "(11) 99999-0007",
    source: "WhatsApp",
    status: "Em conversa",
    statusColor: "bg-[#EEFF41] text-foreground",
    assignedTo: "Maria Costa",
    createdAt: "16/01/2024",
  },
  {
    id: "8",
    name: "Roberto Alves",
    email: "roberto@email.com",
    phone: "(11) 99999-0008",
    source: "Site",
    status: "Proposta",
    statusColor: "bg-blue-100 text-blue-700",
    assignedTo: "Victor Silva",
    createdAt: "15/01/2024",
  },
]

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance">Leads</h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie todos os seus leads em um só lugar
          </p>
        </div>
        <Button className="gap-2 bg-foreground text-background hover:bg-foreground/90">
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
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                        <span className="text-xs font-semibold">
                          {lead.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{lead.source}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={lead.statusColor}>{lead.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{lead.assignedTo}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{lead.createdAt}</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
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
        </CardContent>
      </Card>
    </div>
  )
}
