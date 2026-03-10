"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { ApiService } from "@/services/api.service"
import { CartService } from "@/services/cart.service"
import { cacheManager } from "@/lib/cache-manager"

const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
  }
  return process.env.NEXT_PUBLIC_API_URL ||
    (window.location.origin.includes('localhost')
      ? 'http://localhost:8000/api'
      : `${window.location.origin}/api`)
}

// Función para capitalizar texto
const capitalize = (text: string): string => {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  isAdmin: boolean
}

interface ImpersonationInfo {
  isImpersonating: boolean
  vendedor?: {
    ven_codi: number
    ven_nomb: string
    ven_usua?: string
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  impersonation: ImpersonationInfo
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName: string, lastName: string, document: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [impersonation, setImpersonation] = useState<ImpersonationInfo>({ isImpersonating: false })

  useEffect(() => {
    checkAuth()
    
    // Escuchar eventos de impersonación
    const handleImpersonationStarted = (e: CustomEvent) => {
      const data = e.detail
      if (data.user) {
        setUser({
          ...data.user,
          firstName: capitalize(data.user.firstName),
          lastName: capitalize(data.user.lastName)
        })
      }
      if (data.impersonation) {
        setImpersonation(data.impersonation)
      }
    }
    
    const handleImpersonationStopped = () => {
      setUser(null)
      setImpersonation({ isImpersonating: false })
      clearAuthData()
    }
    
    window.addEventListener('impersonation-started', handleImpersonationStarted as EventListener)
    window.addEventListener('impersonation-stopped', handleImpersonationStopped)
    
    return () => {
      window.removeEventListener('impersonation-started', handleImpersonationStarted as EventListener)
      window.removeEventListener('impersonation-stopped', handleImpersonationStopped)
    }
  }, [])

  const checkAuth = async () => {
    try {
      // Primero verificar si hay impersonación
      const impRes = await fetch(`${getApiUrl()}/vendedor/check-impersonation/`, {
        credentials: 'include'
      })
      
      if (impRes.ok) {
        const impData = await impRes.json()
        if (impData.isImpersonating) {
          setImpersonation({
            isImpersonating: true,
            vendedor: impData.vendedor
          })
        }
      }
      
      // Luego verificar usuario (cliente o impersonado)
      const response = await fetch(`${getApiUrl()}/auth/me/`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setUser({
          ...data.user,
          firstName: capitalize(data.user.firstName),
          lastName: capitalize(data.user.lastName)
        })
      } else {
        // Token inválido o expirado, limpiar todo
        clearAuthData()
        setUser(null)
        setImpersonation({ isImpersonating: false })
      }
    } catch (error) {
      clearAuthData()
      setUser(null)
      setImpersonation({ isImpersonating: false })
    } finally {
      setLoading(false)
    }
  }
  
  const refreshAuth = useCallback(async () => {
    await checkAuth()
  }, [])

  const clearAuthData = () => {
    // Limpiar localStorage (no auth tokens)
    localStorage.removeItem("favorites")
    
    // Limpiar caché centralizado
    cacheManager.invalidateAll()
    
    // Limpiar favoritos antiguos por usuario (compatibilidad)
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith("favorites_user_") || key.startsWith("cache_")) {
        localStorage.removeItem(key)
      }
    })
  }

  const login = async (email: string, password: string) => {
    const data = await ApiService.post<any>('/auth/login/', { email, password })
    
    setUser({
      ...data.user,
      firstName: capitalize(data.user.firstName),
      lastName: capitalize(data.user.lastName)
    })
    window.dispatchEvent(new CustomEvent("user-logged-in", {
      detail: { firstName: capitalize(data.user.firstName) }
    }))
  }

  const register = async (email: string, password: string, firstName: string, lastName: string, document: string) => {
    await ApiService.post('/auth/register/', { email, password, firstName, lastName, document })
    // Auto-login después del registro
    await login(email, password)
  }

  const logout = async () => {
    try {
      await ApiService.post('/auth/logout/', {})
    } catch (error) {
      // Silenciosamente fallar en logout
    }
    
    setUser(null)
    clearAuthData()
    
    window.dispatchEvent(new CustomEvent("favorites-cleared"))
    window.dispatchEvent(new Event("storage"))
  }

  return (
    <AuthContext.Provider value={{ user, loading, impersonation, login, register, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
