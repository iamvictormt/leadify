"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import type { ComponentType, ReactNode } from "react"
import { ArrowRight, Building2, Check, FileText, Lock, Mail, Phone, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const segments = ["Clínica", "Oficina", "Loja", "Imobiliária", "Outro"]

type Step = "account" | "company"

export default function CadastrarPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("account")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    segment: "",
    phone: "",
    companyEmail: "",
    document: "",
  })

  const setField = (field: keyof typeof formData, value: string) => {
    setError("")
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const validateAccountStep = () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword) {
      setError("Preencha todos os campos obrigatórios.")
      return false
    }

    if (formData.password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.")
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError("A confirmação de senha não confere.")
      return false
    }

    return true
  }

  const handleAccountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (validateAccountStep()) {
      setStep("company")
    }
  }

  const handleCompanySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formData.companyName.trim() || !formData.segment) {
      setError("Informe o nome da empresa e o segmento.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.error ?? "Não foi possível criar a conta.")
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch {
      setError("Não foi possível conectar ao servidor.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="hidden bg-foreground px-10 py-12 text-background lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <span className="text-lg font-bold text-primary-foreground">L</span>
          </div>
          <span className="text-xl font-bold">Leadify</span>
        </Link>

        <div className="max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-background/60">Etapa 1</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Autenticação e empresa</h1>
          <p className="mt-4 text-lg leading-8 text-background/70">
            Crie o usuário administrador, cadastre a empresa e mantenha os dados separados por organização desde o primeiro acesso.
          </p>
          <div className="mt-10 space-y-4">
            {["Email único por usuário", "Senha com no mínimo 8 caracteres", "Primeiro usuário com perfil ADMIN", "Empresa criada automaticamente"].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Check className="h-5 w-5 rounded-full bg-primary p-1 text-primary-foreground" />
                <span className="text-background/80">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-background/50">Leadify CRM</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-xl">
          <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground">
              <span className="text-lg font-bold text-background">L</span>
            </div>
            <span className="text-xl font-bold">Leadify</span>
          </Link>

          <div className="mb-8 flex items-center gap-3">
            <div className={`h-2 flex-1 rounded-full ${step === "account" ? "bg-foreground" : "bg-primary"}`} />
            <div className={`h-2 flex-1 rounded-full ${step === "company" ? "bg-foreground" : "bg-border"}`} />
          </div>

          {step === "account" ? (
            <>
              <h1 className="text-3xl font-bold tracking-tight">Criar conta</h1>
              <p className="mt-2 text-muted-foreground">Informe os dados do usuário que será o administrador inicial.</p>

              <form onSubmit={handleAccountSubmit} className="mt-8 space-y-5">
                <Field label="Nome completo *" icon={User}>
                  <Input
                    value={formData.name}
                    onChange={(event) => setField("name", event.target.value)}
                    className="h-12 pl-10"
                    placeholder="Seu nome"
                    required
                  />
                </Field>

                <Field label="Email *" icon={Mail}>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setField("email", event.target.value)}
                    className="h-12 pl-10"
                    placeholder="seu@email.com"
                    required
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Senha *" icon={Lock}>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(event) => setField("password", event.target.value)}
                      className="h-12 pl-10"
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                  </Field>

                  <Field label="Confirmar senha *" icon={Lock}>
                    <Input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(event) => setField("confirmPassword", event.target.value)}
                      className="h-12 pl-10"
                      placeholder="Repita a senha"
                      required
                    />
                  </Field>
                </div>

                {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

                <Button type="submit" className="h-12 w-full bg-foreground text-background hover:bg-foreground/90">
                  Criar conta
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="outline" className="h-12" asChild>
                    <Link href="/login">Entrar</Link>
                  </Button>
                  <Button type="button" variant="outline" className="h-12" disabled>
                    Google (futuro)
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight">Cadastro da empresa</h1>
              <p className="mt-2 text-muted-foreground">A empresa será vinculada ao seu usuário ADMIN automaticamente.</p>

              <form onSubmit={handleCompanySubmit} className="mt-8 space-y-5">
                <Field label="Nome empresa *" icon={Building2}>
                  <Input
                    value={formData.companyName}
                    onChange={(event) => setField("companyName", event.target.value)}
                    className="h-12 pl-10"
                    placeholder="Nome da empresa"
                    required
                  />
                </Field>

                <div className="space-y-2">
                  <label htmlFor="segment" className="text-sm font-medium">
                    Segmento *
                  </label>
                  <select
                    id="segment"
                    value={formData.segment}
                    onChange={(event) => setField("segment", event.target.value)}
                    className="h-12 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    required
                  >
                    <option value="">Selecione um segmento</option>
                    {segments.map((segment) => (
                      <option key={segment} value={segment}>
                        {segment}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Telefone" icon={Phone}>
                    <Input
                      value={formData.phone}
                      onChange={(event) => setField("phone", event.target.value)}
                      className="h-12 pl-10"
                      placeholder="(00) 00000-0000"
                    />
                  </Field>

                  <Field label="Email" icon={Mail}>
                    <Input
                      type="email"
                      value={formData.companyEmail}
                      onChange={(event) => setField("companyEmail", event.target.value)}
                      className="h-12 pl-10"
                      placeholder="contato@empresa.com"
                    />
                  </Field>
                </div>

                <Field label="Documento" icon={FileText}>
                  <Input
                    value={formData.document}
                    onChange={(event) => setField("document", event.target.value)}
                    className="h-12 pl-10"
                    placeholder="CNPJ, CPF ou identificação interna"
                  />
                </Field>

                {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

                <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                  <Button type="button" variant="outline" className="h-12" onClick={() => setStep("account")} disabled={isLoading}>
                    Voltar
                  </Button>
                  <Button type="submit" className="h-12 bg-foreground text-background hover:bg-foreground/90" disabled={isLoading}>
                    {isLoading ? "Criando empresa..." : "Criar empresa"}
                    {!isLoading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function Field({
  children,
  icon: Icon,
  label,
}: {
  children: ReactNode
  icon: ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  )
}
