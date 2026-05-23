"use client"

import { useState } from "react"
import { Toaster } from "sonner"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Skip to content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Pular para o conteúdo principal
      </a>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div
        className={cn(
          "transition-all duration-300",
          collapsed ? "lg:ml-20" : "lg:ml-64"
        )}
      >
        <Header onMenuClick={() => setMobileOpen(true)} sidebarCollapsed={collapsed} />
        <main id="main-content" className="max-w-full overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
      <Toaster richColors />
    </div>
  )
}
