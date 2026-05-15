/**
 * Servicio API con soporte para JWT Authentication
 * 
 * Características:
 * - Validación automática de JWT (formato xxx.yyy.zzz)
 * - Limpieza automática de JWTs inválidos
 * - Soporte para API Key (vendedor)
 * - Manejo de errores consistente
 */

const getApiUrl = (): string => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
  }
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  return envUrl || 'http://localhost:8000/api'
}

/**
 * Validar que el JWT tenga formato válido (xxx.yyy.zzz)
 */
const isValidJWTFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  return parts.length === 3 && parts.every(part => part.length > 0)
}

/**
 * Obtener JWT token - Con auto-cleanup de inválidos
 */
const getJWTToken = (): string | null => {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('jwtToken')
  
  if (token && !isValidJWTFormat(token)) {
    console.warn('[ApiService] ⚠️ JWT inválido, limpiando...')
    localStorage.removeItem('jwtToken')
    return null
  }
  
  return token
}

/**
 * Guardar JWT con validación
 */
const setJWTToken = (token: string): void => {
  if (typeof window === 'undefined') return
  if (!isValidJWTFormat(token)) {
    console.error('[ApiService] ❌ JWT inválido')
    return
  }
  localStorage.setItem('jwtToken', token)
}

const clearJWTToken = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('jwtToken')
}

/**
 * Construir headers con JWT o API Key
 */
const getHeaders = (additionalHeaders: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  }
  
  const token = getJWTToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

/**
 * Decodificar JWT sin validar firma (solo para leer payload)
 * Retorna el payload decodificado o null si es inválido
 */
const decodeJWT = (token?: string | null): Record<string, any> | null => {
  try {
    const jwtToken = token || getJWTToken()
    if (!jwtToken || !isValidJWTFormat(jwtToken)) return null
    
    const parts = jwtToken.split('.')
    const decoded = JSON.parse(atob(parts[1]))
    return decoded
  } catch (error) {
    console.error('[ApiService] Error decodificando JWT:', error)
    return null
  }
}

/**
 * Obtener información del vendedor suplantante desde el JWT
 */
const getVendedorSuplantante = (): { ven_codi: number; ven_nomb?: string } | null => {
  const payload = decodeJWT()
  if (!payload || !payload.vendedor_suplantante) return null
  
  return {
    ven_codi: payload.vendedor_suplantante,
    ven_nomb: localStorage.getItem('vendedor_name') || undefined
  }
}

export class ApiService {
  static setToken(token: string): void {
    setJWTToken(token)
  }

  static clearToken(): void {
    clearJWTToken()
  }

  static async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${getApiUrl()}${endpoint}`, {
      credentials: 'include',
      headers: getHeaders(),
    })
    
    if (!response.ok) throw new Error(`Error: ${response.status}`)
    return response.json()
  }

  static async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${getApiUrl()}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    
    if (!response.ok) throw new Error(`Error: ${response.status}`)
    return response.json()
  }

  static async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${getApiUrl()}${endpoint}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    
    if (!response.ok) throw new Error(`Error: ${response.status}`)
    return response.json()
  }

  static async patch<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${getApiUrl()}${endpoint}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    
    if (!response.ok) throw new Error(`Error: ${response.status}`)
    return response.json()
  }

  static async delete<T>(endpoint: string, data?: any): Promise<T> {
    const fetchOptions: RequestInit = {
      method: 'DELETE',
      credentials: 'include',
      headers: getHeaders(),
    }
    
    if (data) {
      fetchOptions.body = JSON.stringify(data)
    }
    
    const response = await fetch(`${getApiUrl()}${endpoint}`, fetchOptions)
    
    if (!response.ok) throw new Error(`Error: ${response.status}`)
    return response.json()
  }

  /**
   * Decodificar JWT sin validar firma
   */
  static decodeJWT(token?: string | null): Record<string, any> | null {
    return decodeJWT(token)
  }

  /**
   * Obtener información del vendedor suplantante desde el JWT
   */
  static getVendedorSuplantante(): { ven_codi: number; ven_nomb?: string } | null {
    return getVendedorSuplantante()
  }
}
