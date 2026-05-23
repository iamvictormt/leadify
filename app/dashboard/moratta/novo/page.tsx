"use client"

import { ProjectWizard } from "../components/ProjectWizard"

export default function NovoProjetoPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo Projeto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha os parâmetros abaixo para gerar uma planta baixa conceitual com IA.
        </p>
      </div>

      <ProjectWizard />
    </div>
  )
}
