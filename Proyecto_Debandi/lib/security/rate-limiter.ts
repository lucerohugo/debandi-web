/**
 * Rate Limiter - Protección contra ataques de fuerza bruta
 * 
 * NOTA: El rate limiting principal debe implementarse en el backend.
 * Este módulo se usa para feedback local del cliente.
 * El backend debe retornar encabezados HTTP: Retry-After, X-RateLimit-*
 */

import { ConfigService } from '@/services/config.service'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

export class RateLimiter {
  private store: RateLimitStore = {}
  private maxAttempts: number
  private windowMs: number

  /**
   * @param maxAttempts - Número máximo de intentos permitidos
   * @param windowMs - Ventana de tiempo en milisegundos
   */
  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs

    // Limpiar registros antiguos cada 5 minutos
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  /**
   * Verifica si una IP ha excedido el límite de intentos
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now()
    const record = this.store[identifier]

    if (!record) {
      return false
    }

    // Si el tiempo de reseteo ha pasado, resetear el contador
    if (now > record.resetTime) {
      delete this.store[identifier]
      return false
    }

    return record.count >= this.maxAttempts
  }

  /**
   * Registra un intento para una IP
   */
  recordAttempt(identifier: string): void {
    const now = Date.now()
    const record = this.store[identifier]

    if (!record || now > record.resetTime) {
      // Nuevo registro o registro expirado
      this.store[identifier] = {
        count: 1,
        resetTime: now + this.windowMs,
      }
    } else {
      // Incrementar contador
      record.count++
    }
  }

  /**
   * Obtiene información sobre el estado del rate limit
   */
  getStatus(identifier: string): {
    isLimited: boolean
    attemptsRemaining: number
    resetTime: number | null
  } {
    const now = Date.now()
    const record = this.store[identifier]

    if (!record || now > record.resetTime) {
      return {
        isLimited: false,
        attemptsRemaining: this.maxAttempts,
        resetTime: null,
      }
    }

    return {
      isLimited: record.count >= this.maxAttempts,
      attemptsRemaining: Math.max(0, this.maxAttempts - record.count),
      resetTime: record.resetTime,
    }
  }

  /**
   * Resetea el contador para un identificador específico
   */
  reset(identifier: string): void {
    delete this.store[identifier]
  }

  /**
   * Limpia registros expirados
   */
  private cleanup(): void {
    const now = Date.now()
    Object.keys(this.store).forEach((key) => {
      if (now > this.store[key].resetTime) {
        delete this.store[key]
      }
    })
  }

  /**
   * Obtiene el número total de IPs registradas
   */
  getStoreSize(): number {
    return Object.keys(this.store).length
  }
}

/**
 * Factory para crear rate limiters dinámicamente desde configuración del backend
 */
export async function createRateLimiterFromConfig(type: 'login' | 'register' | 'api'): Promise<RateLimiter> {
  try {
    const rateLimits = await ConfigService.getRateLimits()
    const limits = rateLimits[type]
    return new RateLimiter(limits.max_attempts, limits.window_ms)
  } catch (error) {
    // Valores por defecto si la configuración no está disponible
    const defaults = {
      login: new RateLimiter(5, 15 * 60 * 1000),
      register: new RateLimiter(3, 60 * 60 * 1000),
      api: new RateLimiter(100, 60 * 1000),
    }
    return defaults[type]
  }
}

// Instancias globales - se inicializan con valores por defecto
// En producción, estas deberían obtenerse del backend
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000) // Fallback: 5 intentos en 15 minutos
export const registerRateLimiter = new RateLimiter(3, 60 * 60 * 1000) // Fallback: 3 intentos en 1 hora
export const apiRateLimiter = new RateLimiter(100, 60 * 1000) // Fallback: 100 requests por minuto

/**
 * Obtiene el identificador del cliente (IP o user agent como fallback)
 */
export function getClientIdentifier(request: Request): string {
  // Intentar obtener la IP real (considerando proxies/load balancers)
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  
  const ip = forwarded?.split(",")[0].trim() || 
             realIp || 
             "unknown"

  // Agregar user agent para más precisión
  const userAgent = request.headers.get("user-agent") || "unknown"
  
  return `${ip}-${hashString(userAgent)}`
}

/**
 * Hash simple para acortar el user agent
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}
