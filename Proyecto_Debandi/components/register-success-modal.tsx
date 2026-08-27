"use client"

import React, { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle, X } from "lucide-react"

interface RegisterSuccessModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function RegisterSuccessModal({ isOpen, onClose }: RegisterSuccessModalProps) {
  useEffect(() => {
    if (!isOpen) return

    // Cierra automáticamente después de 15 segundos
    const timer = setTimeout(onClose, 15000)
    return () => clearTimeout(timer)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = original
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full relative">
        {/* Botón X para cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="p-8 text-center">
          {/* Icono de éxito */}
          <div className="mb-4 flex justify-center">
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          {/* Título */}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            ¡Registro exitoso!
          </h2>

          {/* Descripción */}
          <p className="text-gray-600 mb-6">
            Tu solicitud está pendiente de aprobación. 
            Podrás iniciar sesión una vez que sea revisada.
          </p>

          {/* Botón Continuar */}
          <Button 
            onClick={onClose} 
            className="w-full"
          >
            Continuar
          </Button>

          {/* Contador de cierre automático (opcional, para feedback visual) */}
          <p className="text-xs text-gray-400 mt-4">
            Se cerrará automáticamente en 15 segundos
          </p>
        </div>
      </Card>
    </div>
  )
}
