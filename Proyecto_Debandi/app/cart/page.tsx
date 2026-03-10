"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/header"
import Footer from "@/components/footer"
import CartItems from "@/components/cart-items"
import CartSummary from "@/components/cart-summary"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { exportToPDF, exportToExcel } from "@/lib/export-utils"
import { CartService, type CartItem } from "@/services/cart.service"

interface Product extends CartItem {
  quantity: number
}

export default function CartPage() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      // Exportar carrito - configuracion viene del backend
      await exportToPDF(items as any, "carrito-debandi", "carrito")
    } catch (error) {
      // Silent error
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportExcel = () => {
    setIsExporting(true)
    try {
      // Exportar directamente los items del carrito (ya tienen estructura de Product del backend)
      exportToExcel(items as any)
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    // Redirigir si no está logueado
    if (!user) {
      router.push("/")
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
  }, [user, router])

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

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header onSearch={() => {}} />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
          <div className="animate-pulse">Cargando carrito...</div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header onSearch={() => {}} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-75 transition mb-6">
          <ArrowLeft className="w-5 h-5" />
          Volver al Catálogo
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">Tu Carrito</h1>

        {items.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-xl text-muted-foreground mb-4">Tu carrito está vacío</p>
            <Link
              href="/"
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
        {items.length > 0 && (
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
        )}
      </main>

      <Footer />
    </div>
  )
}
