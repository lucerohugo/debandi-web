/**
 * Cache Manager - Gestión de caché temporal para datos del backend
 * 
 * Principios:
 * - Backend es la fuente de verdad
 * - localStorage se usa SOLO como caché temporal
 * - Los datos se sincronizan automáticamente con el backend
 * - El caché se invalida al cambiar el usuario o al logout
 * hace que el cache sea temporal ,luego todo lo que es favoritos, historial de pedidos, carrito ,etc guarde todo en la db
 */ 


interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // time-to-live en milisegundos
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos
  private readonly localStorage_PREFIX = 'cache_'

  /**
   * Obtener dato del caché
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      // Intentar recuperar del localStorage si existe
      return this.getFromLocalStorage<T>(key)
    }

    // Verificar si el caché ha expirado
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      this.removeFromLocalStorage(key)
      return null
    }

    return entry.data
  }

  /**
   * Establecer dato en caché
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    }

    this.cache.set(key, entry)

    // También guardar en localStorage como respaldo
    try {
      const serialized = JSON.stringify({
        data,
        timestamp: Date.now(),
      })
      localStorage.setItem(`${this.localStorage_PREFIX}${key}`, serialized)
    } catch (error) {
      // Silent error on cache save
    }
  }

  /**
   * Invalidar caché específico
   */
  invalidate(key: string): void {
    this.cache.delete(key)
    this.removeFromLocalStorage(key)
  }

  /**
   * Invalidar todo el caché (al logout)
   */
  invalidateAll(): void {
    this.cache.clear()

    // Limpiar localStorage
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(this.localStorage_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  }

  /**
   * Obtener del localStorage
   */
  private getFromLocalStorage<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(`${this.localStorage_PREFIX}${key}`)
      if (!stored) return null

      const { data } = JSON.parse(stored)
      return data as T
    } catch (error) {
      return null
    }
  }

  /**
   * Eliminar del localStorage
   */
  private removeFromLocalStorage(key: string): void {
    try {
      localStorage.removeItem(`${this.localStorage_PREFIX}${key}`)
    } catch (error) {
      // Silent error on cache delete
    }
  }

  /**
   * Estadísticas del caché (útil para debugging)
   */
  getStats(): {
    cacheSize: number
    keys: string[]
  } {
    return {
      cacheSize: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

// Instancia única y global
export const cacheManager = new CacheManager()

/**
 * Hook para usar caché manager en componentes React
 */
export function useCacheManager() {
  return cacheManager
}
