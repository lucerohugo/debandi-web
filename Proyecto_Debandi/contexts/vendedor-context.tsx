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
      // Primero verificar si hay impersonación activa
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
          setLoading(false)
          return
        }
      }

      // Si no hay impersonación, verificar sesión de vendedor
      const response = await fetch(`${getApiUrl()}/vendedor/me/`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.vendedor && data.success) {
          setVendedor(data.vendedor)
          setIsVendedorSession(true)
        }
      }
    } catch (error) {
      // Silenciosamente fallar
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    const response = await fetch(`${getApiUrl()}/vendedor/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al iniciar sesión')
    }

    const data = await response.json()
    setVendedor(data.vendedor)
    setIsVendedorSession(true)
    setImpersonation({ isImpersonating: false })
  }

  const logout = async () => {
    try {
      await fetch(`${getApiUrl()}/vendedor/logout/`, {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      // Ignorar errores
    }
    
    setVendedor(null)
    setIsVendedorSession(false)
    setImpersonation({ isImpersonating: false })
  }

  const getClientes = async (search: string = '', page: number = 1): Promise<{ clientes: Cliente[], total: number }> => {
    const params = new URLSearchParams({
      search,
      page: String(page),
      limit: '20'
    })

    const response = await fetch(`${getApiUrl()}/vendedor/clientes/?${params}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al obtener clientes')
    }

    const data = await response.json()
    return {
      clientes: data.clientes,
      total: data.total
    }
  }

  const impersonate = async (cli_codi: number) => {
    const response = await fetch(`${getApiUrl()}/vendedor/impersonate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ cli_codi })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al impersonar cliente')
    }

    const data = await response.json()
    
    // Actualizar estado de impersonación
    setImpersonation({
      isImpersonating: true,
      vendedor: data.impersonation.vendedor
    })
    
    // Limpiar sesión de vendedor (ahora somos "cliente")
    setVendedor(null)
    setIsVendedorSession(false)

    // Disparar evento para que AuthContext recargue
    window.dispatchEvent(new CustomEvent('impersonation-started', { detail: data }))
    
    // La redirección se hace en el componente que llama a impersonate
  }

  const stopImpersonation = async () => {
    const response = await fetch(`${getApiUrl()}/vendedor/stop-impersonation/`, {
      method: 'POST',
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error al detener impersonación')
    }

    const data = await response.json()
    
    // Restaurar sesión de vendedor
    setVendedor(data.vendedor)
    setIsVendedorSession(true)
    setImpersonation({ isImpersonating: false })

    // Disparar evento para que AuthContext se limpie
    window.dispatchEvent(new CustomEvent('impersonation-stopped'))
    
    // Redirigir a lista de clientes (usar window.location para forzar recarga completa)
    window.location.href = '/vendedor/clientes'
  }

  const checkImpersonation = useCallback(async (): Promise<ImpersonationInfo> => {
    try {
      const response = await fetch(`${getApiUrl()}/vendedor/check-impersonation/`, {
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
      // Ignorar errores
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
