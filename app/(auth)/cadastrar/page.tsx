"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import type { ComponentType, ReactNode } from "react"
import { ArrowRight, Check, Lock, Mail, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function CadastrarPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    profileType: "PERSONAL" as "PERSONAL" | "PROFESSIONAL",
  })

  const setField = (field: keyof typeof formData, value: string) => {
    setError("")
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formData.name.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword) {
      setError("Preencha todos os campos obrigatórios.")
      return
    }

    if (formData.password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("A confirmação de senha não confere.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/moratta/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          profileType: formData.profileType,
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const errorMsg =
          data?.errors?.[0]?.message ?? data?.error ?? "Não foi possível criar a conta."
        setError(errorMsg)
        return
      }

      router.push("/dashboard/moratta")
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
            <span className="text-lg font-bold text-primary-foreground">M</span>
          </div>
          <span className="text-xl font-bold">Moratta</span>
        </Link>

        <div className="max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-background/60">Crie sua conta</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">Planejamento residencial com inteligência artificial</h1>
          <p className="mt-4 text-lg leading-8 text-background/70">
            Gere plantas conceituais, visualize em 3D e estime custos a partir de uma descrição simples do seu projeto.
          </p>
          <div className="mt-10 space-y-4">
            {[
              "Geração de plantas por IA",
              "Editor visual interativo",
              "Visualização 3D do projeto",
              "Estimativa de custos automática",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <Check className="h-5 w-5 rounded-full bg-primary p-1 text-primary-foreground" />
                <span className="text-background/80">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-background/50">Moratta</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-xl">
          <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground">
              <span className="text-lg font-bold text-background">M</span>
            </div>
            <span className="text-xl font-bold">Moratta</span>
          </Link>

          <h1 className="text-3xl font-bold tracking-tight">Criar conta no Moratta</h1>
          <p className="mt-2 text-muted-foreground">Preencha seus dados para começar a projetar.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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

            {/* Profile type selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de perfil *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData((c) => ({ ...c, profileType: "PERSONAL" }))}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    formData.profileType === "PERSONAL"
                      ? "border-foreground bg-foreground/5 ring-1 ring-foreground"
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  <p className="font-medium">Pessoa Física</p>
                  <p className="mt-1 text-xs text-muted-foreground">Para projetos pessoais</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((c) => ({ ...c, profileType: "PROFESSIONAL" }))}
                  className={`rounded-lg border p-4 text-left transition-all ${
                    formData.profileType === "PROFESSIONAL"
                      ? "border-foreground bg-foreground/5 ring-1 ring-foreground"
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  <p className="font-medium">Profissional</p>
                  <p className="mt-1 text-xs text-muted-foreground">Arquitetos e engenheiros</p>
                </button>
              </div>
            </div>

            {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

            <Button type="submit" className="h-12 w-full bg-foreground text-background hover:bg-foreground/90" disabled={isLoading}>
              {isLoading ? "Criando conta..." : "Criar conta"}
              {!isLoading && <ArrowRight className="h-4 w-4" />}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link href="/login" className="font-medium text-foreground hover:underline">
                Entrar
              </Link>
            </p>
          </form>
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
