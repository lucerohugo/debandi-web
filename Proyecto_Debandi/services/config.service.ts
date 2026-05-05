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
  /**
   * Obtener configuración de paginación con valores por defecto
   */
  async getPaginationConfig(): Promise<PaginationConfig> {
    return {
      default_limit: 20,
      max_limit: 5000,
      items_per_page: 12,
      max_items_per_page: 100,
    }
  }

  /**
   * Obtener configuración completa con valores por defecto
   */
  async getConfig(): Promise<AppConfig> {
    return {
      pagination: await this.getPaginationConfig(),
      password_policy: {
        min_length: 8,
        require_uppercase: true,
        require_lowercase: true,
        require_numbers: true,
        require_special: false,
        messages: {
          min_length: 'Mínimo 8 caracteres',
          require_uppercase: 'Debe incluir mayúsculas',
          require_lowercase: 'Debe incluir minúsculas',
          require_numbers: 'Debe incluir números',
          require_special: 'Debe incluir caracteres especiales',
        },
      },
      export_config: {
        pdf: {
          columns: ['art_codi', 'art_nomb', 'mar_nomb', 'art_pfin', 'art_stk'],
          column_widths: [15, 40, 20, 15, 15],
          orientation: 'landscape',
          format: 'a4',
          margin: 10,
        },
        excel: {
          columns: ['art_codi', 'art_nomb', 'mar_nomb', 'art_pfin', 'art_stk'],
          column_widths: [15, 40, 20, 15, 15],
        },
      },
      rate_limits: {
        login: { max_attempts: 5, window_ms: 900000, message: 'Demasiados intentos' },
        register: { max_attempts: 3, window_ms: 3600000, message: 'Demasiados registros' },
        api: { requests: 100, window_ms: 60000, message: 'Límite de rate limit' },
      },
      validation_rules: {
        email: {
          required: true,
          pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
          message: 'Email inválido',
        },
        search_min_length: 2,
        max_search_results: 500,
      },
    }
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
}

export const ConfigService = new ConfigServiceClass()
