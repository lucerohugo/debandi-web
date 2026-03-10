"use client"

import React, { useState, useEffect } from "react"
import { X } from "lucide-react"

interface WelcomeModalProps {
  firstName: string
  isOpen: boolean
  onClose: () => void
}

export default function WelcomeModal({ firstName, isOpen, onClose }: WelcomeModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose()
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!mounted || !isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-light text-gray-900">
              ¡Bienvenido, <span className="font-semibold">{firstName}</span>!
            </h2>
            <p className="text-gray-500 text-sm mt-2 font-light">
              Has iniciado sesión exitosamente
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-gray-600 text-sm font-light">
            Puedes explorar nuestro catálogo, agregar productos a tu carrito y gestionar tus favoritos.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-primary text-primary-foreground py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}
