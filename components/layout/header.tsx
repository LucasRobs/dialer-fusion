"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Phone, User, Settings, LogOut, Menu, X } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { useSupabase } from "@/components/supabase-provider"
import { cn } from "@/lib/utils"

export function Header() {
  const pathname = usePathname()
  const { user, signOut } = useSupabase()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      active: pathname === "/dashboard",
      icon: <Phone className="h-4 w-4 mr-2" />,
    },
    {
      href: "/assistants",
      label: "Assistentes",
      active: pathname === "/assistants" || pathname.startsWith("/assistants/"),
      icon: <User className="h-4 w-4 mr-2" />,
    },
    {
      href: "/settings",
      label: "Configurações",
      active: pathname === "/settings",
      icon: <Settings className="h-4 w-4 mr-2" />,
    },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">Dialer Fusion</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex items-center text-sm font-medium transition-colors hover:text-primary",
                  route.active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {route.icon}
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
          )}
        </div>
        <Button variant="ghost" className="md:hidden" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden border-t p-4">
          <nav className="flex flex-col gap-4">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex items-center text-sm font-medium transition-colors hover:text-primary p-2 rounded-md",
                  route.active ? "text-primary bg-muted" : "text-muted-foreground",
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {route.icon}
                {route.label}
              </Link>
            ))}
            {user ? (
              <Button
                variant="ghost"
                className="justify-start px-2"
                onClick={() => {
                  signOut()
                  setMobileMenuOpen(false)
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            ) : (
              <Button asChild className="mt-2" onClick={() => setMobileMenuOpen(false)}>
                <Link href="/login">Entrar</Link>
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
