import { buildApiUrl } from "@/lib/utils"

export interface Articulo {
  art_codi: number
  art_nomb: string
  art_img?: string
  art_pfin?: number
  art_stk?: number
  mar_codi?: number | {
    mar_nomb: string
  }
  mar_nomb?: string
}

interface ArticulosResponse {
  results: Articulo[]
  count: number
  next: string | null
  previous: string | null
}

export class ArticulosImagesService {
  /**
   * Obtener URL base de la API
   * En local (localhost:3000): intenta primero localhost:8000/api
   * En producción: usa NEXT_PUBLIC_API_URL
   */
  private static getBaseUrl(): string {
    if (typeof window !== "undefined") {
      // En cliente, detectar si estamos en localhost
      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      
      if (isLocalhost) {
        // En local: preferir localhost:8000
        return "http://localhost:8000/api"
      }
    }
    
    // En producción o en servidor: usar variable de entorno
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
    return apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl
  }

  /**
   * Obtener lista de artículos con búsqueda y paginación
   */
  static async getArticulos(
    search: string = "",
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    articulos: Articulo[]
    total: number
    totalPages: number
    currentPage: number
  }> {
    try {
      const baseUrl = this.getBaseUrl()
      let url = `${baseUrl}/articulos/?page=${page}&page_size=${pageSize}`

      if (search) {
        // Buscar en art_codi y art_nomb
        url += `&search=${encodeURIComponent(search)}`
      }

      console.log("[ArticulosImagesService] Fetching URL:", url) // Debug

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }))
        const errorMsg = `Error ${response.status}: ${errorData.detail || response.statusText}`
        console.error("[ArticulosImagesService] API Error:", errorMsg)
        throw new Error(errorMsg)
      }

      const data: ArticulosResponse = await response.json()

      return {
        articulos: data.results,
        total: data.count,
        totalPages: Math.ceil(data.count / pageSize),
        currentPage: page,
      }
    } catch (error) {
      console.error("[ArticulosImagesService] Error fetching artículos:", error)
      throw error
    }
  }

  /**
   * Obtener un artículo específico
   */
  static async getArticulo(art_codi: number): Promise<Articulo> {
    try {
      const baseUrl = this.getBaseUrl()
      const url = `${baseUrl}/articulos/${art_codi}/`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error al obtener artículo:", error)
      throw error
    }
  }

  /**
   * Cargar/actualizar imagen de un artículo
   */
  static async uploadImagenArticulo(
    art_codi: number,
    file: File
  ): Promise<Articulo> {
    try {
      const baseUrl = this.getBaseUrl()
      const url = `${baseUrl}/articulos/${art_codi}/`

      const formData = new FormData()
      formData.append("art_img", file)

      const response = await fetch(url, {
        method: "PATCH",
        body: formData,
        // No configurar Content-Type, el navegador lo hará automáticamente
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.detail || `Error ${response.status}: ${response.statusText}`
        )
      }

      return await response.json()
    } catch (error) {
      console.error("Error al cargar imagen:", error)
      throw error
    }
  }

  /**
   * Eliminar imagen de un artículo
   */
  static async deleteImagenArticulo(art_codi: number): Promise<Articulo> {
    try {
      const baseUrl = this.getBaseUrl()
      const url = `${baseUrl}/articulos/${art_codi}/`

      const formData = new FormData()
      formData.append("art_img", "") // Enviar campo vacío para eliminar

      const response = await fetch(url, {
        method: "PATCH",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.detail || `Error ${response.status}: ${response.statusText}`
        )
      }

      return await response.json()
    } catch (error) {
      console.error("Error al eliminar imagen:", error)
      throw error
    }
  }
}

