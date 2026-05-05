"use client"

import { useState } from "react"
import { ShoppingCart, Heart } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useFavorites } from "@/contexts/favorites-context"
import { formatCurrencySpanish } from "@/lib/format"
import { CartService } from "@/services/cart.service"
import AuthModal from "./auth-modal"
import NotificationToast from "./notification-toast"
import ProductPreviewModal from "./product-preview-modal"

interface ProductCardProps {
  product: {
    art_codi: number
    art_nomb: string
    art_pnet: number
    art_pfin: number
    art_stk: number
    art_img?: string
    mar_nomb?: string
    sru_nomb?: string
    art_acti?: boolean
  }
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
    // Verificar si el usuario está logueado
    if (!user) {
      setShowAuthModal(true)
      return
    }

    setIsAdding(true)

    try {
      // Agregar al carrito directamente con los datos del producto
      await CartService.addToCart(product.art_codi, 1, {
        art_nomb: product.art_nomb,
        art_pnet: product.art_pnet,
        art_pfin: product.art_pfin,
        art_stk: product.art_stk,
        art_img: product.art_img,
        mar_nomb: product.mar_nomb,
        sru_nomb: product.sru_nomb
      })

      // Mostrar notificación
      setNotificationMessage("Producto agregado al carrito")
      setNotificationType("success")
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 2000)

      // Disparar evento para actualizar el navbar
      window.dispatchEvent(new Event("cart-updated"))
    } catch (error: any) {
      // Mostrar error
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
    // Verificar si el usuario está logueado
    if (!user) {
      setShowAuthModal(true)
      return
    }
    // Si está logueado, agregar o quitar de favoritos
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
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow group flex flex-col h-full">
      <div 
        className="relative h-48 bg-muted overflow-hidden cursor-pointer"
        onClick={() => setShowPreview(true)}
      >
        <img
          src={product.art_img || "/placeholder.svg"}
          alt={product.art_nomb}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite()
          }}
          className="absolute top-3 left-3 bg-white rounded-full p-2 hover:bg-red-50 transition"
          title={!user ? "Inicia sesión para agregar a favoritos" : favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          <Heart className={`w-5 h-5 ${favorite ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-500"}`} />
        </button>
        {product.art_stk === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold">Agotado</span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 
          className="font-semibold text-foreground line-clamp-2 mb-2 cursor-pointer hover:text-primary transition"
          onClick={() => setShowPreview(true)}
        >
          {product.art_nomb}
        </h3>

        <div className="flex items-center gap-2 mb-4">
          {user && (
            <span className="text-2xl font-bold text-foreground">
              {formatCurrencySpanish(product.art_pfin)}
            </span>
          )}
        </div>

        <button
          onClick={user ? addToCart : () => setShowAuthModal(true)}
          disabled={product.art_stk === 0 || isAdding}
          className="w-full bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
        >
          <ShoppingCart className="w-5 h-5" />
          {isAdding ? "Agregando..." : user ? "Agregar al Carrito" : "Consultar"}
        </button>
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Notificación elegante */}
      <NotificationToast
        message={notificationMessage}
        type={notificationType}
        isOpen={showNotification}
        onClose={() => setShowNotification(false)}
        duration={3000}
      />

      {/* Modal de previsualizador */}
      <ProductPreviewModal
        product={product}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  )
}
