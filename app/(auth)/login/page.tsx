"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { ArrowRight, Lock, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const setField = (field: keyof typeof formData, value: string) => {
    setError("")
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(data?.error ?? "Não foi possível entrar.")
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
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <main className="flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground">
              <span className="text-lg font-bold text-background">M</span>
            </div>
            <span className="text-xl font-bold">Moratta</span>
          </Link>

          <h1 className="text-3xl font-bold tracking-tight">Entrar no Moratta</h1>
          <p className="mt-2 text-muted-foreground">Acesse seus projetos e continue planejando.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(event) => setField("email", event.target.value)}
                  className="h-12 pl-10"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(event) => setField("password", event.target.value)}
                  className="h-12 pl-10"
                  placeholder="Digite sua senha"
                  required
                />
              </div>
            </div>

            {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

            <Button type="submit" className="h-12 w-full bg-foreground text-background hover:bg-foreground/90" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
              {!isLoading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Ainda não tem uma conta?{" "}
            <Link href="/cadastrar" className="font-medium text-foreground hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </main>

      <aside className="hidden bg-foreground px-10 py-12 text-background lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
            <span className="text-lg font-bold text-primary-foreground">M</span>
          </div>
          <span className="text-xl font-bold">Moratta</span>
        </Link>

        <div className="max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-background/60">Planejamento Inteligente</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight">Seus projetos residenciais em um só lugar.</h2>
          <p className="mt-4 text-lg leading-8 text-background/70">
            Gere plantas conceituais com IA, visualize em 3D e estime custos antes de começar a obra.
          </p>
        </div>

        <p className="text-sm text-background/50">Moratta</p>
      </aside>
    </div>
  )
}
