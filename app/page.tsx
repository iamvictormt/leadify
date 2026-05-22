"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  Clock3,
  KanbanSquare,
  Menu,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"

const navItems = [
  { id: "recursos", label: "Recursos" },
  { id: "precos", label: "Preços" },
  { id: "sobre", label: "Sobre" },
]

const features = [
  {
    icon: Users,
    title: "Leads sempre organizados",
    description:
      "Centralize novos contatos, origem, estágio do funil e histórico de atendimento em uma visão simples de acompanhar.",
  },
  {
    icon: MessageSquare,
    title: "Conversas com contexto",
    description:
      "Registre interações de WhatsApp e Instagram para retomar cada atendimento sem perder detalhes importantes.",
  },
  {
    icon: Brain,
    title: "IA treinada pelo seu negócio",
    description:
      "Crie respostas com base nos seus serviços, horários, objeções frequentes e tom de atendimento.",
  },
  {
    icon: KanbanSquare,
    title: "Funil visual de vendas",
    description:
      "Mova oportunidades entre etapas, priorize os próximos contatos e veja onde cada negociação está parada.",
  },
  {
    icon: BarChart3,
    title: "Indicadores em tempo real",
    description:
      "Acompanhe leads recebidos, conversões, motivos de perda e desempenho da equipe sem planilhas paralelas.",
  },
  {
    icon: ShieldCheck,
    title: "Rotina simples para a equipe",
    description:
      "Permissões, tarefas e lembretes ajudam o time a manter o mesmo padrão de atendimento todos os dias.",
  },
]

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    description: "Para começar a organizar seus primeiros contatos.",
    features: ["50 leads ativos", "100 respostas com IA/mês", "1 usuário", "Kanban básico"],
    cta: "Começar grátis",
    highlighted: false,
  },
  {
    name: "Start",
    price: "R$ 49",
    description: "Para pequenos negócios que já vendem todos os dias.",
    features: ["500 leads ativos", "500 respostas com IA/mês", "3 usuários", "Kanban completo", "Relatórios básicos"],
    cta: "Assinar Start",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "R$ 99",
    description: "Para operações que precisam de mais escala e controle.",
    features: ["Leads ilimitados", "2.000 respostas com IA/mês", "10 usuários", "Relatórios avançados", "Suporte prioritário"],
    cta: "Assinar Pro",
    highlighted: false,
  },
]

const stats = [
  { label: "leads organizados", value: "+120 mil" },
  { label: "respostas geradas por IA", value: "+1 milhão" },
  { label: "menos tempo em tarefas manuais", value: "8h/semana" },
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

        const offsetTop = element.offsetTop
        const offsetHeight = element.offsetHeight

        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
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
      const headerOffset = 88
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.scrollY - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      })
    }

    setIsMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          isScrolled ? "border-b border-border bg-background/90 shadow-sm backdrop-blur-xl" : "bg-background/70 backdrop-blur-sm"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="Leadify">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground">
              <span className="text-lg font-bold text-background">L</span>
            </div>
            <span className="text-xl font-bold">Leadify</span>
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
              onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
              aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div
          className={`absolute left-0 right-0 top-16 border-b border-border bg-background/95 backdrop-blur-xl transition-all duration-300 md:hidden ${
            isMobileMenuOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"
          }`}
        >
          <nav className="flex flex-col gap-2 p-4" aria-label="Navegação mobile">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`rounded-md px-4 py-3 text-left text-sm transition-colors ${
                  activeSection === item.id ? "bg-primary/30 font-medium text-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">Entrar</Link>
              </Button>
              <Button className="w-full bg-foreground text-background hover:bg-foreground/90" asChild>
                <Link href="/cadastrar">Começar grátis</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f5f5f5_100%)] pt-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 sm:px-6 sm:pb-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:pb-24 lg:pt-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm shadow-sm">
                <Sparkles className="h-4 w-4 text-foreground" />
                CRM com IA para vender melhor pelo WhatsApp
              </div>
              <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Organize leads, responda mais rápido e feche mais vendas.
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
                O Leadify reúne CRM, funil de vendas e assistente de IA em uma rotina simples para pequenos negócios que atendem pelo WhatsApp e Instagram.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90" asChild>
                  <Link href="/cadastrar">
                    Começar grátis
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollToSection("demo")}>
                  Ver demonstração
                </Button>
              </div>
              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="border-l border-border pl-3">
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="mt-1 text-xs leading-4 text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div id="demo" className="scroll-mt-24 rounded-lg border border-border bg-card p-3 shadow-2xl">
              <div className="overflow-hidden rounded-md border border-border bg-background">
                <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#ef4444]" />
                    <span className="h-3 w-3 rounded-full bg-[#f59e0b]" />
                    <span className="h-3 w-3 rounded-full bg-[#22c55e]" />
                  </div>
                  <div className="rounded-full bg-primary/50 px-3 py-1 text-xs font-medium">Pipeline de hoje</div>
                </div>

                <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        ["Novos leads", "34", "+18%"],
                        ["Conversões", "12", "+7%"],
                        ["Tempo médio", "4 min", "-32%"],
                      ].map(([label, value, change]) => (
                        <div key={label} className="rounded-md border border-border bg-card p-3">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <div className="mt-2 flex items-end justify-between gap-2">
                            <span className="text-2xl font-bold">{value}</span>
                            <span className="text-xs font-medium text-foreground">{change}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {["Novo contato", "Em negociação", "Fechamento"].map((column, columnIndex) => (
                        <div key={column} className="rounded-md border border-border bg-secondary/50 p-3">
                          <p className="text-xs font-semibold">{column}</p>
                          <div className="mt-3 space-y-2">
                            {[0, 1, 2].map((item) => (
                              <div key={item} className="rounded-md border border-border bg-card p-3 shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="h-2 w-16 rounded-full bg-foreground/20" />
                                  <span className="h-2 w-2 rounded-full bg-primary" />
                                </div>
                                <div className="mt-3 h-2 rounded-full bg-muted" />
                                <div className="mt-2 h-2 w-2/3 rounded-full bg-muted" />
                                {columnIndex === 1 && item === 0 && (
                                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/50 px-2 py-1 text-[10px] font-medium">
                                    <Brain className="h-3 w-3" />
                                    IA sugeriu resposta
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-md border border-border bg-foreground p-4 text-background">
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        <p className="font-semibold">Assistente Leadify</p>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-background/75">
                        Cliente pediu valores. Sugestão: responder com o plano ideal, destacar prazo de implantação e chamar para uma demonstração rápida.
                      </p>
                      <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90" size="sm">
                        Usar resposta
                      </Button>
                    </div>

                    <div className="rounded-md border border-border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">Próximas ações</p>
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="mt-4 space-y-3">
                        {["Retornar orçamento", "Enviar proposta", "Confirmar reunião"].map((task) => (
                          <div key={task} className="flex items-center gap-3">
                            <Check className="h-4 w-4 rounded-full bg-primary p-0.5 text-primary-foreground" />
                            <span className="text-sm">{task}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="scroll-mt-20 bg-card py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recursos</p>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Tudo o que você precisa para transformar conversas em vendas.
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Menos abas abertas, menos informação perdida e mais clareza para acompanhar cada oportunidade.
              </p>
            </div>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-lg border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
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

        {/* <section className="border-y border-border py-16">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-3">
            {[
              ["1", "Capture", "Receba leads vindos dos seus canais e registre os dados mais importantes desde o primeiro contato."],
              ["2", "Atenda", "Use histórico, tarefas e IA para responder com rapidez sem perder o tom humano da sua marca."],
              ["3", "Venda", "Acompanhe o funil, priorize oportunidades quentes e saiba exatamente onde agir para converter mais."],
            ].map(([step, title, description]) => (
              <div key={step} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-foreground text-sm font-bold text-background">
                  {step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-2 leading-7 text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section> */}

        <section id="precos" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Planos</p>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Comece de graça e evolua quando fizer sentido.
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Planos simples para sair da planilha sem travar seu caixa.
              </p>
            </div>

            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-lg border p-6 transition-all duration-300 hover:-translate-y-1 sm:p-8 ${
                    plan.highlighted ? "border-foreground bg-foreground text-background shadow-xl" : "border-border bg-card hover:shadow-lg"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="mb-4 inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      Mais escolhido
                    </div>
                  )}
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className={`mt-2 text-sm ${plan.highlighted ? "text-background/70" : "text-muted-foreground"}`}>{plan.description}</p>
                  <div className="mt-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== "R$ 0" && <span className={plan.highlighted ? "text-background/70" : "text-muted-foreground"}>/mês</span>}
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
                      plan.highlighted ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-foreground text-background hover:bg-foreground/90"
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

        <section id="sobre" className="scroll-mt-20 bg-card py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Sobre</p>
              <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
                Feito para negócios que vendem na conversa, não em formulários frios.
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                O Leadify nasceu para simplificar a rotina de lojas, clínicas, prestadores de serviço e equipes comerciais que precisam responder rápido, lembrar de cada cliente e manter o funil em movimento.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Atendimento mais rápido", "Sugestões de resposta ajudam sua equipe a reduzir o tempo entre uma pergunta e uma proposta."],
                ["Histórico no lugar certo", "Cada lead carrega contexto, próximos passos e conversas anteriores para ninguém começar do zero."],
                ["Gestão sem complicação", "Uma visão clara do funil mostra gargalos e oportunidades sem depender de planilhas soltas."],
                ["Crescimento previsível", "Relatórios ajudam você a entender o que entra, o que converte e onde a operação pode melhorar."],
              ].map(([title, description]) => (
                <div key={title} className="rounded-lg border border-border bg-background p-6">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 leading-7 text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-foreground py-16 text-background sm:py-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">Pronto para vender com mais clareza?</h2>
              <p className="mt-4 text-lg leading-8 text-background/75">
                Crie sua conta, organize seus primeiros leads e teste o assistente de IA sem cartão de crédito.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <Link href="/cadastrar">
                  Criar conta grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-background/25 bg-transparent text-background hover:bg-background/10" asChild>
                <Link href="/login">Já tenho conta</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 sm:px-6 md:flex-row">
          <Link href="/" className="flex items-center gap-2" aria-label="Leadify">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground">
              <span className="text-sm font-bold text-background">L</span>
            </div>
            <span className="font-semibold">Leadify</span>
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
          <p className="text-sm text-muted-foreground">© 2026 Leadify. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
