/**
 * Tipos de error personalizados para la aplicación
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = "AppError"
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors?: unknown) {
    super(message, 400, "VALIDATION_ERROR")
    this.name = "ValidationError"
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "No autenticado") {
    super(message, 401, "AUTHENTICATION_ERROR")
    this.name = "AuthenticationError"
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "No autorizado") {
    super(message, 403, "AUTHORIZATION_ERROR")
    this.name = "AuthorizationError"
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Recurso") {
    super(`${resource} no encontrado`, 404, "NOT_FOUND")
    this.name = "NotFoundError"
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT")
    this.name = "ConflictError"
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Demasiadas peticiones", public resetTime?: number) {
    super(message, 429, "RATE_LIMIT_EXCEEDED")
    this.name = "RateLimitError"
  }
}
