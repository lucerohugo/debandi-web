/**
 * Servicio API minimalista
 * Solo fetch + return, sin transformaciones
 */

const getApiUrl = (): string => {
  // Usar variable de entorno o fallback a localhost en desarrollo
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
  }
  return process.env.NEXT_PUBLIC_API_URL || 
    (window.location.origin.includes('localhost')
      ? 'http://localhost:8000/api'
      : `${window.location.origin}/api`)
}

export class ApiService {
  /**
   * GET request genérico con autenticación
   */
  static async get<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${getApiUrl()}${endpoint}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error(`Error: ${response.status}`)
      return response.json()
    } catch (error) {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      // Si la respuesta no es ok, lanzar error
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Error: ${response.status}`)
      }
      
      // Intentar parsear JSON, pero manejar si falla
      try {
        return await response.json()
      } catch (e) {
        // Si falla el JSON, retornar un objeto vacío
        return {} as T
      }
    } catch (error) {
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
        headers: {
          'Content-Type': 'application/json',
        },
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
  static async delete<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${getApiUrl()}${endpoint}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) throw new Error(`Error: ${response.status}`)
      return response.json()
    } catch (error) {
      throw error
    }
  }
}
