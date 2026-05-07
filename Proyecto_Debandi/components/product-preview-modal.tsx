"use client"

import { useState } from "react"
import { X, ShoppingCart, Heart, Minus, Plus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useFavorites } from "@/contexts/favorites-context"
import { formatCurrencySpanish } from "@/lib/format"
import { CartService } from "@/services/cart.service"
import AuthModal from "./auth-modal"
import NotificationToast from "./notification-toast"
import { Button } from "./ui/button"
import { Input } from "./ui/input"

interface Product {
  art_codi: number
  art_nomb: string
  art_pnet: number
  art_pfin: number
  art_stk: number
  art_img?: string
  art_desc?: string
  mar_nomb?: string
  sru_nomb?: string
  rub_nomb?: string
  art_acti?: boolean
}

interface ProductPreviewModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
}

export default function ProductPreviewModal({ product, isOpen, onClose }: ProductPreviewModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [notificationType, setNotificationType] = useState<"success" | "error">("success")
  
  const { user } = useAuth()
  const { isFavorite, addFavorite, removeFavorite } = useFavorites()
  const favorite = isFavorite(product.art_codi)

  const finalPrice = product.art_pfin

  const total = (finalPrice * quantity).toFixed(2)

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value) || 0
    if (num > 0 && num <= product.art_stk) {
      setQuantity(num)
    }
  }

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  const handleIncrement = () => {
    if (quantity < product.art_stk) {
      setQuantity(quantity + 1)
    }
  }

  const handleAddToCart = async () => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    try {
      // Agregar al carrito directamente con los datos del producto
      await CartService.addToCart(product.art_codi, quantity, {
        art_nomb: product.art_nomb,
        art_pnet: product.art_pnet,
        art_pfin: product.art_pfin,
        art_stk: product.art_stk,
        art_img: product.art_img,
        mar_nomb: product.mar_nomb,
        sru_nomb: product.sru_nomb
      })

      setNotificationMessage(`✅ ${quantity} producto(s) agregado(s) al carrito`)
      setNotificationType("success")
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)

      // Disparar evento para actualizar el navbar
      window.dispatchEvent(new Event("cart-updated"))

      // Resetear cantidad
      setQuantity(1)
      setTimeout(onClose, 500)
    } catch (error: any) {
      // Mostrar error
      const errorMsg = error.response?.data?.error || "Error al agregar al carrito"
      setNotificationMessage(errorMsg)
      setNotificationType("error")
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Botón cerrar */}
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Detalles del Producto</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Imagen */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              <img
                src={product.art_img || "/placeholder.svg"}
                alt={product.art_nomb}
                className="w-full h-full object-cover"
              />
              {product.art_stk === 0 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">Agotado</span>
                </div>
              )}
            </div>
            <button
              onClick={toggleFavorite}
              className="w-full flex items-center justify-center gap-2 border border-border rounded-lg p-3 hover:bg-muted transition"
            >
              <Heart className={`w-5 h-5 ${favorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
              <span>{favorite ? "Quitar de Favoritos" : "Agregar a Favoritos"}</span>
            </button>
          </div>

          {/* Detalles */}
          <div className="flex flex-col gap-6">
            {/* Marca y Categoría */}
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">{product.mar_nomb}</p>
              <p className="text-xs text-muted-foreground">{product.rub_nomb || 'Sin Definir'}</p>
            </div>

            {/* Nombre */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{product.art_nomb}</h1>
            </div>

            {/* Precios */}
            <div className="flex items-baseline gap-3">
              {user && (
                <span className="text-3xl md:text-4xl font-bold text-foreground">{formatCurrencySpanish(finalPrice)}</span>
              )}
            </div>

            {/* Divisor */}
            <div className="h-px bg-border"></div>

            {/* Cantidad */}
            {user ? (
              product.art_stk > 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Cantidad</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDecrement}
                        disabled={quantity <= 1}
                        className="p-2 border border-border rounded-lg hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <Input
                        type="number"
                        min="1"
                        max={product.art_stk}
                        value={quantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        className="w-16 text-center"
                      />
                      <button
                        onClick={handleIncrement}
                        disabled={quantity >= product.art_stk}
                        className="p-2 border border-border rounded-lg hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <span className="text-xl font-bold">{formatCurrencySpanish(parseFloat(total))}</span>
                    </div>
                  </div>

                  {/* Botón agregar */}
                  <Button
                    onClick={handleAddToCart}
                    disabled={product.art_stk === 0}
                    className="w-full bg-primary text-primary-foreground py-3 text-lg font-semibold rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Agregar al Carrito
                  </Button>
                </div>
              )
            ) : (
              <Button
                onClick={() => setShowAuthModal(true)}
                className="w-full bg-primary text-primary-foreground py-3 text-lg font-semibold rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Consultar
              </Button>
            )}
          </div>
        </div>
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      <NotificationToast
        message={notificationMessage}
        type={notificationType}
        isOpen={showNotification}
        onClose={() => setShowNotification(false)}
        duration={3000}
      />
    </div>
  )
}
