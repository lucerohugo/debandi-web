/**
 * Servicio API minimalista
 * Solo fetch + return, sin transformaciones
 * Con soporte para JWT Authentication
 */

const getApiUrl = (): string => {
  // Usar variable de entorno o fallback a localhost en desarrollo
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
  }
  
  const envUrl = process.env.NEXT_PUBLIC_API_URL
  if (envUrl) {
    console.log('API URL from env:', envUrl)
    return envUrl
  }
  
  // En desarrollo local, usar localhost:8000
  const url = 'http://localhost:8000/api'
  console.log('API URL (default):', url)
  return url
}

/**
 * Obtener JWT token del localStorage
 */
const getJWTToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('jwtToken')
}

/**
 * Guardar JWT token en localStorage
 */
const setJWTToken = (token: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem('jwtToken', token)
}

/**
 * Limpiar JWT token de localStorage
 */
const clearJWTToken = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('jwtToken')
}

/**
 * Construir headers con JWT si disponible
 */
const getHeaders = (additionalHeaders: Record<string, string> = {}): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  }
  
  const token = getJWTToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    console.log('[ApiService] ✅ JWT agregado al header:', token.substring(0, 20) + '...')
  } else {
    console.warn('[ApiService] ⚠️ NO HAY JWT EN LOCALSTORAGE - Solicitud sin autenticación')
  }
  
  return headers
}

export class ApiService {
  /**
   * Guardar JWT token (usado después de login)
   */
  static setToken(token: string): void {
    setJWTToken(token)
  }

  /**
   * Limpiar JWT token (usado en logout)
   */
  static clearToken(): void {
    clearJWTToken()
  }

  /**
   * GET request genérico
   */
  static async get<T>(endpoint: string): Promise<T> {
    const url = `${getApiUrl()}${endpoint}`
    console.log('Fetching:', url)
    
    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: getHeaders(),
      })
      
      console.log(`Response status: ${response.status}`)
      const contentType = response.headers.get('content-type')
      console.log(`Content-Type: ${contentType}`)
      
      if (!response.ok) {
        console.error(`API Error ${response.status}:`, endpoint)
        throw new Error(`Error: ${response.status}`)
      }
      
      if (!contentType?.includes('application/json')) {
        console.warn('Non-JSON response:', contentType)
        return {} as T
      }
      
      const data = await response.json()
      console.log('Response data:', data)
      return data
    } catch (error) {
      console.error('Fetch failed:', error)
      throw error
    }
  }

  /**
   * POST request genérico
   */
  static async post<T>(endpoint: string, data: any): Promise<T> {
    try {
      const response = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: getHeaders(),
        body: JSON.stringify(data),
      })
      
      // Manejar respuesta
      const contentType = response.headers.get('content-type')
      
      if (!response.ok) {
        try {
          const errorData = contentType?.includes('application/json') 
            ? await response.json() 
            : { error: `Error: ${response.status}` }
          throw new Error(errorData.error || JSON.stringify(errorData) || `Error: ${response.status}`)
        } catch (e) {
          throw new Error(`Error HTTP ${response.status}`)
        }
      }
      
      // Intentar parsear JSON
      if (!contentType?.includes('application/json')) {
        return {} as T
      }
      
      return await response.json()
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  }

  /**
   * PUT request genérico
   */
  static async put<T>(endpoint: string, data: any): Promise<T> {
    try {
      const response = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'PUT',
        credentials: 'include',
        headers: getHeaders(),
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error(`Error: ${response.status}`)
      return response.json()
    } catch (error) {
      throw error
    }
  }

  /**
   * PATCH request genérico (actualización parcial)
   */
  static async patch<T>(endpoint: string, data: any): Promise<T> {
    try {
      const response = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: getHeaders(),
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error(`Error: ${response.status}`)
      return response.json()
    } catch (error) {
      throw error
    }
  }

  /**
   * DELETE request genérico
   */
  static async delete<T>(endpoint: string, _unused?: any, data?: any): Promise<T> {
    try {
      const options: RequestInit = {
        method: 'DELETE',
        credentials: 'include',
        headers: getHeaders(),
      }
      
      // Si hay datos, agregarlos al body (para casos como favoritos-manage)
      if (data) {
        options.body = JSON.stringify(data)
      }
      
      const response = await fetch(`${getApiUrl()}${endpoint}`, options)
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        try {
          const errorData = contentType?.includes('application/json') 
            ? await response.json() 
            : { error: `Error: ${response.status}` }
          throw new Error(errorData.error || JSON.stringify(errorData) || `Error: ${response.status}`)
        } catch (e) {
          throw new Error(`Error HTTP ${response.status}`)
        }
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        return {} as T
      }
      
      return await response.json()
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  }
}
