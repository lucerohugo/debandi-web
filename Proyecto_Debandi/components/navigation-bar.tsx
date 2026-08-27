"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, Home, Sparkles, List, Layers, FileDown, Mail, Loader2 } from "lucide-react"
import { ConfigService } from "@/services/config.service"
import { ExportUtils } from "@/lib/export-utils"
import { useAuth } from "@/contexts/auth-context"

interface Rubro {
  rub_codi: number
  rub_nomb: string
}

export default function NavigationBar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [rubros, setRubros] = useState<Rubro[]>([])
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const catalogBtnRef = useRef<HTMLButtonElement>(null)
  const [loading, setLoading] = useState(true)
  const [hasBanner, setHasBanner] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [notification, setNotification] = useState<{ message: string; show: boolean }>({ message: '', show: false })

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

  const overlayTopPosition = hasBanner ? 'calc(40px + 162px)' : '162px'

  const handleExportPDF = async () => {
    setIsExporting(true)
    setShowCatalogDropdown(false)
    setNotification({ message: 'Descargando PDF, espere...', show: true })
    try {
      await ExportUtils.exportarPDF()
      setNotification({ message: 'PDF descargado exitosamente', show: true })
      setTimeout(() => setNotification({ message: '', show: false }), 3000)
    } catch (error) {
      console.error('Error al exportar PDF:', error)
      setNotification({ message: 'Error al exportar PDF', show: true })
      setTimeout(() => setNotification({ message: '', show: false }), 5000)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportExcel = async () => {
    setIsExporting(true)
    setShowCatalogDropdown(false)
    setNotification({ message: 'Descargando Excel, espere...', show: true })
    try {
      await ExportUtils.exportarExcel()
      setNotification({ message: 'Excel descargado exitosamente', show: true })
      setTimeout(() => setNotification({ message: '', show: false }), 3000)
    } catch (error) {
      console.error('Error al exportar Excel:', error)
      setNotification({ message: 'Error al exportar Excel', show: true })
      setTimeout(() => setNotification({ message: '', show: false }), 5000)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <nav id="main-navigation" className="bg-background border-b border-border">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex items-center gap-3 sm:gap-6 lg:gap-8 py-3 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

          {/* Catálogos (Rubros) - Solo visible si el usuario inició sesión */}
          {user && (
          <div className="relative group">
            <button
              ref={catalogBtnRef}
              onClick={() => {
                if (!showCatalogDropdown && catalogBtnRef.current) {
                  const rect = catalogBtnRef.current.getBoundingClientRect()
                  setDropdownPos({ top: rect.bottom, left: rect.left })
                }
                setShowCatalogDropdown(!showCatalogDropdown)
              }}
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
                <div
                  style={{ top: dropdownPos.top, left: dropdownPos.left }}
                  className="fixed mt-1 w-56 max-w-[calc(100vw-2rem)] bg-background border border-input rounded-lg shadow-lg z-50"
                >
                  <div className="divide-y divide-border py-2">
                    {/* Opción: Exportar PDF */}
                    <button
                      onClick={handleExportPDF}
                      disabled={isExporting}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <FileDown className="w-4 h-4" />
                      Exportar PDF
                    </button>

                    {/* Opción: Exportar Excel */}
                    <button
                      onClick={handleExportExcel}
                      disabled={isExporting}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <FileDown className="w-4 h-4" />
                      Exportar Excel
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          )}

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
            href="/novedades"
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors relative group ${
              pathname === "/novedades" 
                ? "text-primary" 
                : "text-foreground hover:text-primary"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Novedades
            {pathname === "/novedades" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t" />}
          </Link>

          {/* Contacto */}
          <Link
            href="/contacto"
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors relative group ${
              pathname === "/contacto" 
                ? "text-primary" 
                : "text-foreground hover:text-primary"
            }`}
          >
            <Mail className="w-4 h-4" />
            Contacto
            {pathname === "/contacto" && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t" />}
          </Link>
        </div>
      </div>

      {/* Notificación de exportación */}
      {notification.show && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg z-[100] flex items-center gap-2">
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          {notification.message}
        </div>
      )}
    </nav>
  )
}
