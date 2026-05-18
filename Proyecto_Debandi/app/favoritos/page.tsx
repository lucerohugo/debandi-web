"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { useFavorites } from "@/contexts/favorites-context"
import { useAuth } from "@/contexts/auth-context"
import { ApiService } from "@/services/api.service"
import { CartService } from "@/services/cart.service"
import { Button } from "@/components/ui/button"
import { Heart, ShoppingCart, ArrowLeft, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrencySpanish } from "@/lib/format"
import ProductPreviewModal from "@/components/product-preview-modal"

interface Product {
  art_codi: number
  art_nomb: string
  art_desc: string
  art_pnet: number
  art_pfin: number
  art_stk: number
  art_img_url?: string
  mar_nomb?: string
  sru_nomb?: string
  rub_nomb?: string
  art_acti: boolean
}

export default function FavoritesPage() {
  const { favoritesList, loading: favoritesLoading, removeFavorite } = useFavorites()
  const { user } = useAuth()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  })

  const handleAddToCart = async (product: Product) => {
    try {
      await CartService.addToCart(product.art_codi, 1, product)
      
      setNotification({
        show: true,
        message: "Producto agregado al carrito",
        type: "success",
      })

      setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }))
      }, 3000)
    } catch (error) {
      setNotification({
        show: true,
        message: "❌ Error al agregar al carrito",
        type: "error",
      })
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header onSearch={() => {}} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-8 h-8 fill-red-500 text-red-500" />
            <h1 className="text-3xl font-bold">Mis Favoritos</h1>
          </div>
          <p className="text-muted-foreground">
            {favoritesList.length} producto{favoritesList.length !== 1 ? "s" : ""} guardado{favoritesList.length !== 1 ? "s" : ""}
          </p>
        </div>

        {favoritesLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        ) : favoritesList.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Heart className="w-16 h-16 mx-auto text-gray-300" />
                <h2 className="text-xl font-semibold text-foreground">No tienes favoritos aún</h2>
                <p className="text-muted-foreground">
                  Agrega productos a favoritos para verlos aquí más tarde
                </p>
                <Link href="/listado">
                  <Button>Ir al Listado de Productos</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoritesList.map((product: any) => (
              <Card key={product.art_codi} className="overflow-hidden hover:shadow-lg transition">
                <div className="relative aspect-square bg-gray-100 overflow-hidden group">
                  <img
                    src={product.art_img_url || '/placeholder.jpg'}
                    alt={product.art_nomb}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  <button
                    onClick={() => removeFavorite(product.art_codi)}
                    className="absolute top-2 left-2 bg-white rounded-full p-2 hover:bg-red-50 transition"
                    title="Quitar de favoritos"
                  >
                    <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                  </button>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{product.mar_nomb || 'Sin marca'}</p>
                    <h3 className="font-semibold text-foreground line-clamp-2">{product.art_nomb}</h3>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-primary">{formatCurrencySpanish(product.art_pfin)}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSelectedProduct(product)}
                      variant="outline"
                      className="flex-1"
                    >
                      Ver Detalles
                    </Button>
                    <Button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.art_stk === 0}
                      className="flex-1"
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Agregar
                    </Button>
                  </div>

                  {product.art_stk === 0 && <p className="text-xs text-red-500 font-semibold">Sin Stock</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Notificación Toast */}
      {notification.show && (
        <div className={`fixed top-24 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border animate-in fade-in slide-in-from-top-2 duration-300 flex items-center justify-between gap-3 ${notification.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification((prev) => ({ ...prev, show: false }))}
            className="hover:opacity-70 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal de Detalles del Producto */}
      {selectedProduct && (
        <ProductPreviewModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  )
}
