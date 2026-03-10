//notificacion del listado de productos 
"use client"

import React, { useState, useEffect } from "react"
import { Check, Trash2, X } from "lucide-react"

interface NotificationToastProps {
  message: string
  type: "success" | "error"
  isOpen: boolean
  onClose: () => void
  duration?: number
}

export default function NotificationToast({
  message,
  type,
  isOpen,
  onClose,
  duration = 3000,
}: NotificationToastProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose, duration])

  if (!mounted || !isOpen) return null

  const bgColor = type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
  const textColor = type === "success" ? "text-green-900" : "text-red-900"
  const iconColor = type === "success" ? "text-green-600" : "text-red-600"
  const Icon = type === "success" ? Check : Trash2

  return (
    <div className="fixed top-24 right-4 z-40 animate-in slide-in-from-top-2 fade-in duration-300">
      <div
        className={`${bgColor} border rounded-lg shadow-lg p-4 flex items-center gap-3 max-w-sm backdrop-blur-sm`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
        <p className={`text-sm font-medium ${textColor} flex-1`}>{message}</p>
        <button
          onClick={onClose}
          className={`flex-shrink-0 ${iconColor} hover:opacity-70 transition-opacity`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
