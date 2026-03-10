/**
 * Utilidades de seguridad para la aplicación
 */

/**
 * Sanitiza strings para prevenir XSS básico
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

/**
 * Valida que un email tenga formato correcto
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Genera un CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Valida fortaleza de contraseña
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("La contraseña debe tener al menos 8 caracteres")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una mayúscula")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("La contraseña debe contener al menos una minúscula")
  }

  if (!/[0-9]/.test(password)) {
    errors.push("La contraseña debe contener al menos un número")
  }

  // Opcional: caracteres especiales
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Recomendado: agregar caracteres especiales (!@#$%...)")
  }

  return {
    isValid: errors.length === 0 || errors.length === 1 && errors[0].includes("Recomendado"),
    errors,
  }
}

/**
 * Lista de contraseñas comunes prohibidas
 */
const COMMON_PASSWORDS = [
  "password",
  "123456",
  "12345678",
  "qwerty",
  "abc123",
  "monkey",
  "1234567",
  "letmein",
  "trustno1",
  "dragon",
  "baseball",
  "111111",
  "iloveyou",
  "master",
  "sunshine",
  "ashley",
  "bailey",
  "passw0rd",
  "shadow",
  "123123",
  "654321",
  "superman",
  "qazwsx",
  "michael",
  "football",
]

/**
 * Verifica si la contraseña es demasiado común
 */
export function isCommonPassword(password: string): boolean {
  const lowerPassword = password.toLowerCase()
  return COMMON_PASSWORDS.some((common) => lowerPassword.includes(common))
}

/**
 * Headers de seguridad recomendados
 */
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
} as const

/**
 * Aplica headers de seguridad a una respuesta
 */
export function applySecurityHeaders(headers: Headers): Headers {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value)
  })
  return headers
}

/**
 * Ofusca información sensible en logs
 */
export function obfuscateSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ["password", "passwordHash", "token", "secret", "apiKey"]
  const obfuscated = { ...data }

  sensitiveFields.forEach((field) => {
    if (field in obfuscated) {
      obfuscated[field] = "***REDACTED***"
    }
  })

  return obfuscated
}

/**
 * Genera un ID único seguro
 */
export function generateSecureId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}
