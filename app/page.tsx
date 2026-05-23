"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowRight,
  Brain,
  Check,
  Cuboid,
  PencilRuler,
  Calculator,
  Menu,
  X,
  Sparkles,
  Home,
  Layers,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { id: "como-funciona", label: "Como funciona" },
  { id: "recursos", label: "Recursos" },
  { id: "planos", label: "Planos" },
]

const features = [
  {
    icon: Brain,
    title: "Geração por IA",
    description:
      "Informe terreno, quartos e estilo — a IA distribui ambientes, posiciona paredes e entrega uma planta pronta para editar.",
  },
  {
    icon: PencilRuler,
    title: "Editor Visual 2D",
    description:
      "Arraste paredes, adicione cômodos e ajuste dimensões com snap de 10 cm. Cada edição recalcula áreas em tempo real.",
  },
  {
    icon: Cuboid,
    title: "Visualização 3D",
    description:
      "Navegue pelo interior da casa em primeira pessoa. Veja fachada, telhado e aberturas antes de gastar com obra.",
  },
  {
    icon: Calculator,
    title: "Estimativa de Custos",
    description:
      "Materiais, cronograma e custo total atualizados a cada alteração. Sugestões automáticas quando o orçamento estoura.",
  },
  {
    icon: Layers,
    title: "Variações Comparáveis",
    description:
      "Gere até 3 versões da mesma casa e compare lado a lado para escolher a distribuição ideal.",
  },
  {
    icon: Zap,
    title: "Compartilhamento Profissional",
    description:
      "Envie um link de visualização para seu cliente — sem cadastro, sem complicação.",
  },
]

const steps = [
  {
    number: "01",
    title: "Descreva o projeto",
    description: "Informe terreno, número de quartos, banheiros, estilo e orçamento em um formulário simples.",
  },
  {
    number: "02",
    title: "IA gera a planta",
    description: "Em segundos, receba uma planta conceitual com ambientes distribuídos, portas e janelas posicionadas.",
  },
  {
    number: "03",
    title: "Edite e visualize",
    description: "Ajuste no editor 2D, explore em 3D e acompanhe custos atualizados em tempo real.",
  },
]

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "",
    description: "Para explorar e testar a plataforma.",
    features: [
      "1 projeto ativo",
      "1 variação por projeto",
      "Visualização 2D",
      "Estimativa básica de custo",
    ],
    cta: "Começar grátis",
    highlighted: false,
  },
  {
    name: "Pessoal",
    price: "R$ 29",
    period: "/mês",
    description: "Para quem está planejando a própria casa.",
    features: [
      "5 projetos ativos",
      "3 variações por projeto",
      "Visualização 2D + 3D",
      "Estimativa completa com materiais",
      "Cronograma de obra",
      "Sugestões de economia",
    ],
    cta: "Assinar Pessoal",
    highlighted: true,
  },
  {
    name: "Profissional",
    price: "R$ 79",
    period: "/mês",
    description: "Para arquitetos e construtores que atendem clientes.",
    features: [
      "Projetos ilimitados",
      "3 variações por projeto",
      "Visualização 2D + 3D",
      "Estimativa completa com materiais",
      "Gestão de clientes",
      "Compartilhamento por link",
      "Painel de métricas",
      "Suporte prioritário",
    ],
    cta: "Assinar Profissional",
    highlighted: false,
  },
]

const stats = [
  { value: "< 2 min", label: "para gerar uma planta" },
  { value: "10 cm", label: "precisão no editor" },
  { value: "24 fps", label: "navegação 3D fluida" },
]

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("")

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
      const scrollPosition = window.scrollY + 120
      for (const section of navItems) {
        const element = document.getElementById(section.id)
        if (!element) continue
        if (scrollPosition >= element.offsetTop && scrollPosition < element.offsetTop + element.offsetHeight) {
          setActiveSection(section.id)
          return
        }
      }
      setActiveSection("")
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      window.scrollTo({ top: element.offsetTop - 88, behavior: "smooth" })
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          isScrolled ? "border-b border-border bg-background/90 shadow-sm backdrop-blur-xl" : "bg-background/70 backdrop-blur-sm"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Moratta">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground">
              <span className="text-lg font-bold text-background">M</span>
            </div>
            <span className="text-xl font-bold">Moratta</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`relative text-sm transition-colors hover:text-foreground ${
                  activeSection === item.id ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.label}
                {activeSection === item.id && <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-primary" />}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" className="hidden sm:inline-flex" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button className="hidden bg-foreground text-background hover:bg-foreground/90 sm:inline-flex" asChild>
              <Link href="/cadastrar">Começar grátis</Link>
            </Button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-border md:hidden"
              onClick={() => setIsMobileMenuOpen((o) => !o)}
              aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`absolute left-0 right-0 top-16 border-b border-border bg-background/95 backdrop-blur-xl transition-all duration-300 md:hidden ${
            isMobileMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"
          }`}
        >
          <nav className="flex flex-col gap-2 p-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="rounded-md px-4 py-3 text-left text-sm text-muted-foreground hover:bg-secondary"
              >
                {item.label}
              </button>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">Entrar</Link>
              </Button>
              <Button className="w-full bg-foreground text-background" asChild>
                <Link href="/cadastrar">Começar grátis</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f5f5f5_100%)] pt-28 pb-20 sm:pt-36 sm:pb-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm shadow-sm">
                <Sparkles className="h-4 w-4 text-foreground" />
                Planejamento residencial com inteligência artificial
              </div>
              <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Sua casa começa aqui.
                <br />
                <span className="text-muted-foreground">A IA cuida do resto.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
                Descreva o que precisa — terreno, quartos, estilo — e receba uma planta conceitual editável, visualização 3D e estimativa de custo em minutos. Sem precisar de software técnico.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90" asChild>
                  <Link href="/cadastrar">
                    Criar meu projeto grátis
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollToSection("como-funciona")}>
                  Ver como funciona
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="mx-auto mt-16 grid max-w-xl grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold sm:text-3xl">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Hero visual mockup */}
            <div className="mx-auto mt-16 max-w-5xl rounded-xl border border-border bg-card p-3 shadow-2xl">
              <div className="overflow-hidden rounded-lg border border-border bg-background">
                <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
                  <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
                  <span className="h-3 w-3 rounded-full bg-[#f59e0b]" />
                  <span className="h-3 w-3 rounded-full bg-[#22c55e]" />
                  <span className="ml-4 text-xs text-muted-foreground">moratta.app — Meu Projeto</span>
                </div>
                <div className="grid gap-4 p-6 lg:grid-cols-[1.4fr_0.6fr]">
                  {/* Floor plan mockup */}
                  <div className="relative aspect-[4/3] rounded-md border border-border bg-muted/30 p-4">
                    <div className="absolute inset-4 grid grid-cols-3 grid-rows-3 gap-1">
                      <div className="col-span-2 rounded bg-blue-100/60 border border-blue-200/80 flex items-center justify-center">
                        <span className="text-[10px] sm:text-xs text-blue-700 font-medium">Sala 20.0m²</span>
                      </div>
                      <div className="rounded bg-orange-100/60 border border-orange-200/80 flex items-center justify-center">
                        <span className="text-[10px] sm:text-xs text-orange-700 font-medium">Cozinha</span>
                      </div>
                      <div className="rounded bg-gray-100/60 border border-gray-200/80 flex items-center justify-center">
                        <span className="text-[10px] sm:text-xs text-gray-600 font-medium">Corredor</span>
                      </div>
                      <div className="rounded bg-purple-100/60 border border-purple-200/80 flex items-center justify-center">
                        <span className="text-[10px] sm:text-xs text-purple-700 font-medium">Quarto 1</span>
                      </div>
                      <div className="rounded bg-purple-100/60 border border-purple-200/80 flex items-center justify-center">
                        <span className="text-[10px] sm:text-xs text-purple-700 font-medium">Quarto 2</span>
                      </div>
                      <div className="rounded bg-cyan-100/60 border border-cyan-200/80 flex items-center justify-center">
                        <span className="text-[10px] sm:text-xs text-cyan-700 font-medium">Banheiro</span>
                      </div>
                      <div className="rounded bg-green-100/60 border border-green-200/80 flex items-center justify-center">
                        <span className="text-[10px] sm:text-xs text-green-700 font-medium">Garagem</span>
                      </div>
                      <div className="rounded bg-amber-100/60 border border-amber-200/80 flex items-center justify-center">
                        <span className="text-[10px] sm:text-xs text-amber-700 font-medium">Serviço</span>
                      </div>
                    </div>
                  </div>
                  {/* Side panel mockup */}
                  <div className="space-y-3">
                    <div className="rounded-md border border-border bg-card p-4">
                      <p className="text-xs font-medium text-muted-foreground">Custo Estimado</p>
                      <p className="mt-1 text-2xl font-bold">R$ 285.000</p>
                      <p className="text-xs text-muted-foreground">Padrão médio • 95m²</p>
                    </div>
                    <div className="rounded-md border border-border bg-card p-4">
                      <p className="text-xs font-medium text-muted-foreground">Cronograma</p>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between text-xs"><span>Fundação</span><span className="text-muted-foreground">3 sem</span></div>
                        <div className="flex justify-between text-xs"><span>Estrutura</span><span className="text-muted-foreground">6 sem</span></div>
                        <div className="flex justify-between text-xs"><span>Acabamento</span><span className="text-muted-foreground">5 sem</span></div>
                      </div>
                    </div>
                    <div className="rounded-md border border-foreground bg-foreground p-4 text-background">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        <span className="text-xs font-medium">3D disponível</span>
                      </div>
                      <p className="mt-2 text-xs text-background/70">Clique para navegar pelo interior da casa em primeira pessoa.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="scroll-mt-20 bg-card py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Como funciona</p>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                3 passos para visualizar sua casa
              </h2>
            </div>

            <div className="mx-auto mt-14 grid max-w-4xl gap-8 lg:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="relative rounded-lg border border-border bg-background p-6">
                  <span className="text-4xl font-bold text-muted-foreground/20">{step.number}</span>
                  <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 leading-7 text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="recursos" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recursos</p>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Tudo para planejar sem complicação
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Da geração automática à estimativa de materiais — ferramentas que simplificam cada etapa do planejamento.
              </p>
            </div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/40">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 leading-7 text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="planos" className="scroll-mt-20 bg-card py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Planos</p>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Comece de graça. Evolua quando precisar.
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Sem cartão de crédito para começar. Cancele quando quiser.
              </p>
            </div>

            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-xl border p-6 transition-all duration-300 hover:-translate-y-1 sm:p-8 ${
                    plan.highlighted
                      ? "border-foreground bg-foreground text-background shadow-xl scale-[1.02]"
                      : "border-border bg-background hover:shadow-lg"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="mb-4 inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      Mais escolhido
                    </div>
                  )}
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className={`mt-2 text-sm ${plan.highlighted ? "text-background/70" : "text-muted-foreground"}`}>
                    {plan.description}
                  </p>
                  <div className="mt-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className={plan.highlighted ? "text-background/70" : "text-muted-foreground"}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <ul className="mt-7 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 shrink-0 ${plan.highlighted ? "text-primary" : "text-foreground"}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`mt-8 w-full ${
                      plan.highlighted
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-foreground text-background hover:bg-foreground/90"
                    }`}
                    asChild
                  >
                    <Link href="/cadastrar">{plan.cta}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-foreground py-16 text-background sm:py-20">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 text-center sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Pronto para projetar com inteligência?
              </h2>
              <p className="mt-4 text-lg leading-8 text-background/75">
                Crie sua conta e gere sua primeira planta conceitual em poucos minutos — sem instalar nada, sem conhecimento técnico.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <Link href="/cadastrar">
                  Criar conta grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-background/25 bg-transparent text-background hover:bg-background/10"
                asChild
              >
                <Link href="/login">Já tenho conta</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 sm:px-6 md:flex-row">
          <Link href="/" className="flex items-center gap-2" aria-label="Moratta">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground">
              <span className="text-sm font-bold text-background">M</span>
            </div>
            <span className="font-semibold">Moratta</span>
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-6" aria-label="Navegação do rodapé">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <p className="text-sm text-muted-foreground">© 2026 Moratta. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
