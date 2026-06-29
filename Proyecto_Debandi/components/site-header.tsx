"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Search, ShoppingCart, Heart, Moon, Sun, LogOut, User, Shield, Key, UserCog, Package, FileText, Download } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useFavorites } from "@/contexts/favorites-context"
import { useConfig } from "@/contexts/config-context"
import { useVendedor } from "@/contexts/vendedor-context"
import { useTheme } from "next-themes"
import { CartService } from "@/services/cart.service"
import { SearchService } from "@/services/search.service"
import AuthModal from "./auth-modal"
import ChangePasswordModal from "./change-password-modal"
import ProductPreviewModal from "./product-preview-modal"
import { Button } from "./ui/button"

interface SiteHeaderProps {
  onSearch?: (query: string) => void
}

export default function SiteHeader({ onSearch }: SiteHeaderProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user, logout, impersonation } = useAuth()
  const { stopImpersonation, logout: logoutVendedor } = useVendedor()
  const { favorites } = useFavorites()
  
  const [searchValue, setSearchValue] = useState("")
  const [globalSearchValue, setGlobalSearchValue] = useState("")
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchingGlobal, setSearchingGlobal] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [favoritesCount, setFavoritesCount] = useState(favorites.length || 0)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  // Banner de supervisor - lee del localStorage directamente
  const [bannerData, setBannerData] = useState<{ isImpersonating: boolean; vendedor?: { ven_nomb: string } } | null>(null)
  const [stoppingImpersonation, setStoppingImpersonation] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // BANNER: Leer directamente del localStorage para mostrar banner de supervisor
  useEffect(() => {
    const checkBannerState = () => {
      if (typeof window === 'undefined') return
      
      const savedImpersonation = localStorage.getItem('impersonation_state')
      
      if (savedImpersonation) {
        try {
          const parsed = JSON.parse(savedImpersonation)
          setBannerData(parsed)
        } catch (err) {
          setBannerData(null)
        }
      } else {
        setBannerData(null)
      }
    }

    // Verificar al montar
    checkBannerState()

    // Escuchar cambios en el localStorage
    const handleStorageChange = () => {
      checkBannerState()
    }

    // Listener explícito para impersonation-started
    const handleImpersonationStarted = (event: Event) => {
      setTimeout(() => {
        checkBannerState()
      }, 100)
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('storage-updated', handleStorageChange)
    window.addEventListener('impersonation-started', handleImpersonationStarted)
    window.addEventListener('impersonation-stopped', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('storage-updated', handleStorageChange)
      window.removeEventListener('impersonation-started', handleImpersonationStarted)
      window.removeEventListener('impersonation-stopped', handleStorageChange)
    }
  }, [])

  useEffect(() => {
    const loadCart = async () => {
      const items = await CartService.getCart()
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || item.carr_cant || 0), 0)
      setCartCount(totalQuantity)
    }
    if (mounted) {
      loadCart()
    }
  }, [mounted])

  useEffect(() => {
    setFavoritesCount(favorites.length)
  }, [favorites])

  // Listener para cart-updated event
  useEffect(() => {
    const handleCartUpdated = async () => {
      const items = await CartService.getCart()
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || item.carr_cant || 0), 0)
      setCartCount(totalQuantity)
    }

    window.addEventListener("cart-updated", handleCartUpdated)
    return () => window.removeEventListener("cart-updated", handleCartUpdated)
  }, [])

  // Búsqueda global
  const handleGlobalSearch = async (value: string) => {
    setGlobalSearchValue(value)
    
    if (!value.trim()) {
      setGlobalSearchResults([])
      setShowSearchDropdown(false)
      return
    }

    setSearchingGlobal(true)
    try {
      const results = await SearchService.searchArticulos(value, 10)
      setGlobalSearchResults(results || [])
      setShowSearchDropdown(true)
    } catch (error) {
      console.error("Search error:", error)
      setGlobalSearchResults([])
    } finally {
      setSearchingGlobal(false)
    }
  }

  const handleProductClick = (product: any) => {
    setSelectedProduct(product)
    setShowPreviewModal(true)
    setGlobalSearchValue("")
    setShowSearchDropdown(false)
  }

  const handleStopImpersonation = async () => {
    setStoppingImpersonation(true)
    try {
      await stopImpersonation()
    } catch (error) {
      console.error("Error stopping impersonation:", error)
    } finally {
      setStoppingImpersonation(false)
    }
  }

  const handleLogoutVendedor = async () => {
    try {
      localStorage.removeItem('vendedor_session')
      localStorage.removeItem('jwtToken')
      localStorage.removeItem('auth_user')
      localStorage.removeItem('impersonation_state')
      
      window.dispatchEvent(new CustomEvent('impersonation-stopped', {
        detail: {
          impersonation: {
            isImpersonating: false
          }
        }
      }))
      
      await logoutVendedor()
      router.push("/")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      router.push("/")
    }
  }

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  // Click fuera del dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
          setShowSearchDropdown(false)
        }
      }
    }

    if (showSearchDropdown) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showSearchDropdown])

  const currentTheme = theme || "light"

  return (
    <>
      {/* Banner de Supervisor/Impersonación - Lee del localStorage directamente */}
      {bannerData?.isImpersonating && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 sticky top-0 z-[60]">
          <div className="max-w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              <span className="font-medium text-sm">
                Modo Supervisor: Vendedor ({bannerData.vendedor?.ven_nomb || 'Vendedor'}) 
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleStopImpersonation}
                disabled={stoppingImpersonation}
                className="bg-amber-600 hover:bg-amber-700 text-white border-0"
              >
                {stoppingImpersonation ? "Saliendo..." : "Volver al Panel"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleLogoutVendedor}
                className="bg-red-600 hover:bg-red-700 text-white border-0"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header Principal */}
      <header className={`bg-background border-b border-border sticky ${bannerData?.isImpersonating ? 'top-10' : 'top-0'} z-50`}>
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 ml-8">
              <Image
                /* src="/logo_debandi_v2.png"*/
                /* "/logo_oscuro.png"   / oscuro */
                src={"/logo-def3.png"} /* /nuevo_logo_v5.png */
                alt="Debandi"
                width={140}
                height={32}
                priority
                className="rounded-lg"
              />
            </Link>

            {/* Buscador Centrado - Más largo */}
            <div className="flex-1 max-w-4xl mx-4 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscador..."
                  value={globalSearchValue}
                  onChange={(e) => handleGlobalSearch(e.target.value)}
                  onFocus={() => globalSearchValue.trim().length > 0 && setShowSearchDropdown(true)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />

                {/* Dropdown de búsqueda */}
                {showSearchDropdown && (
                  <div
                    ref={searchDropdownRef}
                    className="absolute top-full mt-2 w-full bg-background border border-input rounded-lg shadow-lg max-h-96 overflow-y-auto z-50"
                  >
                    {searchingGlobal ? (
                      <div className="p-4 text-center text-muted-foreground">Buscando...</div>
                    ) : globalSearchResults.length > 0 ? (
                      <div className="divide-y divide-border">
                        {globalSearchResults.map((product) => (
                          <button
                            key={product.art_codi}
                            onClick={() => handleProductClick(product)}
                            className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center gap-3"
                          >
                            {product.art_img && (
                              <div className="w-10 h-10 flex-shrink-0 rounded bg-muted">
                                <Image
                                  src={product.art_img}
                                  alt={product.art_nomb}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover rounded"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{product.art_nomb}</p>
                              {product.mar_nomb && <p className="text-xs text-muted-foreground">{product.mar_nomb}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground text-sm">No se encontraron productos</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Derecha: Favoritos, Carrito, Auth, Toggle */}
            <div className="flex items-center justify-end gap-4 flex-shrink-0">
              {/* Favoritos - Solo si está logueado */}
              {user && (
                <Link href="/favoritos" className="relative p-2 hover:bg-accent rounded-lg transition-colors" aria-label="Favoritos">
                  <Heart className="w-5 h-5" />
                  {favoritesCount > 0 && (
                    <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {favoritesCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Carrito - Solo si está logueado */}
              {user && (
                <Link href="/cart" className="relative p-2 hover:bg-accent rounded-lg transition-colors" aria-label="Carrito">
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {cartCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Auth / User Menu */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-accent rounded-lg transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span className="text-sm font-medium hidden sm:inline truncate max-w-xs">{user.firstName || "Usuario"}</span>
                  </button>

                  {mounted && showUserMenu && (
                    <>
                      {/* Overlay backdrop con desenfoque - Solo debajo del header */}
                      <div
                        className={`fixed left-0 right-0 bottom-0 backdrop-blur z-40 ${bannerData?.isImpersonating ? 'top-[140px]' : 'top-[90px]'}`}
                        onClick={() => setShowUserMenu(false)}
                      />
                      <div className={`absolute right-0 w-72 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-2 border-white/60 dark:border-white/40 rounded-lg shadow-2xl z-50 divide-y divide-white/20 ${bannerData?.isImpersonating ? 'top-full mt-2' : 'top-full mt-2'}`}>
                        <div className="px-4 py-3 text-center">
                          <p className="text-xs font-medium text-gray-900/80 dark:text-white/70">{user.email}</p>
                        </div>
                        <div className="divide-y divide-white/20">
                        <Link href="/pedidos" onClick={() => setShowUserMenu(false)} className="block px-4 py-3 text-sm text-gray-900/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                          <Package className="w-4 h-4 inline mr-3" />
                          Mis Pedidos
                        </Link>
                        <Link href="/favoritos" onClick={() => setShowUserMenu(false)} className="block px-4 py-3 text-sm text-gray-900/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                          <Heart className="w-4 h-4 inline mr-3" />
                          Mis Favoritos
                        </Link>
                        <Link href="/mis-datos" onClick={() => setShowUserMenu(false)} className="block px-4 py-3 text-sm text-gray-900/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                          <UserCog className="w-4 h-4 inline mr-3" />
                          Mis Datos
                        </Link>
                        <button
                          onClick={() => {
                            // Exportar Cuenta Corriente
                            setShowUserMenu(false)
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-900/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                          <Download className="w-4 h-4 inline mr-3" />
                          Exportar Cuenta Corriente
                        </button>
                        <button
                          onClick={() => {
                            // Exportar Facturas PDF
                            setShowUserMenu(false)
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-900/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                          <FileText className="w-4 h-4 inline mr-3" />
                          Exportar Facturas PDF
                        </button>
                        {/* <button
                          onClick={() => {
                            setShowChangePassword(true)
                            setShowUserMenu(false)
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-900/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                          <Key className="w-4 h-4 inline mr-3" />
                          Cambiar Contraseña
                        </button> */}
                        {!bannerData?.isImpersonating && (
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                          >
                            <LogOut className="w-4 h-4 inline mr-3" />
                            Cerrar Sesión
                          </button>
                        )}
                      </div>
                    </div>
                    </>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  style={{ backgroundColor: '#028EF9', color: 'white' }}
                >
                  Iniciar Sesión
                </Button>
              )}

              {/* Toggle Modo Oscuro - Posicionado al final, a la derecha */}
              <button
                onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                aria-label="Cambiar tema"
              >
                {currentTheme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modales */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
      {showPreviewModal && selectedProduct && (
        <ProductPreviewModal
          product={selectedProduct}
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false)
            setSelectedProduct(null)
          }}
        />
      )}
    </>
  )
}
