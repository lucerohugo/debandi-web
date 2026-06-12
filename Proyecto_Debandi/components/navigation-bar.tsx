"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, Home, Sparkles, List, Layers } from "lucide-react"
import { ConfigService } from "@/services/config.service"

interface Rubro {
  rub_codi: number
  rub_nomb: string
}

export default function NavigationBar() {
  const pathname = usePathname()
  const [rubros, setRubros] = useState<Rubro[]>([])
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasBanner, setHasBanner] = useState(false)

  useEffect(() => {
    const fetchRubros = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/rubros/`
        )
        if (response.ok) {
          const data = await response.json()
          // La API retorna paginado con {results: [...], count: ..., next: ..., etc}
          const rubrosList = data.results || data
          setRubros(Array.isArray(rubrosList) ? rubrosList : [])
        }
      } catch (error) {
        console.error("Error fetching rubros:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRubros()
  }, [])

  // Detectar si hay banner de supervisor
  useEffect(() => {
    const checkBanner = () => {
      if (typeof window === 'undefined') return
      
      const savedImpersonation = localStorage.getItem('impersonation_state')
      
      if (savedImpersonation) {
        try {
          const parsed = JSON.parse(savedImpersonation)
          setHasBanner(parsed.isImpersonating || false)
        } catch {
          setHasBanner(false)
        }
      } else {
        setHasBanner(false)
      }
    }

    checkBanner()

    // Escuchar cambios en localStorage
    window.addEventListener('storage', checkBanner)
    window.addEventListener('impersonation-started', checkBanner)
    window.addEventListener('impersonation-stopped', checkBanner)

    return () => {
      window.removeEventListener('storage', checkBanner)
      window.removeEventListener('impersonation-started', checkBanner)
      window.removeEventListener('impersonation-stopped', checkBanner)
    }
  }, [])

  const isActive = (path: string) => {
    return pathname === path
  }

  const overlayTopPosition = hasBanner ? 'calc(40px + 170px)' : '170px'

  return (
    <nav className="bg-background border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-8 py-3">
          {/* Inicio */}
          <Link
            href="/"
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors relative group ${
              isActive("/") 
                ? "text-primary" 
                : "text-foreground hover:text-primary"
            }`}
          >
            <Home className="w-4 h-4" />
            Inicio
            {isActive("/") && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t" />}
          </Link>

          {/* Catálogos (Rubros) */}
          <div className="relative group">
            <button
              onClick={() => setShowCatalogDropdown(!showCatalogDropdown)}
              className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
                pathname.includes("/listado") 
                  ? "text-primary" 
                  : "text-foreground hover:text-primary"
              }`}
            >
              <Layers className="w-4 h-4" />
              Catálogo
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Dropdown Catálogos */}
            {showCatalogDropdown && (
              <>
                {/* Overlay backdrop con desenfoque - Ajusta posición si hay banner */}
                <div
                  style={{ top: overlayTopPosition }}
                  className="fixed left-0 right-0 bottom-0 backdrop-blur z-40"
                  onClick={() => setShowCatalogDropdown(false)}
                />
                <div className="absolute left-0 mt-0 w-48 bg-background border border-input rounded-lg shadow-lg z-50">
                  {loading ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">Cargando...</div>
                  ) : rubros.length > 0 ? (
                    <div className="divide-y divide-border py-2">
                      {rubros.map((rubro) => (
                        <Link
                          key={rubro.rub_codi}
                          href={`/listado?rubro=${rubro.rub_codi}`}
                          onClick={() => setShowCatalogDropdown(false)}
                          className="block px-4 py-2 text-sm hover:bg-accent transition-colors"
                        >
                          {rubro.rub_nomb}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground">Sin catálogos disponibles</div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Listado de Productos */}
          <Link
            href="/listado"
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors relative group ${
              isActive("/listado")
                ? "text-primary"
                : "text-foreground hover:text-primary"
            }`}
          >
            <List className="w-4 h-4" />
            Listado de Productos
            {isActive("/listado") && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t" />}
          </Link>

          {/* Novedades */}
          <Link
            href="/listado?novedades=true"
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors relative group ${
              pathname.includes("novedades") 
                ? "text-primary" 
                : "text-foreground hover:text-primary"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Novedades
            {pathname.includes("novedades") && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t" />}
          </Link>
        </div>
      </div>
    </nav>
  )
}
