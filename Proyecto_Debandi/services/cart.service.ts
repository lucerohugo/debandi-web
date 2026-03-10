import { ApiService } from './api.service'
import { cacheManager } from '@/lib/cache-manager'

export interface CartItem {
  art_codi: number
  art_nomb: string
  art_pnet: number
  art_pfin: number
  art_stkp: number
  art_img?: string
  mar_nomb?: string
  rub_nomb?: string
  quantity: number
}

export interface CartResponse {
  carrito: CartItem[]
}

const CART_CACHE_KEY = 'cart_items'

class CartServiceClass {
  /**
   * Obtener todos los items del carrito del usuario autenticado desde el backend
   * Usa caché temporal (5 minutos) para mejorar performance
   */
  async getCart(): Promise<CartItem[]> {
    try {
      // Intentar obtener del caché primero
      const cached = cacheManager.get<CartItem[]>(CART_CACHE_KEY)
      if (cached) {
        return cached
      }

      // Obtener del backend
      const response = await ApiService.get<CartResponse>('/carrito/')
      const cartItems = response.carrito || []
      
      // Guardar en caché (5 minutos)
      cacheManager.set(CART_CACHE_KEY, cartItems, 5 * 60 * 1000)
      
      return cartItems
    } catch (error: any) {
      // Si es 401 (no autorizado), retornar carrito vacío
      if (error.message?.includes('401')) {
        return []
      }
      throw error
    }
  }

  /**
   * Agregar un producto al carrito en el backend
   */
  async addToCart(art_codi: number, cantidad: number = 1, producto?: Partial<CartItem>): Promise<void> {
    try {
      await ApiService.post('/carrito/add/', {
        art_codi,
        cantidad
      })
      
      // Invalidar caché para que se sincronice en próxima lectura
      cacheManager.invalidate(CART_CACHE_KEY)
    } catch (error) {
      throw error
    }
  }

  /**
   * Actualizar la cantidad de un producto en el carrito del backend
   */
  async updateCart(art_codi: number, cantidad: number): Promise<void> {
    try {
      await ApiService.post('/carrito/update/', {
        art_codi,
        cantidad
      })
      
      // Invalidar caché
      cacheManager.invalidate(CART_CACHE_KEY)
    } catch (error) {
      throw error
    }
  }

  /**
   * Eliminar un producto del carrito del backend
   */
  async removeFromCart(art_codi: number): Promise<void> {
    try {
      await ApiService.post('/carrito/remove/', {
        art_codi
      })
      
      // Invalidar caché
      cacheManager.invalidate(CART_CACHE_KEY)
    } catch (error) {
      throw error
    }
  }

  /**
   * Limpiar completamente el carrito del backend
   */
  async clearCart(): Promise<void> {
    try {
      await ApiService.post('/carrito/clear/', {})
      
      // Invalidar caché
      cacheManager.invalidate(CART_CACHE_KEY)
    } catch (error: any) {
      // Si es 401, ignorar el error
      if (error.message?.includes('401')) {
        return
      }
      throw error
    }
  }

  /**
   * Sincronizar carrito con el backend (para crear pedido)
   * Ya no es necesario porque todo se guarda en backend automáticamente
   */
  async syncCartToBackend(): Promise<void> {
    // No es necesario, todo ya está en el backend
    return
  }

  /**
   * Limpiar caché del carrito
   */
  clearCartCache(): void {
    cacheManager.invalidate(CART_CACHE_KEY)
  }
}

export const CartService = new CartServiceClass()
