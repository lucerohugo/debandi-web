"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, ShoppingCart, Menu, X, User, LogOut, Shield, Heart, Package, Key, Download, UserCog } from "lucide-react"
import { playfairDisplay, poppins } from "@/lib/fonts"
import { useAuth } from "@/contexts/auth-context"
import { useVendedor } from "@/contexts/vendedor-context"
import { useConfig } from "@/contexts/config-context"
import { useFavorites } from "@/contexts/favorites-context"
import { CartService } from "@/services/cart.service"
import AuthModal from "./auth-modal"
import ChangePasswordModal from "./change-password-modal"
import { Button } from "./ui/button"

interface HeaderProps {
  onSearch: (query: string) => void
  onSearchClick?: () => void
}

export default function Header({ onSearch, onSearchClick }: HeaderProps) {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [cartCount, setCartCount] = useState(0)
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [stoppingImpersonation, setStoppingImpersonation] = useState(false)
  const { user, logout, impersonation } = useAuth()
  const { stopImpersonation, logout: logoutVendedor } = useVendedor()
  const { config, loading } = useConfig()
  const { favorites } = useFavorites()

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
      await stopImpersonation()
      await logoutVendedor()
      router.push("/")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  useEffect(() => {
    const updateCartCount = async () => {
      if (!user) {
        setCartCount(0)
        return
      }

      try {
        const cartItems = await CartService.getCart()
        const count = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0)
        setCartCount(count)
      } catch (error) {
        setCartCount(0)
      }
    }

    updateCartCount()
    
    // Escuchar eventos de actualización de carrito
    window.addEventListener("cart-updated", updateCartCount)
    return () => window.removeEventListener("cart-updated", updateCartCount)
  }, [user])

  useEffect(() => {
    setFavoritesCount(favorites.length)
  }, [favorites])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value)
    onSearch(e.target.value)
  }

  return (
    <>
      {/* Banner de Supervisor/Impersonación */}
      {impersonation.isImpersonating && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 sticky top-0 z-[60]">
          <div className="max-w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              <span className="font-medium text-sm">
                Modo Supervisor: Vendedor ({impersonation.vendedor?.ven_nomb || 'Vendedor'}) 
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
      
      <header className={`bg-primary text-primary-foreground sticky ${impersonation.isImpersonating ? 'top-10' : 'top-0'} z-50 shadow-md`}>
      <div className="max-w-full px-4 py-4">
        <div className="flex items-center justify-between gap-8">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            {!loading && (
              <img 
                src={
                  config?.gen_logo && config.gen_logo.trim()
                    ? (config.gen_logo.startsWith('http') 
                        ? config.gen_logo 
                        : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000'}${config.gen_logo}`)
                    : "/logo-debandi.svg"
                } 
                alt={config?.gen_nomb || "Debandi"} 
                className="h-12 w-auto"
              />
            )}
            {loading && (
              <div className="h-12 w-12 bg-primary-foreground/10 rounded animate-pulse" />
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
            <Link href="/" className={`px-3 py-2 hover:bg-primary-foreground/10 rounded transition ${poppins.className} text-sm font-medium`}>
              Inicio
            </Link>
            {user && (
              <Link href="/listado" className={`px-3 py-2 hover:bg-primary-foreground/10 rounded transition ${poppins.className} text-sm font-medium`}>
                Listado De Productos
              </Link>
            )}
            <Link href="/contacto" className={`px-3 py-2 hover:bg-primary-foreground/10 rounded transition ${poppins.className} text-sm font-medium`}>
              Contacto
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4 flex-shrink-0 ml-auto">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchValue}
                onChange={handleSearch}
                onClick={onSearchClick}
                className="bg-gradient-to-r from-white to-gray-50 text-foreground pl-12 pr-5 py-2.5 rounded-full w-72 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 border border-gray-200 hover:border-gray-300 transition-all placeholder:text-gray-400 shadow-sm hover:shadow-md"
              />
            </div>
            <button 
              onClick={() => {
                if (user) {
                  router.push("/cart")
                } else {
                  setShowAuthModal(true)
                }
              }}
              className="relative p-2 hover:bg-primary-foreground/10 rounded transition"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => {
                if (user) {
                  router.push("/favoritos")
                } else {
                  setShowAuthModal(true)
                }
              }}
              className="p-2 hover:bg-primary-foreground/10 rounded transition relative"
            >
              <Heart className="w-6 h-6" />
              {favoritesCount > 0 && (
                <span className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </button>
            
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-2 hover:bg-primary-foreground/10 rounded transition"
                >
                  <User className="w-6 h-6" />
                  <span>{user.firstName || user.email}</span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-background text-foreground rounded-lg shadow-xl border py-3 z-50">
                    {/* Encabezado con datos del usuario */}
                    <div className="px-4 py-3 border-b bg-accent/5">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base leading-tight text-foreground">{user.firstName || "Usuario"}</p>
                          <p className="text-xs text-muted-foreground mt-1 break-words overflow-hidden">{user.email}</p>
                        </div>
                      </div>
                      {user.isAdmin && !impersonation.isImpersonating && (
                        <span className="inline-block text-xs bg-accent/20 text-accent px-2 py-1 rounded-full font-medium mt-3">
                          👑 Administrador
                        </span>
                      )}
                    </div>
                    
                    {/* Opciones de menú */}
                    <nav className="py-1">
                      {user.isAdmin && !impersonation.isImpersonating && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/10 transition text-sm"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Shield className="w-5 h-5 text-accent" />
                          <span className="font-medium">Panel Admin</span>
                        </Link>
                      )}
                      <Link
                        href="/pedidos"
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/10 transition text-sm"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Package className="w-5 h-5 text-accent" />
                        <span className="font-medium">Mis Pedidos</span>
                      </Link>
                      <Link
                        href="/favoritos"
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/10 transition text-sm"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Heart className="w-5 h-5 text-accent" />
                        <span className="font-medium">Mis Favoritos</span>
                      </Link>
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          // TODO: Implementar exportar cuenta corriente
                          alert("Función en desarrollo")
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/10 transition w-full text-left text-sm"
                      >
                        <Download className="w-5 h-5 text-accent" />
                        <span className="font-medium">Exportar Cuenta Corriente</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          // TODO: Implementar exportar facturas PDF
                          alert("Función en desarrollo")
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/10 transition w-full text-left text-sm"
                      >
                        <Download className="w-5 h-5 text-accent" />
                        <span className="font-medium">Exportar Facturas PDF</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          setShowChangePassword(true)
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/10 transition w-full text-left text-sm"
                      >
                        <Key className="w-5 h-5 text-accent" />
                        <span className="font-medium">Cambiar Contraseña</span>
                      </button>
                    </nav>
                    
                    {/* Cerrar Sesión - Solo mostrar si NO está impersonando */}
                    {!impersonation.isImpersonating && (
                      <div className="border-t pt-2">
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            logout()
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition w-full text-left text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          <LogOut className="w-5 h-5" />
                          Cerrar Sesión
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <Button
                onClick={() => setShowAuthModal(true)}
                variant="outline"
                className="bg-primary-foreground/10"
              >
                Iniciar Sesión
              </Button>
            )}
          </div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2">
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden space-y-4 pb-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchValue}
                onChange={handleSearch}
                onClick={onSearchClick}
                className="bg-gradient-to-r from-white to-gray-50 text-foreground pl-12 pr-5 py-2.5 rounded-full w-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 border border-gray-200 hover:border-gray-300 transition-all placeholder:text-gray-400 shadow-sm hover:shadow-md"
              />
            </div>
            <nav className="flex flex-col gap-2">
              <Link href="/" className="hover:opacity-80 transition py-2">
                Inicio
              </Link>
              {user && (
                <Link href="/listado" className="hover:opacity-80 transition py-2">
                  Listado De Productos
                </Link>
              )}
              <Link href="/contacto" className="hover:opacity-80 transition py-2">
                Contacto
              </Link>
            </nav>
            <button 
              onClick={() => {
                if (user) {
                  router.push("/cart")
                } else {
                  setShowAuthModal(true)
                }
              }}
              className="flex items-center gap-2 py-2 hover:opacity-80 transition w-full"
            >
              <ShoppingCart className="w-5 h-5" />
              Carrito ({cartCount})
            </button>
            <button 
              onClick={() => {
                if (user) {
                  router.push("/favoritos")
                } else {
                  setShowAuthModal(true)
                }
              }}
              className="flex items-center gap-2 py-2 hover:opacity-80 transition w-full"
            >
              <Heart className="w-5 h-5" />
              Mis Favoritos {favoritesCount > 0 && `(${favoritesCount})`}
            </button>
            
            {user ? (
              <div className="space-y-2 border-t pt-4 mt-4">
                {/* Info de usuario mejorada */}
                <div className="flex items-center gap-3 px-3 py-2 bg-accent/10 rounded-lg">
                  <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight">{user.firstName || "Usuario"}</p>
                    <p className="text-xs text-muted-foreground break-all">{user.email}</p>
                  </div>
                </div>
                
                {user.isAdmin && !impersonation.isImpersonating && (
                  <span className="inline-block text-xs bg-accent/20 text-accent px-2 py-1 rounded-full font-medium">
                    👑 Admin
                  </span>
                )}
                
                {/* Opciones de menú */}
                <div className="space-y-1 pt-2">
                  {user.isAdmin && !impersonation.isImpersonating && (
                    <Link href="/admin" className="flex items-center gap-3 px-3 py-2 hover:bg-accent/10 rounded transition text-sm">
                      <Shield className="w-5 h-5 text-accent" />
                      <span className="font-medium">Panel Admin</span>
                    </Link>
                  )}
                  <Link href="/pedidos" className="flex items-center gap-3 px-3 py-2 hover:bg-accent/10 rounded transition text-sm">
                    <Package className="w-5 h-5 text-accent" />
                    <span className="font-medium">Mis Pedidos</span>
                  </Link>
                  <Link href="/favoritos" className="flex items-center gap-3 px-3 py-2 hover:bg-accent/10 rounded transition text-sm">
                    <Heart className="w-5 h-5 text-accent" />
                    <span className="font-medium">Mis Favoritos</span>
                  </Link>
                  <button 
                    onClick={() => {
                      // TODO: Implementar exportar cuenta corriente
                      alert("Función en desarrollo")
                    }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-accent/10 rounded transition w-full text-left text-sm"
                  >
                    <Download className="w-5 h-5 text-accent" />
                    <span className="font-medium">Exportar Cuenta Corriente</span>
                  </button>
                  <button 
                    onClick={() => {
                      // TODO: Implementar exportar facturas PDF
                      alert("Función en desarrollo")
                    }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-accent/10 rounded transition w-full text-left text-sm"
                  >
                    <Download className="w-5 h-5 text-accent" />
                    <span className="font-medium">Exportar Facturas PDF</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowChangePassword(true)
                    }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-accent/10 rounded transition w-full text-left text-sm"
                  >
                    <Key className="w-5 h-5 text-accent" />
                    <span className="font-medium">Cambiar Contraseña</span>
                  </button>
                </div>
                
                {/* Cerrar sesión - Solo mostrar si NO está impersonando */}
                {!impersonation.isImpersonating && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                      logout()
                    }}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-red-50 rounded transition w-full text-left text-sm text-red-600 hover:text-red-700 font-medium mt-2 border-t pt-3"
                  >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión
                  </button>
                )}
              </div>
            ) : (
              <Button onClick={() => setShowAuthModal(true)} className="w-full mt-2">
                Iniciar Sesión
              </Button>
            )}
          </div>
        )}
      </div>
      
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </header>
    </>
  )
}
