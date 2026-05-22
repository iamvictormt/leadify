"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import {
  createLeadSchema,
  updateLeadSchema,
  type CreateLeadInput,
  type UpdateLeadInput,
} from "@/lib/validations/lead"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LeadUser {
  id: string
  name: string
}

interface Lead {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  source: string
  assignedToId?: string | null
  notes?: string | null
}

interface LeadFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: Lead | null
  users?: LeadUser[]
  onSuccess?: () => void
}

const SOURCE_OPTIONS = [
  { value: "MANUAL", label: "Manual" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "INDICACAO", label: "Indicação" },
  { value: "SITE", label: "Site" },
] as const

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
  users = [],
  onSuccess,
}: LeadFormDialogProps) {
  const isEditMode = !!lead
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateLeadInput | UpdateLeadInput>({
    resolver: zodResolver(isEditMode ? updateLeadSchema : createLeadSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      source: "MANUAL",
      assignedToId: null,
      notes: "",
    },
  })

  useEffect(() => {
    if (open) {
      if (lead) {
        form.reset({
          name: lead.name ?? "",
          phone: lead.phone ?? "",
          email: lead.email ?? "",
          source: (lead.source as CreateLeadInput["source"]) ?? "MANUAL",
          assignedToId: lead.assignedToId ?? null,
          notes: lead.notes ?? "",
        })
      } else {
        form.reset({
          name: "",
          phone: "",
          email: "",
          source: "MANUAL",
          assignedToId: null,
          notes: "",
        })
      }
    }
  }, [open, lead, form])

  async function onSubmit(data: CreateLeadInput | UpdateLeadInput) {
    setIsSubmitting(true)

    try {
      const url = isEditMode ? `/api/leads/${lead!.id}` : "/api/leads"
      const method = isEditMode ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.status === 409) {
        toast.error("Já existe um lead com este telefone")
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)

        if (response.status === 400 && errorData?.issues) {
          const issues = errorData.issues as Record<string, string[]>
          for (const [field, messages] of Object.entries(issues)) {
            form.setError(field as keyof (CreateLeadInput | UpdateLeadInput), {
              type: "server",
              message: messages[0],
            })
          }
          return
        }

        toast.error(errorData?.error ?? "Erro ao salvar lead")
        return
      }

      toast.success(isEditMode ? "Lead atualizado com sucesso" : "Lead criado com sucesso")
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Lead" : "Novo Lead"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Atualize as informações do lead."
              : "Preencha as informações para cadastrar um novo lead."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do lead" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(11) 99999-0000"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? "MANUAL"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione a origem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "__none__" ? null : value)
                      }
                      value={field.value ?? "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Não atribuído</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre o lead..."
                      className="min-h-[80px]"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Salvar" : "Criar Lead"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
