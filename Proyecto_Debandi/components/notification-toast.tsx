//notificacion del listado de productos 
"use client"

import React, { useState, useEffect } from "react"
import { Check, Trash2, X, Loader2 } from "lucide-react"

interface NotificationToastProps {
  message: string
  type: "success" | "error" | "loading"
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
  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const checkImpersonation = () => {
      if (typeof window === 'undefined') return
      const savedImpersonation = localStorage.getItem('impersonation_state')
      if (savedImpersonation) {
        try {
          const parsed = JSON.parse(savedImpersonation)
          setIsImpersonating(!!parsed?.isImpersonating)
        } catch {
          setIsImpersonating(false)
        }
      } else {
        setIsImpersonating(false)
      }
    }

    checkImpersonation()

    window.addEventListener('storage', checkImpersonation)
    window.addEventListener('storage-updated', checkImpersonation)
    window.addEventListener('impersonation-started', checkImpersonation)
    window.addEventListener('impersonation-stopped', checkImpersonation)

    return () => {
      window.removeEventListener('storage', checkImpersonation)
      window.removeEventListener('storage-updated', checkImpersonation)
      window.removeEventListener('impersonation-started', checkImpersonation)
      window.removeEventListener('impersonation-stopped', checkImpersonation)
    }
  }, [])

  useEffect(() => {
    // El toast "loading" se mantiene visible hasta que el caller lo cierre manualmente
    if (isOpen && type !== "loading") {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose, duration, type])

  if (!mounted || !isOpen) return null

  const bgColor =
    type === "success" ? "bg-green-50 border-green-200" :
    type === "loading" ? "bg-blue-50 border-blue-200" :
    "bg-red-50 border-red-200"
  const textColor =
    type === "success" ? "text-green-900" :
    type === "loading" ? "text-blue-900" :
    "text-red-900"
  const iconColor =
    type === "success" ? "text-green-600" :
    type === "loading" ? "text-blue-600" :
    "text-red-600"
  const Icon = type === "success" ? Check : type === "loading" ? Loader2 : Trash2

  return (
    <div
      className={`fixed right-4 z-40 animate-in slide-in-from-top-2 fade-in duration-300 ${
        isImpersonating ? 'top-[151px]' : 'top-24'
      }`}
    >
      <div
        className={`${bgColor} border rounded-lg shadow-lg p-4 flex items-center gap-3 max-w-sm backdrop-blur-sm`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor} ${type === "loading" ? "animate-spin" : ""}`} />
        <p className={`text-sm font-medium ${textColor} flex-1`}>{message}</p>
        {type !== "loading" && (
          <button
            onClick={onClose}
            className={`flex-shrink-0 ${iconColor} hover:opacity-70 transition-opacity`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
