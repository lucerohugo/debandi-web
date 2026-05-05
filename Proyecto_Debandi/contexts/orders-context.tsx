"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "./auth-context"
import { cacheManager } from "@/lib/cache-manager"
import { ApiService } from "@/services/api.service"

interface OrderDetail {
  dpe_codi: number
  ped_codi: number
  art_codi: number
  art_nomb: string
  art_cant: number
  art_pfin: number
  art_descu: number
  art_stk?: number
}

interface Order {
  ped_codi: number
  ped_fech: string
  ped_tota: number
  ped_esta: string
  ped_fpag: string
  cli_codi: number
  ped_exp: boolean  // Si ya fue exportado a Genexus no se puede editar
  detalles: OrderDetail[]
}

interface OrdersContextType {
  orders: Order[]
  loading: boolean
  loadOrders: () => Promise<void>
  getOrder: (pedCodi: number) => Promise<Order | null>
  updateOrder: (pedCodi: number, items: any[], formaPago?: string) => Promise<boolean>
  deleteOrder: (pedCodi: number) => Promise<boolean>
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined)
const ORDERS_CACHE_KEY = "orders"

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  // Cargar pedidos del backend cuando el usuario se autentica o cambia
  useEffect(() => {
    if (user) {
      loadOrders()
    } else {
      setOrders([])
      cacheManager.invalidate(ORDERS_CACHE_KEY)
    }
  }, [user])

  const loadOrders = async () => {
    try {
      setLoading(true)
      
      // Intentar obtener del caché primero
      const cached = cacheManager.get<Order[]>(ORDERS_CACHE_KEY)
      if (cached) {
        setOrders(cached)
        setLoading(false)
        
        // Sincronizar en background sin esperar
        syncOrdersWithBackend()
        return
      }

      // Si no hay caché, obtener del backend
      await syncOrdersWithBackend()
    } catch (error) {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const syncOrdersWithBackend = async () => {
    try {
      // Usar endpoint específico para obtener solo los pedidos del cliente autenticado
      const url = user ? `/pedidos/cliente/?cli_codi=${user.id}` : '/pedidos/cliente/'
      const response = await ApiService.get<any>(url)
      // DRF retorna array directo o {count, next, previous, results}
      const data = Array.isArray(response) ? response : (response.results || [])
      
      setOrders(data)
      
      // Guardar en caché (15 minutos porque los pedidos no cambian frecuentemente)
      cacheManager.set(ORDERS_CACHE_KEY, data, 15 * 60 * 1000)
    } catch (error) {
      // Mantener los datos en caché aunque falle la sincronización
    }
  }

  const getOrder = async (pedCodi: number): Promise<Order | null> => {
    try {
      const response = await ApiService.get<Order>(`/pedidos/${pedCodi}/`)
      return response
    } catch (error) {
      console.error('Error al obtener pedido:', error)
      return null
    }
  }

  const updateOrder = async (pedCodi: number, items: any[], formaPago?: string): Promise<boolean> => {
    try {
      const payload = {
        cli_codi: items[0]?.cli_codi || 1, // Obtener cli_codi del contexto o usar el que viene
        ped_fpag: formaPago || 'CDO',
        detalles: items.map(item => ({
          art_codi: item.art_codi,
          dpe_cant: item.quantity || item.dpe_cant
        }))
      }
      
      await ApiService.put(`/pedidos/${pedCodi}/`, payload)
      
      // Invalidar caché y recargar pedidos
      cacheManager.invalidate(ORDERS_CACHE_KEY)
      await syncOrdersWithBackend()
      
      return true
    } catch (error) {
      console.error('Error al actualizar pedido:', error)
      return false
    }
  }

  const deleteOrder = async (pedCodi: number): Promise<boolean> => {
    try {
      await ApiService.delete(`/pedidos/${pedCodi}/`)
      
      // Invalidar caché y recargar pedidos
      cacheManager.invalidate(ORDERS_CACHE_KEY)
      await syncOrdersWithBackend()
      
      return true
    } catch (error) {
      console.error('Error al eliminar pedido:', error)
      return false
    }
  }

  return (
    <OrdersContext.Provider 
      value={{ 
        orders,
        loading,
        loadOrders,
        getOrder,
        updateOrder,
        deleteOrder
      }}
    >
      {children}
    </OrdersContext.Provider>
  )
}

export function useOrders() {
  const context = useContext(OrdersContext)
  if (context === undefined) {
    throw new Error("useOrders must be used within an OrdersProvider")
  }
  return context
}
