"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useVendedor } from "@/contexts/vendedor-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { UserCog, LogOut, ImageIcon, Package, ClipboardList } from "lucide-react"

const TABS = [
  { href: "/vendedor/articulos", label: "Artículos", icon: Package },
  { href: "/vendedor/clientes", label: "Pedidos Clientes", icon: ClipboardList },
]

/**
 * Header del panel de vendedor con las solapas de navegación
 * (Artículos / Pedidos Clientes)
 */
export default function VendedorHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { vendedor, logout } = useVendedor()

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  return (
    <div className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <UserCog className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Panel de Vendedor</h1>
              <p className="text-sm text-muted-foreground">
                {vendedor?.ven_nomb || vendedor?.ven_usua}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {Boolean(vendedor?.ven_gere) && (
              <Button variant="outline" asChild>
                <a href="/imagenes/articulos" target="_blank" rel="noopener noreferrer">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Gestor de Imágenes
                </a>
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Solapas */}
        <nav className="flex gap-1 mt-4 -mb-px">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium border border-b-0 rounded-t-md transition-colors",
                  active
                    ? "bg-slate-50 text-primary border-slate-200"
                    : "bg-slate-100 text-muted-foreground border-transparent hover:text-foreground hover:bg-slate-200"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
