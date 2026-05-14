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

  static async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${getApiUrl()}${endpoint}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getHeaders(),
    })
    
    if (!response.ok) throw new Error(`Error: ${response.status}`)
    return response.json()
  }
}
