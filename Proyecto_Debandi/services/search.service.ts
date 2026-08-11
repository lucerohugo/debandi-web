import { ApiService } from './api.service'

interface SearchResult {
  art_codi: number
  art_nomb: string
  art_desc: string
  art_pnet: number
  art_pfin: number
  art_stk: number
  art_img_url?: string
  art_img1_url?: string
  mar_nomb?: string
  art_acti?: boolean
}

interface SearchResponse {
  count: number
  next: string | null
  previous: string | null
  results: SearchResult[]
}

/**
 * Servicio de búsqueda de artículos
 * Usa el backend para filtrar resultados (más eficiente que traer todos los productos)
 */
export class SearchService {
  /**
   * Buscar artículos por nombre, código o marca
   * @param query - Texto a buscar
   * @param pageSize - Cantidad de resultados (default: 10)
   * @returns Resultados de búsqueda
   */
  static async searchArticulos(query: string, pageSize: number = 10): Promise<SearchResult[]> {
    try {
      if (!query || query.trim().length === 0) {
        return []
      }

      const response = await ApiService.get<SearchResponse>(
        `/articulos/?search=${encodeURIComponent(query)}&page_size=${pageSize}`
      )

      // DRF devuelve {count, next, previous, results}
      if (response && response.results) {
        return response.results
      }

      // Fallback si viene directamente
      return Array.isArray(response) ? response : []
    } catch (error) {
      console.error('Error en búsqueda:', error)
      return []
    }
  }

  /**
   * Obtener artículos del carrusel (art_carru = true)
   * @returns Artículos marcados para carrusel
   */
  static async getCarouselArticulos(): Promise<SearchResult[]> {
    try {
      const response = await ApiService.get<SearchResponse>('/articulos/carrusel/')

      // DRF devuelve {count, next, previous, results}
      if (response && response.results) {
        return response.results
      }

      // Fallback si viene directamente
      return Array.isArray(response) ? response : []
    } catch (error) {
      console.error('Error al cargar carrusel:', error)
      return []
    }
  }

  /**
   * Obtener artículos paginados (para listado)
   * @param page - Número de página (default: 1)
   * @param pageSize - Items por página (default: 15)
   * @returns Response con count, next, previous, results
   */
  static async getArticulosPaginados(page: number = 1, pageSize: number = 15): Promise<SearchResponse> {
    try {
      const response = await ApiService.get<SearchResponse>(
        `/articulos/?page=${page}&page_size=${pageSize}`
      )

      return response || { count: 0, next: null, previous: null, results: [] }
    } catch (error) {
      console.error('Error al cargar artículos paginados:', error)
      return { count: 0, next: null, previous: null, results: [] }
    }
  }

  /**
   * Buscar artículos paginados (trae todos los resultados con paginación)
   * Útil para búsquedas donde necesitas todos los resultados con navegación
   * @param query - Texto a buscar
   * @param page - Número de página (default: 1)
   * @param pageSize - Items por página (default: 15)
   * @returns Response con count, next, previous, results
   */
  static async searchArticulosPaginados(
    query: string,
    page: number = 1,
    pageSize: number = 15
  ): Promise<SearchResponse> {
    try {
      if (!query || query.trim().length === 0) {
        return { count: 0, next: null, previous: null, results: [] }
      }

      const response = await ApiService.get<SearchResponse>(
        `/articulos/?search=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`
      )

      return response || { count: 0, next: null, previous: null, results: [] }
    } catch (error) {
      console.error('Error en búsqueda paginada:', error)
      return { count: 0, next: null, previous: null, results: [] }
    }
  }

  /**
   * Obtener todos los artículos (para búsqueda local cuando se necesite)
   * ⚠️ DESHABILITADO por performance - usar getArticulosPaginados() en su lugar
   * @returns Array vacío (para evitar cargar 5000 registros)
   */
  static async getAllArticulos(): Promise<SearchResult[]> {
    console.warn('⚠️ getAllArticulos está deshabilitado por performance. Usa getArticulosPaginados() o searchArticulos() en su lugar')
    return []
  }
}
