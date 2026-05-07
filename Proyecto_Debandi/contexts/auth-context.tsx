"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { cacheManager } from "@/lib/cache-manager"
import { ApiService } from "@/services/api.service"

// Importar función para obtener URL del API
const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
  }
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl) return envUrl
  return 'http://localhost:8000/api'
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
    // Cargar usuario del localStorage si existe
    const savedUser = localStorage.getItem('auth_user')
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setUser(user)
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('auth_user')
      }
    }
    
    // Cargar JWT token del localStorage si existe
    const savedToken = localStorage.getItem('jwtToken')
    if (savedToken) {
      ApiService.setToken(savedToken)
    }
    
    setLoading(false)
  }, [])

  // Escuchar eventos de impersonación desde vendedor-context
  useEffect(() => {
    const handleImpersonationStarted = (event: CustomEvent) => {
      const { detail } = event
      console.log('[Auth Context] Impersonation started:', detail)
      
      // Cargar datos del cliente suplantado
      if (detail.cliente) {
        const cliente = detail.cliente
        const impersonatedUser: User = {
          id: cliente.cli_codi,
          email: cliente.cli_emai || '',
          firstName: cliente.cli_nomb || 'Cliente',
          lastName: cliente.cli_ape || '',
          isAdmin: false
        }
        
        setUser(impersonatedUser)
        localStorage.setItem('auth_user', JSON.stringify(impersonatedUser))
      }
      
      // Actualizar estado de impersonación
      if (detail.impersonation) {
        setImpersonation(detail.impersonation)
      }
    }

    const handleImpersonationStopped = () => {
      console.log('[Auth Context] Impersonation stopped')
      setUser(null)
      setImpersonation({ isImpersonating: false })
      localStorage.removeItem('auth_user')
      clearAuthData()
    }

    window.addEventListener('impersonation-started', handleImpersonationStarted as EventListener)
    window.addEventListener('impersonation-stopped', handleImpersonationStopped as EventListener)

    return () => {
      window.removeEventListener('impersonation-started', handleImpersonationStarted as EventListener)
      window.removeEventListener('impersonation-stopped', handleImpersonationStopped as EventListener)
    }
  }, [])

  const refreshAuth = useCallback(async () => {
    // Sin operación necesaria
  }, [])

  const clearAuthData = () => {
    localStorage.removeItem("favorites")
    cacheManager.invalidateAll()
    
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith("favorites_user_") || key.startsWith("cache_")) {
        localStorage.removeItem(key)
      }
    })
  }

  const login = async (email: string, password: string) => {
    try {
      console.log('[Auth] Iniciando login con:', email)
      
      const response = await fetch(`${getApiUrl()}/cliente-login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()
      console.log('[Auth] Respuesta del login:', { status: response.status, data })

      if (!response.ok || !data.success) {
        console.error('[Auth] Login fallido:', data.detail)
        throw new Error(data.detail || 'Error al iniciar sesión')
      }

      // Verificar que tenemos JWT token
      if (!data.access) {
        console.error('[Auth] ❌ Backend no devolvió JWT token (data.access)')
        throw new Error('Backend no devolvió JWT token')
      }

      console.log('[Auth] JWT recibido, guardando en localStorage...')
      
      // Usar cli_codi como id del usuario (es único por cliente)
      const clienteData = data.cliente
      const user: User = {
        id: clienteData.cli_codi,  // ← REAL CLI_CODI, no hardcoded 1
        email: clienteData.cli_emai || email,
        firstName: clienteData.cli_nomb || 'Cliente',
        lastName: clienteData.cli_ape || '',
        isAdmin: false
      }
      
      // Guardar JWT token
      ApiService.setToken(data.access)
      
      // Verificar que se guardó
      const savedToken = localStorage.getItem('jwtToken')
      console.log('[Auth] Token guardado en localStorage:', !!savedToken, savedToken ? savedToken.substring(0, 20) + '...' : 'NO GUARDADO')
      
      setUser(user)
      
      // Guardar en localStorage para persistencia
      localStorage.setItem('auth_user', JSON.stringify(user))
      console.log('[Auth] ✅ Login exitoso para:', user.email)
      
      // ⏳ Esperar microtask para que React actualice el estado
      await new Promise(resolve => setTimeout(resolve, 100))
      
      window.dispatchEvent(new CustomEvent("user-logged-in", {
        detail: { firstName: user.firstName }
      }))
    } catch (error) {
      console.error('[Auth] ❌ Login error:', error)
      throw error
    }
  }

  const register = async (email: string, password: string, firstName: string, lastName: string, document: string) => {
    try {
      console.log('[Auth] Iniciando registro para:', email)
      
      // Primero crear el cliente en el backend
      const registerResponse = await fetch(`${getApiUrl()}/cliente-register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email,
          password: password,
          name: capitalize(firstName),
          lastName: capitalize(lastName),
          document: document
        })
      })

      const registerData = await registerResponse.json()
      console.log('[Auth] Respuesta del registro:', { status: registerResponse.status, registerData })

      if (!registerResponse.ok) {
        console.error('[Auth] Registro fallido:', registerData.detail)
        throw new Error(registerData.detail || 'Error en el registro')
      }

      console.log('[Auth] ✅ Cliente registrado, iniciando login automático...')
      
      // Luego hacer login automático
      await login(email, password)
      
      console.log('[Auth] ✅ Login automático completado después del registro')
    } catch (error) {
      console.error('[Auth] ❌ Register error:', error)
      throw error
    }
  }

  const logout = async () => {
    setUser(null)
    localStorage.removeItem('auth_user')
    ApiService.clearToken()  // Limpiar JWT token
    clearAuthData()
    
    window.dispatchEvent(new CustomEvent("favorites-cleared"))
    window.dispatchEvent(new Event("storage"))
    
    // Redirigir al inicio después de cerrar sesión
    window.location.href = '/'
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
