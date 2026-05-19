import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Construir URL normalizada sin doble slash
 * Elimina el trailing slash del baseUrl y agrega un leading slash al endpoint
 * 
 * @param baseUrl - URL base (puede terminar con / o sin)
 * @param endpoint - Endpoint (puede empezar con / o sin)
 * @returns URL normalizada sin dobles slashes
 * 
 * @example
 * buildApiUrl('http://localhost:8000/api/', '/cliente-login/')
 * // => 'http://localhost:8000/api/cliente-login/'
 * 
 * buildApiUrl('http://localhost:8000/api', 'cliente-login/')
 * // => 'http://localhost:8000/api/cliente-login/'
 */
export function buildApiUrl(baseUrl: string, endpoint: string): string {
  // Remover trailing slash de baseUrl
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  
  // Asegurar que endpoint tenga un solo slash inicial
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  
  return `${cleanBase}${cleanEndpoint}`
}
