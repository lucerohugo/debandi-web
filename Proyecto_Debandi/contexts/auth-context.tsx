'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { ApiService } from '@/services/api.service'
import type { User, ImpersonationInfo, AuthContextType } from './auth.types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [impersonation, setImpersonation] = useState<ImpersonationInfo>({ 
    isImpersonating: false 
  })

  // Cargar usuario del localStorage en montaje
  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('Error parsing user:', error)
        localStorage.removeItem('auth_user')
      }
    }
    
    const savedToken = localStorage.getItem('jwtToken')
    if (savedToken) {
      ApiService.setToken(savedToken)
    }
    
    // Recuperar estado de impersonación del localStorage
    const savedImpersonation = localStorage.getItem('impersonation_state')
    if (savedImpersonation) {
      try {
        setImpersonation(JSON.parse(savedImpersonation))
      } catch (error) {
        console.error('Error parsing impersonation state:', error)
        localStorage.removeItem('impersonation_state')
      }
    }
    
    setLoading(false)
  }, [])

  // Escuchar eventos de impersonación
  useEffect(() => {
    const handleImpersonationStarted = (event: CustomEvent) => {
      const { detail } = event
      
      if (detail.cliente) {
        const impersonatedUser: User = {
          id: detail.cliente.cli_codi,
          email: detail.cliente.cli_emai || '',
          firstName: detail.cliente.cli_nomb || 'Cliente',
          lastName: detail.cliente.cli_ape || '',
        }
        
        setUser(impersonatedUser)
        localStorage.setItem('auth_user', JSON.stringify(impersonatedUser))
      }
      
      if (detail.impersonation) {
        // Obtener vendedor desde JWT en lugar de localStorage
        const vendedorData = ApiService.getVendedorSuplantante()
        const impersonationState: ImpersonationInfo = {
          ...detail.impersonation,
          vendedor: vendedorData ? {
            ven_codi: vendedorData.ven_codi,
            ven_nomb: detail.impersonation.vendedor?.ven_nomb || vendedorData.ven_nomb || 'Vendedor'
          } : detail.impersonation.vendedor
        }
        
        setImpersonation(impersonationState)
        localStorage.setItem('impersonation_state', JSON.stringify(impersonationState))
      }
    }

    const handleImpersonationStopped = (event: CustomEvent) => {
      const { detail } = event
      
      // Limpiar impersonación
      if (detail.impersonation) {
        setImpersonation(detail.impersonation)
        localStorage.removeItem('impersonation_state')
      }
      
      // Si se detiene completamente (logout), también limpiar usuario
      if (!detail.impersonation?.isImpersonating) {
        setUser(null)
        localStorage.removeItem('auth_user')
      }
    }

    window.addEventListener('impersonation-started', handleImpersonationStarted as EventListener)
    window.addEventListener('impersonation-stopped', handleImpersonationStopped as EventListener)
    
    return () => {
      window.removeEventListener('impersonation-started', handleImpersonationStarted as EventListener)
      window.removeEventListener('impersonation-stopped', handleImpersonationStopped as EventListener)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      
      const response = await fetch(`${apiUrl}/cliente-login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.detail || 'Error al iniciar sesión')
      }

      if (!data.access) {
        throw new Error('Backend no devolvió JWT token')
      }

      // Guardar JWT
      ApiService.setToken(data.access)
      
      // Crear usuario
      const user: User = {
        id: data.cliente.cli_codi,
        email: data.cliente.cli_emai || email,
        firstName: data.cliente.cli_nomb || 'Cliente',
        lastName: data.cliente.cli_ape || '',
      }
      
      setUser(user)
      localStorage.setItem('auth_user', JSON.stringify(user))
      
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    setUser(null)
    localStorage.removeItem('auth_user')
    ApiService.clearToken()
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, loading, impersonation, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
