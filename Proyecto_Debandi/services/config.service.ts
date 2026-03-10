import { ApiService } from './api.service'

export interface PaginationConfig {
  default_limit: number
  max_limit: number
  items_per_page: number
  max_items_per_page: number
}

export interface PasswordPolicy {
  min_length: number
  require_uppercase: boolean
  require_lowercase: boolean
  require_numbers: boolean
  require_special: boolean
  messages: {
    min_length: string
    require_uppercase: string
    require_lowercase: string
    require_numbers: string
    require_special: string
  }
}

export interface ExportConfig {
  pdf: {
    columns: string[]
    column_widths: number[]
    orientation: string
    format: string
    margin: number
  }
  excel: {
    columns: string[]
    column_widths: number[]
  }
}

export interface RateLimitConfig {
  login: {
    max_attempts: number
    window_ms: number
    message: string
  }
  register: {
    max_attempts: number
    window_ms: number
    message: string
  }
  api: {
    requests: number
    window_ms: number
    message: string
  }
}

export interface ValidationRules {
  email: {
    required: boolean
    pattern: string
    message: string
  }
  search_min_length: number
  max_search_results: number
}

export interface AppConfig {
  pagination: PaginationConfig
  password_policy: PasswordPolicy
  export_config: ExportConfig
  rate_limits: RateLimitConfig
  validation_rules: ValidationRules
}

class ConfigServiceClass {
  private cachedConfig: AppConfig | null = null
  private cacheTimestamp: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

  /**
   * Obtener configuración centralizada de la aplicación
   * Utiliza caché para evitar solicitudes frecuentes
   */
  async getConfig(): Promise<AppConfig> {
    const now = Date.now()
    
    // Retornar caché si aún es válido
    if (this.cachedConfig && now - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.cachedConfig
    }

    try {
      const config = await ApiService.get<AppConfig>('/config/')
      this.cachedConfig = config
      this.cacheTimestamp = now
      return config
    } catch (error) {
      throw error
    }
  }

  /**
   * Obtener configuración de paginación
   */
  async getPaginationConfig(): Promise<PaginationConfig> {
    const config = await this.getConfig()
    return config.pagination
  }

  /**
   * Obtener políticas de contraseña
   */
  async getPasswordPolicy(): Promise<PasswordPolicy> {
    const config = await this.getConfig()
    return config.password_policy
  }

  /**
   * Obtener configuración de exportación
   */
  async getExportConfig(): Promise<ExportConfig> {
    const config = await this.getConfig()
    return config.export_config
  }

  /**
   * Obtener límites de rate limiting
   */
  async getRateLimits(): Promise<RateLimitConfig> {
    const config = await this.getConfig()
    return config.rate_limits
  }

  /**
   * Obtener reglas de validación
   */
  async getValidationRules(): Promise<ValidationRules> {
    const config = await this.getConfig()
    return config.validation_rules
  }

  /**
   * Limpiar caché (útil cuando se actualizan configuraciones)
   */
  clearCache(): void {
    this.cachedConfig = null
    this.cacheTimestamp = 0
  }
}

export const ConfigService = new ConfigServiceClass()
