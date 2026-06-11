"use client"

import { useState } from "react"
import Image from "next/image"
import { ShoppingCart, Heart } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useFavorites } from "@/contexts/favorites-context"
import { formatCurrencySpanish, applyDiscountToPrice } from "@/lib/format"
import { CartService } from "@/services/cart.service"
import AuthModal from "./auth-modal"
import NotificationToast from "./notification-toast"
import ProductPreviewModal from "./product-preview-modal"
import StockIndicator from "./stock-indicator"
import { Button } from "./ui/button"

interface Product {
  art_codi: number
  art_nomb: string
  art_pnet?: number
  art_pfin: number
  art_stk: number
  art_img?: string
  mar_nomb?: string
  rub_nomb?: string
  grupo?: string
  art_acti?: boolean
}

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [notificationType, setNotificationType] = useState<"success" | "error">("success")
  const [showPreview, setShowPreview] = useState(false)

  const { user } = useAuth()
  const { isFavorite, addFavorite, removeFavorite } = useFavorites()
  const favorite = isFavorite(product.art_codi)

  const addToCart = async () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    setIsAdding(true)

    try {
      await CartService.addToCart(product.art_codi, 1, {
        art_nomb: product.art_nomb,
        art_pnet: product.art_pnet || product.art_pfin,
        art_pfin: product.art_pfin,
        art_stk: product.art_stk,
        art_img: product.art_img,
        mar_nomb: product.mar_nomb,
        rub_nomb: product.rub_nomb,
      })

      setNotificationMessage("Producto agregado al carrito")
      setNotificationType("success")
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 2000)
      window.dispatchEvent(new Event("cart-updated"))
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Error al agregar al carrito"
      setNotificationMessage(errorMsg)
      setNotificationType("error")
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)
    } finally {
      setTimeout(() => setIsAdding(false), 300)
    }
  }

  const toggleFavorite = () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    if (favorite) {
      removeFavorite(product.art_codi)
      setNotificationMessage("Eliminaste el producto de Mis favoritos")
      setNotificationType("error")
    } else {
      addFavorite(product.art_codi)
      setNotificationMessage("Se agregó a Mis favoritos")
      setNotificationType("success")
    }
    setShowNotification(true)
    setTimeout(() => setShowNotification(false), 3000)
  }

  return (
    <>
      <div className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow group flex flex-col h-full">
        {/* Imagen del producto */}
        <div
          className="relative w-full aspect-square bg-muted overflow-hidden cursor-pointer"
          onClick={() => setShowPreview(true)}
        >
          {product.art_img ? (
            <Image
              src={product.art_img}
              alt={product.art_nomb}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sin imagen</div>
          )}

          {/* Botón Favoritos - arriba a la derecha */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              toggleFavorite()
            }}
            className="absolute top-2 right-2 bg-background rounded-full p-1.5 hover:bg-accent transition-colors shadow-sm z-10"
            title={!user ? "Inicia sesión para agregar a favoritos" : favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            aria-label="Agregar a favoritos"
          >
            <Heart className={`w-4 h-4 ${favorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-3 flex flex-col flex-grow">
          {/* Grupo/Marca */}
          {product.mar_nomb && (
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-1">
              {product.mar_nomb}
            </p>
          )}

          {/* Nombre del producto */}
          <h3
            className="text-sm font-medium text-foreground line-clamp-2 mb-3 cursor-pointer hover:text-primary transition"
            onClick={() => setShowPreview(true)}
          >
            {product.art_nomb}
          </h3>

          {/* Precio */}
          <p className="text-lg font-bold text-foreground mb-3">
            {formatCurrencySpanish(applyDiscountToPrice(product.art_pfin, user?.cli_desc || 0))}
          </p>

          {/* Indicador de Stock */}
          {user && (
            <div className="mb-3">
              <StockIndicator stock={product.art_stk} maxStock={100} />
            </div>
          )}

          {/* Botón Agregar al carrito */}
          <Button
            onClick={addToCart}
            disabled={isAdding}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-auto text-sm"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {isAdding ? "Agregando..." : "Agregar al Carrito"}
          </Button>
        </div>
      </div>

      {/* Modales */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      {showNotification && (
        <NotificationToast
          message={notificationMessage}
          type={notificationType}
          onClose={() => setShowNotification(false)}
        />
      )}
      {showPreview && (
        <ProductPreviewModal
          product={product}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  )
}
