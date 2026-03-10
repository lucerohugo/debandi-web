"use client"

import { Heart } from "lucide-react"
import { useFavorites } from "@/contexts/favorites-context"
import { Button } from "./ui/button"
import { useState } from "react"

interface FavoriteButtonProps {
  productId: number
  className?: string
}

export default function FavoriteButton({ productId, className = "" }: FavoriteButtonProps) {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites()
  const favorite = isFavorite(productId)
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState("")

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (favorite) {
      removeFavorite(productId)
      setNotificationMessage("Eliminaste el producto de Mis favoritos")
    } else {
      addFavorite(productId)
      setNotificationMessage("Se agregó a Mis favoritos")
    }

    setShowNotification(true)
    setTimeout(() => setShowNotification(false), 1500)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleFavorite}
        className={`${favorite ? "text-red-500" : "text-gray-400 hover:text-red-500"} transition ${className}`}
        title={favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
      >
        <Heart className={`w-5 h-5 ${favorite ? "fill-current" : ""}`} />
      </Button>

      {/* Notificación flotante */}
      {showNotification && (
        <div className="fixed bottom-24 right-4 z-50 px-4 py-3 rounded-lg shadow-lg bg-green-50 border border-green-200 text-green-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="text-sm font-medium">{notificationMessage}</span>
        </div>
      )}
    </>
  )
}
