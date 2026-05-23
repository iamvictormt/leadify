"use client"

import { useParams } from "next/navigation"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Redirect from /dashboard/moratta/projetos/[id] to /dashboard/moratta/[id]
 * The ProjectWizard uses this path, but the canonical route is /dashboard/moratta/[id]
 */
export default function ProjetosRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  useEffect(() => {
    router.replace(`/dashboard/moratta/${id}`)
  }, [id, router])

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecionando...</p>
    </div>
  )
}
