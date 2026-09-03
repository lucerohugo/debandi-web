'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ApiService } from '@/services/api.service'
import { buildApiUrl } from '@/lib/utils'

interface VendedorContextType {
  vendedor: any
  isVendedorSession: boolean
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  stopImpersonation: () => Promise<void>
  getClientes: (search: string, page: number) => Promise<any>
  impersonate?: (cli_codi: number) => Promise<void>
}

const VendedorContext = createContext<VendedorContextType | undefined>(undefined)

export function VendedorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [vendedor, setVendedor] = useState(null)
  const [isVendedorSession, setIsVendedorSession] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedSession = localStorage.getItem('vendedor_session')
    if (savedSession) {
      try {
        setVendedor(JSON.parse(savedSession))
        setIsVendedorSession(true)
      } catch (error) {
        console.error('Error parsing vendedor session:', error)
        localStorage.removeItem('vendedor_session')
      }
    }
    setLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
      
      const response = await fetch(buildApiUrl(apiUrl, 'vendedores-login/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.detail || 'Error al iniciar sesión')
      }

      // Guardar JWT (es del cliente asignado)
      ApiService.setToken(data.access)
      localStorage.setItem('jwtToken', data.access)
      if (data.refresh) {
        ApiService.setRefreshToken(data.refresh)
      }

      // Guardar datos del vendedor
      localStorage.setItem('vendedor_session', JSON.stringify(data.vendedor))
      setVendedor(data.vendedor)
      setIsVendedorSession(true)
      
      // Redirigir al panel de clientes del vendedor para que seleccione cuál impersionar
      router.push('/vendedor/clientes')
      
    } catch (error) {
      console.error('Vendedor login error:', error)
      throw error
    }
  }

  const logout = async () => {
    // Limpiar TODO: vendedor + cliente + JWT
    setVendedor(null)
    setIsVendedorSession(false)
    localStorage.removeItem('vendedor_session')
    localStorage.removeItem('jwtToken')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('impersonation_state')
    ApiService.clearToken()
    
    // Emitir evento para que auth-context limpie completamente
    window.dispatchEvent(new CustomEvent('impersonation-stopped', {
      detail: {
        impersonation: {
          isImpersonating: false
        }
      }
    }))
    
    router.push('/')
  }

  const stopImpersonation = async () => {
    // Limpiar estado de impersonación
    localStorage.removeItem('auth_user')
    localStorage.removeItem('impersonation_state')
    
    // Emitir evento para que auth-context limpie el estado
    window.dispatchEvent(new CustomEvent('impersonation-stopped', {
      detail: {
        impersonation: {
          isImpersonating: false
        }
      }
    }))
    
    // Redirigir al panel de vendedor de clientes
    router.push('/vendedor/clientes')
  }

  const getClientes = useCallback(async (search: string, page: number) => {
    try {
      const ven_codi = vendedor?.ven_codi
      
      if (!ven_codi) {
        throw new Error('No hay vendedor logueado')
      }
      
      const data = await ApiService.get<any>(
        `clientes/?ven_codi=${ven_codi}&search=${search}&page=${page}`
      )
      return {
        clientes: data.results || data,
        total: data.count || 0
      }
    } catch (error) {
      console.error('Error fetching clientes:', error)
      throw error
    }
  }, [vendedor])

  const impersonate = async (cli_codi: number) => {
    try {
      // Emitir evento para actualizar el contexto de auth
      // El JWT ya contiene el cli_codi desde el login del vendedor
      window.dispatchEvent(new CustomEvent('impersonation-started', {
        detail: {
          cliente: {
            cli_codi,
            cli_nomb: `Cliente ${cli_codi}`
          },
          impersonation: {
            isImpersonating: true,
            vendedor: vendedor
          }
        }
      }))
      
      // Redirigir a la página principal como cliente
      router.push('/')
    } catch (error) {
      console.error('Error impersonating:', error)
      throw error
    }
  }

  return (
    <VendedorContext.Provider value={{
      vendedor,
      isVendedorSession,
      loading,
      login,
      logout,
      stopImpersonation,
      getClientes,
      impersonate
    }}>
      {children}
    </VendedorContext.Provider>
  )
}

export function useVendedor() {
  const context = useContext(VendedorContext)
  if (!context) {
    throw new Error('useVendedor must be used within VendedorProvider')
  }
  return context
}
