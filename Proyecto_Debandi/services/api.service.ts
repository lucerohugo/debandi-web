/**
 * Servicio API con soporte para JWT Authentication
 * 
 * Características:
 * - Validación automática de JWT (formato xxx.yyy.zzz)
 * - Limpieza automática de JWTs inválidos
 * - Soporte para API Key (vendedor)
 * - Manejo de errores consistente
 */

import { buildApiUrl } from '@/lib/utils'

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

const JWT_REFRESH_KEY = 'jwtRefreshToken'

/**
 * Códigos que el backend devuelve cuando el cliente (cli_acti=False) o el
 * vendedor que lo está suplantando (ven_actv=0) fueron dados de baja
 * después de haber iniciado sesión. El JWT sigue siendo válido, así que
 * hay que cortar la sesión del lado del cliente ni bien se detecta.
 */
const SESION_BLOQUEADA_CODES = new Set(['CLIENTE_INACTIVO', 'VENDEDOR_INACTIVO'])

/**
 * Limpia toda la sesión guardada y fuerza una recarga completa hacia el
 * inicio, para que el usuario quede deslogueado y vea el flujo de login
 * de nuevo (equivalente a logout() de AuthContext, pero utilizable desde
 * este módulo que no es un componente React).
 */
const forzarLogoutPorSesionBloqueada = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('auth_user')
  localStorage.removeItem('impersonation_state')
  // Si el bloqueo fue por VENDEDOR_INACTIVO, además de cortar la sesión del
  // cliente (arriba) hay que limpiar la sesión de vendedor: si no, al volver
  // a '/' el VendedorProvider la lee de localStorage y lo deja con
  // isVendedorSession=true pese a estar dado de baja.
  localStorage.removeItem('vendedor_session')
  localStorage.removeItem('vendedor_name')
  clearJWTToken()
  clearRefreshTokenValue()
  window.location.href = '/'
}

const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(JWT_REFRESH_KEY)
}

const setRefreshTokenValue = (token: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(JWT_REFRESH_KEY, token)
}

const clearRefreshTokenValue = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(JWT_REFRESH_KEY)
}

/**
 * true si el token no decodifica o vence dentro de `skewSeconds` (margen para
 * que no expire en el viaje de red hacia el backend)
 */
const isTokenExpired = (token: string, skewSeconds = 15): boolean => {
  const payload = decodeJWT(token)
  if (!payload || typeof payload.exp !== 'number') return true
  return Date.now() / 1000 >= payload.exp - skewSeconds
}

// Evita disparar varios refresh en paralelo si hay requests concurrentes
let refreshInFlight: Promise<string | null> | null = null

/**
 * Devuelve un access token vigente para usar en el request actual:
 * - Si no hay sesión, devuelve null.
 * - Si el access token todavía es válido, lo devuelve tal cual.
 * - Si venció (p.ej. usuario dejó la pestaña abierta más de 1h), lo renueva
 *   con el refresh token contra /token/refresh/. Si el refresh también
 *   falló o venció, limpia la sesión y devuelve null (el request sigue sin
 *   Authorization, como un usuario anónimo).
 */
const ensureValidAccessToken = async (): Promise<string | null> => {
  const token = getJWTToken()
  if (!token) return null
  if (!isTokenExpired(token)) return token

  const refresh = getRefreshToken()
  if (!refresh) {
    clearJWTToken()
    return null
  }

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(buildApiUrl(getApiUrl(), 'token/refresh/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        })

        if (!response.ok) {
          clearJWTToken()
          clearRefreshTokenValue()
          return null
        }

        const data = await response.json()
        if (!data.access) {
          clearJWTToken()
          clearRefreshTokenValue()
          return null
        }

        setJWTToken(data.access)
        return data.access as string
      } catch (error) {
        console.warn('[ApiService] No se pudo renovar el access token:', error)
        return null
      } finally {
        refreshInFlight = null
      }
    })()
  }

  return refreshInFlight
}

/**
 * Construir headers con JWT (renovándolo primero si venció) o API Key
 */
const getHeaders = async (additionalHeaders: Record<string, string> = {}): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  }

  const token = await ensureValidAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return headers
}

/**
 * Extraer un mensaje de error legible del cuerpo de la respuesta, junto con
 * el `code` opcional que manda el backend (p.ej. CLIENTE_INACTIVO).
 * Soporta el formato { error: "..." } usado por el backend, así como
 * { detail: "..." }, { message: "..." } y errores de campo de DRF.
 */
const parseErrorBody = async (response: Response): Promise<{ message: string; code?: string }> => {
  try {
    const data = await response.json()
    const code = data?.code

    if (typeof data === 'string') return { message: data, code }
    if (data?.error) return { message: data.error, code }
    if (data?.detail) return { message: data.detail, code }
    if (data?.message) return { message: data.message, code }

    const firstKey = Object.keys(data || {})[0]
    if (firstKey) {
      const value = data[firstKey]
      if (Array.isArray(value)) return { message: value[0], code }
      if (typeof value === 'string') return { message: value, code }
    }

    return { message: `Error: ${response.status}`, code }
  } catch {
    // El cuerpo no era JSON o estaba vacío
    return { message: `Error: ${response.status}` }
  }
}

/**
 * Parsea el error de una respuesta no-ok y, si el backend indica que la
 * sesión quedó bloqueada (cliente o vendedor dado de baja), corta la
 * sesión y redirige antes de lanzar el error.
 */
const throwForErrorResponse = async (response: Response): Promise<never> => {
  const { message, code } = await parseErrorBody(response)

  if (code && SESION_BLOQUEADA_CODES.has(code)) {
    forzarLogoutPorSesionBloqueada()
    // La sesión ya se cortó y `window.location.href` está navegando a '/'.
    // Esa navegación no interrumpe la ejecución de JS en el acto, así que si
    // devolviéramos un error normal el componente que llamó (loadClientes,
    // etc.) llegaría a mostrarlo un instante antes de que la página termine
    // de recargar. Colgamos la promesa en cambio: nadie debe ver ningún
    // mensaje, solo la salida silenciosa.
    return new Promise<never>(() => {})
  }

  throw new Error(message)
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

  static setRefreshToken(token: string): void {
    setRefreshTokenValue(token)
  }

  static clearToken(): void {
    clearJWTToken()
    clearRefreshTokenValue()
  }

  static async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(buildApiUrl(getApiUrl(), endpoint), {
      credentials: 'include',
      headers: await getHeaders(),
    })

    if (!response.ok) await throwForErrorResponse(response)
    return response.json()
  }

  static async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(buildApiUrl(getApiUrl(), endpoint), {
      method: 'POST',
      credentials: 'include',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) await throwForErrorResponse(response)
    return response.json()
  }

  static async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(buildApiUrl(getApiUrl(), endpoint), {
      method: 'PUT',
      credentials: 'include',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) await throwForErrorResponse(response)
    return response.json()
  }

  static async patch<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(buildApiUrl(getApiUrl(), endpoint), {
      method: 'PATCH',
      credentials: 'include',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) await throwForErrorResponse(response)
    return response.json()
  }

  static async delete<T>(endpoint: string, data?: any): Promise<T> {
    const fetchOptions: RequestInit = {
      method: 'DELETE',
      credentials: 'include',
      headers: await getHeaders(),
    }

    if (data) {
      fetchOptions.body = JSON.stringify(data)
    }

    const response = await fetch(buildApiUrl(getApiUrl(), endpoint), fetchOptions)

    if (!response.ok) await throwForErrorResponse(response)
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
