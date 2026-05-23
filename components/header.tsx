"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bell, Search, Plus, Calendar, Menu } from "lucide-react"

interface HeaderProps {
  onMenuClick: () => void
  sidebarCollapsed: boolean
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar leads, conversas..."
            className="w-48 border-0 bg-secondary pl-10 md:w-64 lg:w-80"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Mobile search */}
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Search className="h-5 w-5" />
        </Button>
        
        <div className="hidden items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground md:flex md:px-4">
          <Calendar className="h-4 w-4" />
          <span className="hidden lg:inline">{today}</span>
        </div>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
            3
          </span>
        </Button>
        <Button size="icon" className="bg-foreground text-background hover:bg-foreground/90 sm:hidden">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
