'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { ApiService } from '@/services/api.service'
import { buildApiUrl } from '@/lib/utils'
import type { User, ImpersonationInfo, AuthContextType } from './auth.types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // Inicializar leyendo del localStorage INMEDIATAMENTE (no en useEffect)
  const [impersonation, setImpersonation] = useState<ImpersonationInfo>(() => {
    // Asegurarse de que estamos en el cliente (no en SSR)
    if (typeof window === 'undefined') {
      console.log('🔥 AUTH-CONTEXT INIT: SSR mode, localStorage no disponible')
      return { isImpersonating: false }
    }
    
    try {
      const saved = localStorage.getItem('impersonation_state')
      if (saved) {
        const parsed = JSON.parse(saved)
        console.log('🔥 AUTH-CONTEXT INIT: Impersonation_state encontrado en localStorage:', parsed)
        console.log('🔥   isImpersonating:', parsed.isImpersonating)
        console.log('🔥   vendedor.ven_nomb:', parsed.vendedor?.ven_nomb)
        return parsed
      } else {
        console.log('🔥 AUTH-CONTEXT INIT: impersonation_state NO está en localStorage')
      }
    } catch (error) {
      console.error('🔥 AUTH-CONTEXT INIT: Error al parsear impersonation_state:', error)
      localStorage.removeItem('impersonation_state')
    }
    
    return { isImpersonating: false }
  })

  // Cargar usuario del localStorage en montaje
  useEffect(() => {
    const loadFromStorage = () => {
      console.log('📂 AUTH-CONTEXT useEffect: Leyendo del localStorage...')
      const savedUser = localStorage.getItem('auth_user')
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser)
          console.log('👤 AUTH-CONTEXT: Usuario encontrado:', parsed.cli_nomb || parsed.firstName)
          setUser(parsed)
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
          const parsedImpersonation = JSON.parse(savedImpersonation)
          console.log('📋 AUTH-CONTEXT useEffect: Impersonación recuperada:', parsedImpersonation)
          console.log('📋   isImpersonating:', parsedImpersonation.isImpersonating)
          console.log('📋   vendedor:', parsedImpersonation.vendedor?.ven_nomb)
          setImpersonation(parsedImpersonation)
        } catch (error) {
          console.error('Error parsing impersonation state:', error)
          localStorage.removeItem('impersonation_state')
          setImpersonation({ isImpersonating: false })
        }
      } else {
        console.log('📋 AUTH-CONTEXT useEffect: No hay impersonation_state en localStorage')
      }
    }
    
    loadFromStorage()
    setLoading(false)
    
    // Escuchar cambios en storage (cuando se actualiza desde otra pestaña o programáticamente)
    window.addEventListener('storage', loadFromStorage)
    
    // IMPORTANTE: Escuchar evento personalizado cuando se actualiza localStorage
    const handleStorageUpdate = () => {
      console.log('🔔 AUTH-CONTEXT: storage-updated event recibido 🚨 RE-LEYENDO AGRESIVAMENTE')
      // Re-leer DIRECTAMENTE del localStorage (sin pasar por loadFromStorage)
      const savedImpersonation = localStorage.getItem('impersonation_state')
      console.log('🔔 AUTH-CONTEXT: localStorage.impersonation_state =', savedImpersonation)
      
      if (savedImpersonation) {
        try {
          const parsed = JSON.parse(savedImpersonation)
          console.log('🔔 AUTH-CONTEXT: Parsed =', parsed)
          console.log('🔔 AUTH-CONTEXT: Llamando setImpersonation ahora...')
          setImpersonation(parsed)
          console.log('🔔 AUTH-CONTEXT: setImpersonation completado ✅')
        } catch (error) {
          console.error('🔔 AUTH-CONTEXT: Error parsing:', error)
        }
      }
      
      // También llamar loadFromStorage para el usuario
      loadFromStorage()
    }
    
    window.addEventListener('storage-updated', handleStorageUpdate as EventListener)
    
    return () => {
      window.removeEventListener('storage', loadFromStorage)
      window.removeEventListener('storage-updated', handleStorageUpdate as EventListener)
    }
  }, [])

  // Escuchar eventos de impersonación
  useEffect(() => {
    console.log('🔧 Auth-context: Registrando listeners de impersonación')
    
    const handleImpersonationStarted = (event: Event) => {
      const customEvent = event as CustomEvent
      const { detail } = customEvent
      console.log('📥 Auth-context: Evento impersonation-started recibido', detail)
      
      if (detail.cliente) {
        console.log('👤 Auth-context: Procesando cliente:', detail.cliente.cli_nomb)
        const impersonatedUser: User = {
          id: detail.cliente.cli_codi,
          email: detail.cliente.cli_emai || '',
          firstName: detail.cliente.cli_nomb || 'Cliente',
          lastName: detail.cliente.cli_ape || '',
          cli_codi: detail.cliente.cli_codi,
          cli_desc: detail.cliente.cli_desc || 0,
          cli_precs1: detail.cliente.cli_precs1 || 0,
          cli_precs2: detail.cliente.cli_precs2 || 0,
          localidad: detail.cliente.loc_nomb || '',
          telefonoContacto: detail.cliente.cli_tele || '',
        }
        
        setUser(impersonatedUser)
        localStorage.setItem('auth_user', JSON.stringify(impersonatedUser))
      }
      
      if (detail.impersonation) {
        console.log('🔐 Auth-context: Procesando impersonación, vendedor:', detail.impersonation.vendedor)
        // Usar directamente los datos del vendedor que vienen en el evento
        const impersonationState: ImpersonationInfo = {
          isImpersonating: true,
          vendedor: detail.impersonation.vendedor || {
            ven_codi: 0,
            ven_nomb: 'Vendedor'
          }
        }
        
        console.log('💾 Auth-context: Seteando impersonation state:', impersonationState)
        console.log('💾 Auth-context: vendedor.ven_nomb =', impersonationState.vendedor?.ven_nomb)
        setImpersonation(impersonationState)
        localStorage.setItem('impersonation_state', JSON.stringify(impersonationState))
        console.log('✅ Impersonación activada:', impersonationState)
      } else {
        console.log('⚠️ Auth-context: ADVERTENCIA - detail.impersonation es undefined!')
        console.log('⚠️ detail:', detail)
      }
    }

    const handleImpersonationStopped = (event: Event) => {
      const customEvent = event as CustomEvent
      const { detail } = customEvent
      console.log('🛑 Auth-context: Evento impersonation-stopped recibido')
      
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

    window.addEventListener('impersonation-started', handleImpersonationStarted)
    window.addEventListener('impersonation-stopped', handleImpersonationStopped)
    console.log('✔️ Auth-context: Listeners registrados')
    
    return () => {
      console.log('🧹 Auth-context: Removiendo listeners')
      window.removeEventListener('impersonation-started', handleImpersonationStarted)
      window.removeEventListener('impersonation-stopped', handleImpersonationStopped)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      
      const response = await fetch(buildApiUrl(apiUrl, 'cliente-login/'), {
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
        cli_codi: data.cliente.cli_codi,
        cli_desc: data.cliente.cli_desc || 0,
        cli_precs1: data.cliente.cli_precs1 || 0,
        cli_precs2: data.cliente.cli_precs2 || 0,
        localidad: data.cliente.loc_nomb || '',
        telefonoContacto: data.cliente.cli_tele || '',
      }
      
      setUser(user)
      localStorage.setItem('auth_user', JSON.stringify(user))
      
      // ✅ Agregar pequeño delay para asegurar que el JWT está configurado
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // 🎉 Disparar evento para actualizar carrito
      console.log('🛒 AUTH-CONTEXT: Disparando cart-updated después del login')
      window.dispatchEvent(new Event('cart-updated'))
      
      // 🎉 Disparar evento para mostrar WelcomeModal
      window.dispatchEvent(new CustomEvent('user-logged-in', {
        detail: { firstName: user.firstName }
      }))
      
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

  // LOGS DE DIAGNÓSTICO - Removidos
  // console.log("🔵 AUTH PROVIDER RENDER")
  // console.log("🔵 impersonation =", impersonation)

  return (
    <AuthContext.Provider value={{ user, loading, impersonation, login, logout, setUser }}>
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
