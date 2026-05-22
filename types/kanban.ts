export interface KanbanLead {
  id: string
  name: string
  phone: string | null
  source: string
  statusId: string
  updatedAt: string
  createdAt: string
}

export interface KanbanStatus {
  id: string
  name: string
  color: string | null
  order: number
}

export interface KanbanColumn {
  status: KanbanStatus
  leads: KanbanLead[]
  totalCount: number
}
