"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import SiteHeader from "@/components/site-header"
import NavigationBar from "@/components/navigation-bar"
import Footer from "@/components/footer"
import CartItems from "@/components/cart-items"
import CartSummary from "@/components/cart-summary"
import Link from "next/link"
import { ArrowLeft, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/contexts/auth-context"
import { useVendedor } from "@/contexts/vendedor-context"
import { Button } from "@/components/ui/button"
import { ExportUtils } from "@/lib/export-utils"
import { CartService, type CartItem } from "@/services/cart.service"
import NotificationToast from "@/components/notification-toast"
import ClientCartView from "@/components/client-cart-view"

interface Product extends CartItem {
  quantity: number
}

export default function CartPage() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null)
  const { user, impersonation } = useAuth()
  const { isVendedorSession } = useVendedor()
  // Vendedor suplantando: además de su carrito puede ver el propio del cliente
  const puedeVerCarritoCliente = Boolean(user && impersonation?.isImpersonating)
  const [vista, setVista] = useState<'mio' | 'cliente'>('mio')
  const verCliente = puedeVerCarritoCliente && vista === 'cliente'
  const router = useRouter()

  const handleExportPDF = async () => {
    if (items.length === 0) {
      setNotification({
        type: 'error',
        message: '✗ El carrito está vacío'
      })
      return
    }

    setIsExporting(true)
    try {
      // Exportar items del carrito a PDF
      await ExportUtils.exportarCarritoPDF(items as any)
      
      setNotification({
        type: 'success',
        message: 'Carrito exportado a PDF correctamente'
      })
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error("Error al exportar PDF:", error)
      setNotification({
        type: 'error',
        message: " No se pudo exportar el carrito a PDF"
      })
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportExcel = async () => {
    if (items.length === 0) {
      setNotification({
        type: 'error',
        message: '✗ El carrito está vacío'
      })
      return
    }

    setIsExporting(true)
    try {
      // Exportar items del carrito a Excel
      await ExportUtils.exportarCarritoExcel(items as any)
      
      setNotification({
        type: 'success',
        message: 'Carrito exportado a Excel correctamente'
      })
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error("Error al exportar Excel:", error)
      setNotification({
        type: 'error',
        message: "No se pudo exportar el carrito a Excel"
      })
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    // Redirigir si no está logueado
    if (!user) {
      // Si es un vendedor saliendo de la impersonación, stopImpersonation ya redirige al panel
      if (!isVendedorSession) router.push("/")
      return
    }

    // Obtener carrito desde el backend
    const loadCart = async () => {
      try {
        const cartItems = await CartService.getCart()
        setItems(cartItems as any)
      } catch (error) {
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    loadCart()

    // Escuchar evento de carrito limpiado desde la página de transferencia
    const handleCartCleared = () => {
      setItems([])
      CartService.clearCartCache()
    }

    window.addEventListener("cartCleared", handleCartCleared)
    window.addEventListener("cartUpdated", loadCart)

    return () => {
      window.removeEventListener("cartCleared", handleCartCleared)
      window.removeEventListener("cartUpdated", loadCart)
    }
  }, [user, router, isVendedorSession])

  const updateCart = async (newItems: (Product & { quantity: number })[]) => {
    try {
      // Detectar items que fueron eliminados
      const removedItems = items.filter(
        oldItem => !newItems.find(newItem => newItem.art_codi === oldItem.art_codi)
      )
      
      // Eliminar items en el backend
      for (const item of removedItems) {
        await CartService.removeFromCart(item.art_codi)
      }
      
      // Actualizar cantidades en el backend
      for (const item of newItems) {
        if (item.quantity > 0) {
          await CartService.updateCart(item.art_codi, item.quantity)
        }
      }
      
      // Actualizar el estado sin refrescar precios del backend
      setItems(newItems)
      
      // Disparar evento para actualizar el navbar
      window.dispatchEvent(new Event("cart-updated"))
    } catch (error) {
      // Silent error
    }
  }

  const handleClearCart = async () => {
    setIsClearing(true)
    try {
      await CartService.clearCart()
      setItems([])
      setNotification({
        type: 'success',
        message: 'Carrito vaciado correctamente'
      })
    } catch (error) {
      // Recargar para reflejar lo que haya quedado en el backend
      const cartItems = await CartService.getCart().catch(() => [])
      setItems(cartItems as any)
      setNotification({
        type: 'error',
        message: 'No se pudo vaciar el carrito completamente'
      })
    } finally {
      setIsClearing(false)
      setTimeout(() => setNotification(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
          <div className="animate-pulse">Cargando carrito...</div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <NavigationBar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <Link href="/listado" className="flex items-center gap-2 text-primary hover:opacity-75 transition mb-6">
          <ArrowLeft className="w-5 h-5" />
          Seguir Comprando
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {verCliente ? "Carrito del cliente" : "Tu Carrito"}
          </h1>

          {!verCliente && items.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isClearing}
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isClearing ? "Vaciando..." : "Vaciar carrito"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Vaciar el carrito?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán todos los productos del carrito ({items.length}). Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearCart}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Sí, vaciar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {puedeVerCarritoCliente && (
          <div className="flex mb-4 sm:mb-6 border-b border-border">
            {([['mio', 'Mi carrito'], ['cliente', 'Carrito del cliente']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setVista(key)}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 -mb-px border-b-2 text-sm sm:text-base font-medium whitespace-nowrap transition ${
                  vista === key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {verCliente ? (
          <ClientCartView />
        ) : items.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-xl text-muted-foreground mb-4">Tu carrito está vacío</p>
            <Link
              href="/listado"
              className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 transition"
            >
              Seguir Comprando
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <CartItems items={items} onUpdate={updateCart} />
            </div>
            <div>
              <CartSummary items={items} />
            </div>
          </div>
        )}

        {/* Sección de Exportación del Carrito */}
        {/* comentar dsp para no mezclar el exportar de mis pedidos ,que sea confuso con este */}
        {/* {items.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6 mt-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Exportar Carrito</h2>
            <p className="text-muted-foreground mb-4">
              Descarga los productos de tu carrito en tu formato preferido
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={handleExportPDF}
                disabled={isExporting}
                variant="outline"
              >
                 Exportar PDF
              </Button>
              <Button
                onClick={handleExportExcel}
                disabled={isExporting}
                variant="outline"
              >
                 Exportar Excel
              </Button>
            </div>
          </div>
        )} */}
      </main>

      <Footer />
      
      {notification && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          isOpen={!!notification}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  )
}
