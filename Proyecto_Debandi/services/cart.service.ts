import { cacheManager } from '@/lib/cache-manager'
import { ApiService } from './api.service'

export interface CartItem {
  carr_codi?: number
  cli_codi?: number
  art_codi: number
  art_nomb: string
  art_pnet: number
  art_pfin: number
  art_tiva: number // IVA porcentaje del artículo
  art_stkp: number
  art_img?: string
  mar_nomb?: string
  rub_nomb?: string
  carr_cant: number
  quantity?: number // Alias para carr_cant
  carr_pnet?: number
  carr_pfin?: number
  carr_fech?: string
  carr_fmod?: string
}

export interface CartResponse {
  carrito: CartItem[]
}

class CartServiceClass {
  /**
   * Obtener el ID del cliente logueado
   */
  private getClientId(): number | null {
    try {
      if (typeof window === 'undefined') return null
      
      const authUser = localStorage.getItem('auth_user')
      if (authUser) {
        const user = JSON.parse(authUser)
        return user.id
      }
    } catch (error) {
      console.error('Error obteniendo cliente:', error)
    }
    return null
  }

  /**
   * Obtener todos los items del carrito desde la BD
   */
  async getCart(): Promise<CartItem[]> {
    try {
      const clientId = this.getClientId()
      if (!clientId) {
        return []
      }

      // Obtener carrito del backend filtrado por cli_codi
      const response = await ApiService.get<any>(`/carrito/?cli_codi=${clientId}`)
      
      // DRF retorna {count, next, previous, results}
      const items = Array.isArray(response) ? response : (response?.results || [])
      
      return items.map((item: any) => ({
        carr_codi: item.carr_codi,
        cli_codi: item.cli_codi,
        art_codi: item.art_codi,
        art_nomb: item.art_nomb,
        art_pnet: item.art_pnet,
        art_pfin: item.art_pfin,
        art_tiva: item.art_tiva,
        art_stk: item.art_stk,
        art_img: item.art_img,
        mar_nomb: item.mar_nomb,
        rub_nomb: item.rub_nomb,
        carr_cant: item.carr_cant,
        quantity: item.carr_cant, // Alias para compatibilidad con componentes
        carr_pnet: item.carr_pnet,
        carr_pfin: item.carr_pfin,
        carr_fech: item.carr_fech,
        carr_fmod: item.carr_fmod
      }))
    } catch (error) {
      console.error('Error cargando carrito:', error)
      return []
    }
  }

  /**
   * Agregar un producto al carrito (en la BD)
   */
  async addToCart(art_codi: number, cantidad: number = 1, producto?: Partial<CartItem>): Promise<void> {
    try {
      const clientId = this.getClientId()
      if (!clientId) {
        throw new Error('No hay cliente logueado')
      }

      const cart = await this.getCart()
      
      // Verificar si el producto ya está en el carrito
      const existingItem = cart.find(item => item.art_codi === art_codi)
      
      if (existingItem && existingItem.carr_codi) {
        // Actualizar cantidad en BD
        await this.updateCart(art_codi, existingItem.carr_cant + cantidad)
      } else if (producto) {
        // Crear nuevo item en BD
        const payload = {
          cli_codi: clientId,
          art_codi: art_codi,
          carr_cant: cantidad,
          carr_pnet: producto.art_pnet || 0,
          carr_pfin: producto.art_pfin || 0
        }
        
        await ApiService.post('/carrito-manage/', payload)
      }
      
      // Invalidar caché
      cacheManager.invalidate(`cart_${clientId}`)
      
      // Disparar evento para actualizar UI (navbar)
      window.dispatchEvent(new Event('cart-updated'))
    } catch (error) {
      console.error('Error agregando al carrito:', error)
      throw error
    }
  }

  /**
   * Actualizar la cantidad de un producto en el carrito (en la BD)
   */
  async updateCart(art_codi: number, cantidad: number): Promise<void> {
    try {
      const clientId = this.getClientId()
      if (!clientId) {
        throw new Error('No hay cliente logueado')
      }

      const payload = {
        cli_codi: clientId,
        art_codi: art_codi,
        carr_cant: cantidad
      }

      console.log(`📍 Actualizando carrito:`, payload)

      if (cantidad <= 0) {
        // Eliminar del carrito
        await ApiService.delete('/carrito-manage/', undefined, payload)
      } else {
        // Actualizar cantidad
        await ApiService.put('/carrito-manage/', payload)
      }
      
      // Invalidar caché
      cacheManager.invalidate(`cart_${clientId}`)
      
      // Disparar evento para actualizar UI (navbar)
      window.dispatchEvent(new Event('cart-updated'))
    } catch (error) {
      console.error('Error actualizando carrito:', error)
      throw error
    }
  }

  /**
   * Eliminar un producto del carrito (de la BD)
   */
  async removeFromCart(art_codi: number): Promise<void> {
    try {
      const clientId = this.getClientId()
      if (!clientId) {
        throw new Error('No hay cliente logueado')
      }

      const payload = {
        cli_codi: clientId,
        art_codi: art_codi
      }

      // Usar endpoint /carrito-manage/ que funciona con DELETE
      await ApiService.delete('/carrito-manage/', undefined, payload)
      
      // Invalidar caché
      cacheManager.invalidate(`cart_${clientId}`)
      
      // Disparar evento para actualizar UI (navbar)
      window.dispatchEvent(new Event('cart-updated'))
    } catch (error) {
      console.error('Error eliminando del carrito:', error)
      throw error
    }
  }

  /**
   * Limpiar completamente el carrito (de la BD)
   */
  async clearCart(): Promise<void> {
    try {
      const clientId = this.getClientId()
      if (!clientId) {
        throw new Error('No hay cliente logueado')
      }

      const cart = await this.getCart()
      
      // Eliminar todos los items usando /carrito-manage/
      for (const item of cart) {
        if (item.art_codi) {
          const payload = {
            cli_codi: clientId,
            art_codi: item.art_codi
          }
          await ApiService.delete('/carrito-manage/', undefined, payload)
        }
      }
      
      // Invalidar caché
      cacheManager.invalidate(`cart_${clientId}`)
      
      // Disparar evento para actualizar UI (navbar)
      window.dispatchEvent(new Event('cart-updated'))
    } catch (error) {
      console.error('Error limpiando carrito:', error)
    }
  }

  /**
   * Sincronizar carrito con el backend (para crear pedido)
   * Simplemente retornar, ya que el carrito está en BD
   */
  async syncCartToBackend(): Promise<void> {
    return
  }

  /**
   * Limpiar caché del carrito
   */
  clearCartCache(): void {
    const clientId = this.getClientId()
    if (clientId) {
      cacheManager.invalidate(`cart_${clientId}`)
    }
  }
}

export const CartService = new CartServiceClass()

