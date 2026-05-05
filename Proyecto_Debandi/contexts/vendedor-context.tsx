"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
  }
  return process.env.NEXT_PUBLIC_API_URL ||
    (window.location.origin.includes('localhost')
      ? 'http://localhost:8000/api'
      : `${window.location.origin}/api`)
}

interface Vendedor {
  ven_codi: number
  ven_usua: string
  ven_nomb: string
  ven_emai?: string
}

interface Cliente {
  cli_codi: number
  cli_nomb: string
  cli_emai?: string
  cli_doc?: string
  cli_cuit?: string
  cli_tele?: string
  cli_dire?: string
  cli_barr?: string
  localidad?: string
}

interface ImpersonationInfo {
  isImpersonating: boolean
  vendedor?: Vendedor
}

interface VendedorContextType {
  vendedor: Vendedor | null
  loading: boolean
  isVendedorSession: boolean
  impersonation: ImpersonationInfo
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  getClientes: (search?: string, page?: number) => Promise<{ clientes: Cliente[], total: number }>
  impersonate: (cli_codi: number) => Promise<void>
  stopImpersonation: () => Promise<void>
  checkImpersonation: () => Promise<ImpersonationInfo>
}

const VendedorContext = createContext<VendedorContextType | undefined>(undefined)

export function VendedorProvider({ children }: { children: React.ReactNode }) {
  const [vendedor, setVendedor] = useState<Vendedor | null>(null)
  const [loading, setLoading] = useState(true)
  const [isVendedorSession, setIsVendedorSession] = useState(false)
  const [impersonation, setImpersonation] = useState<ImpersonationInfo>({ isImpersonating: false })
  const router = useRouter()

  // Verificar sesión al cargar
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      // Verificar si hay sesión guardada
      const savedVendedor = localStorage.getItem('vendedor_session')
      if (savedVendedor) {
        setVendedor(JSON.parse(savedVendedor))
        setIsVendedorSession(true)
      }
    } catch (error) {
      // Ignorar errores
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      
      console.log(`[Vendedor Context] Login attempt for user: ${username}`)
      console.log(`[Vendedor Context] API URL: ${apiUrl}/vendedores-login/`)
      
      const response = await fetch(`${apiUrl}/vendedores-login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: username,
          password: password
        })
      })
      
      console.log(`[Vendedor Context] Login response status: ${response.status}`)
      
      const data = await response.json()
      console.log(`[Vendedor Context] Login response:`, data)
      
      if (!response.ok) {
        throw new Error(data.detail || data.message || data.error || 'Error al iniciar sesión')
      }
      
      if (data.success && data.vendedor) {
        const vendedorData: Vendedor = {
          ven_codi: data.vendedor.ven_codi,
          ven_usua: data.vendedor.ven_usua,
          ven_nomb: data.vendedor.ven_nomb,
          ven_emai: data.vendedor.ven_emai
        }
        
        setVendedor(vendedorData)
        setIsVendedorSession(true)
        localStorage.setItem('vendedor_session', JSON.stringify(vendedorData))
        
        // Redirigir al vendedor a su página
        router.push('/vendedor/dashboard')
      } else {
        throw new Error(data.detail || data.message || data.error || 'Error al iniciar sesión')
      }
    } catch (error) {
      console.error('[Vendedor Context] Login error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Limpiar sesión local
      setVendedor(null)
      setIsVendedorSession(false)
      setImpersonation({ isImpersonating: false })
      localStorage.removeItem('vendedor_session')
    } catch (error) {
      // Ignorar errores
    }
  }

  const getClientes = async (search: string = '', page: number = 1): Promise<{ clientes: Cliente[], total: number }> => {
    try {
      // Si no hay vendedor logueado, retornar vacío
      if (!vendedor || !vendedor.ven_codi) {
        return { clientes: [], total: 0 }
      }

      const apiUrl = getApiUrl()
      
      // Construir URL con filtro de ven_codi
      let url = `${apiUrl}/clientes/?ven_codi=${vendedor.ven_codi}&page=${page}&page_size=20`
      
      // Agregar búsqueda si existe
      if (search) {
        url += `&search=${encodeURIComponent(search)}`
      }

      const response = await fetch(url, {
        credentials: 'include'
      })

      if (!response.ok) {
        console.error('Error fetching clientes:', response.status)
        return { clientes: [], total: 0 }
      }

      const data = await response.json()
      
      // Manejar respuesta de DRF (con paginación)
      if (data.results && typeof data.count === 'number') {
        return {
          clientes: data.results,
          total: data.count
        }
      }

      // Si es un array directo
      return {
        clientes: Array.isArray(data) ? data : [],
        total: Array.isArray(data) ? data.length : 0
      }
    } catch (error) {
      console.error('Error obteniendo clientes:', error)
      return { clientes: [], total: 0 }
    }
  }

  const impersonate = async (cli_codi: number) => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/vendedor/impersonate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cli_codi })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.detail || 'Error al impersonar cliente')
      }

      const data = await response.json()
      
      // Actualizar estado de impersonación
      setImpersonation({
        isImpersonating: true,
        vendedor: vendedor || undefined
      })
      
      // Limpiar sesión de vendedor (ahora somos "cliente")
      setVendedor(null)
      setIsVendedorSession(false)

      // Disparar evento para que AuthContext recargue
      window.dispatchEvent(new CustomEvent('impersonation-started', { detail: data }))
      
      // Redirigir al inicio
      router.push('/')
    } catch (error) {
      console.error('[Vendedor Context] Impersonate error:', error)
      throw error
    }
  }

  const stopImpersonation = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/vendedor/stop-impersonation/`, {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.detail || 'Error al detener impersonación')
      }

      const data = await response.json()
      
      // Restaurar sesión de vendedor
      if (data.vendedor) {
        const vendedorData: Vendedor = {
          ven_codi: data.vendedor.ven_codi,
          ven_usua: data.vendedor.ven_usua,
          ven_nomb: data.vendedor.ven_nomb,
          ven_emai: data.vendedor.ven_emai
        }
        setVendedor(vendedorData)
        localStorage.setItem('vendedor_session', JSON.stringify(vendedorData))
      }
      
      setIsVendedorSession(true)
      setImpersonation({ isImpersonating: false })

      // Disparar evento para que AuthContext se limpie
      window.dispatchEvent(new CustomEvent('impersonation-stopped'))
      
      // Redirigir a lista de clientes (usar window.location para forzar recarga completa)
      window.location.href = '/vendedor/clientes'
    } catch (error) {
      console.error('[Vendedor Context] Stop impersonate error:', error)
      throw error
    }
  }

  const checkImpersonation = useCallback(async (): Promise<ImpersonationInfo> => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/vendedor/check-impersonation/`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        const info = {
          isImpersonating: data.isImpersonating,
          vendedor: data.vendedor
        }
        setImpersonation(info)
        return info
      }
    } catch (error) {
      console.error('[Vendedor Context] Check impersonation error:', error)
    }
    
    return { isImpersonating: false }
  }, [])

  return (
    <VendedorContext.Provider value={{
      vendedor,
      loading,
      isVendedorSession,
      impersonation,
      login,
      logout,
      getClientes,
      impersonate,
      stopImpersonation,
      checkImpersonation
    }}>
      {children}
    </VendedorContext.Provider>
  )
}

export function useVendedor() {
  const context = useContext(VendedorContext)
  if (context === undefined) {
    throw new Error("useVendedor must be used within a VendedorProvider")
  }
  return context
}

// Hook para verificar impersonación desde cualquier lugar
export function useImpersonation() {
  const context = useContext(VendedorContext)
  
  // Si no está dentro de VendedorProvider, devolver estado por defecto
  if (context === undefined) {
    return {
      isImpersonating: false,
      vendedor: undefined,
      stopImpersonation: async () => {}
    }
  }
  
  return {
    isImpersonating: context.impersonation.isImpersonating,
    vendedor: context.impersonation.vendedor,
    stopImpersonation: context.stopImpersonation
  }
}
