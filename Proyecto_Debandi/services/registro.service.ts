import { ApiService } from './api.service'

interface RegistroData {
  reg_nomb: string
  reg_doc: string
  reg_cuit: string
  reg_emai: string
  reg_celu: string
  reg_clav: string
}

class RegistroServiceClass {
  /**
   * POST /registros/ - Crear nuevo registro
   */
  async crearRegistro(data: RegistroData): Promise<any> {
    try {
      const response = await ApiService.post<any>('/registros/', data)
      return response
    } catch (error) {
      console.error('Error creando registro:', error)
      throw error
    }
  }

  /**
   * GET /registros/ - Listar registros (admin)
   */
  async listarRegistros(filtro?: { reg_clie?: boolean; search?: string; page?: number }): Promise<any> {
    try {
      let url = '/registros/'
      const params = []
      
      if (filtro?.reg_clie !== undefined) {
        params.push(`reg_clie=${filtro.reg_clie}`)
      }
      
      if (filtro?.search) {
        params.push(`search=${encodeURIComponent(filtro.search)}`)
      }
      
      if (filtro?.page) {
        params.push(`page=${filtro.page}`)
      }
      
      if (params.length > 0) {
        url += `?${params.join('&')}`
      }
      
      const response = await ApiService.get<any>(url)
      return response
    } catch (error) {
      console.error('Error listando registros:', error)
      throw error
    }
  }

  /**
   * GET /registros/{id}/ - Obtener registro
   */
  async obtenerRegistro(reg_codi: number): Promise<any> {
    try {
      const response = await ApiService.get<any>(`/registros/${reg_codi}/`)
      return response
    } catch (error) {
      console.error('Error obteniendo registro:', error)
      throw error
    }
  }

  /**
   * POST /registros/{id}/aprobar/ - Aprobar registro
   */
  async aprobarRegistro(reg_codi: number): Promise<any> {
    try {
      const response = await ApiService.post<any>(`/registros/${reg_codi}/aprobar/`, {})
      return response
    } catch (error) {
      console.error('Error aprobando registro:', error)
      throw error
    }
  }

  /**
   * POST /registros/{id}/rechazar/ - Rechazar registro
   */
  async rechazarRegistro(reg_codi: number): Promise<any> {
    try {
      const response = await ApiService.post<any>(`/registros/${reg_codi}/rechazar/`, {})
      return response
    } catch (error) {
      console.error('Error rechazando registro:', error)
      throw error
    }
  }
}

export const RegistroService = new RegistroServiceClass()
