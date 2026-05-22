"use client"

import { useState } from "react"
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
    <div className="min-h-screen bg-background">
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
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
