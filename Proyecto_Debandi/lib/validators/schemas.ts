import { z } from "zod"
import { ConfigService } from "@/services/config.service"

/**
 * Schema de validación para login
 */
export const loginSchema = z.object({
  email: z
    .string({
      required_error: "El email es requerido",
    })
    .email("Email inválido")
    .toLowerCase()
    .trim(),
  password: z
    .string({
      required_error: "La contraseña es requerida",
    })
    .min(1, "La contraseña no puede estar vacía"),
})

/**
 * Schema dinámico de validación para registro
 * Se construye basado en las políticas del backend
 */
export async function createRegisterSchema() {
  try {
    const policy = await ConfigService.getPasswordPolicy()
    
    let passwordSchema = z
      .string({
        required_error: "La contraseña es requerida",
      })
      .min(policy.min_length, policy.messages.min_length)
    
    if (policy.require_uppercase) {
      passwordSchema = passwordSchema.regex(
        /[A-Z]/,
        policy.messages.require_uppercase
      )
    }
    
    if (policy.require_lowercase) {
      passwordSchema = passwordSchema.regex(
        /[a-z]/,
        policy.messages.require_lowercase
      )
    }
    
    if (policy.require_numbers) {
      passwordSchema = passwordSchema.regex(
        /[0-9]/,
        policy.messages.require_numbers
      )
    }
    
    if (policy.require_special) {
      passwordSchema = passwordSchema.regex(
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
        policy.messages.require_special
      )
    }
    
    return z.object({
      email: z
        .string({
          required_error: "El email es requerido",
        })
        .email("Email inválido")
        .toLowerCase()
        .trim(),
      password: passwordSchema,
      firstName: z
        .string()
        .trim()
        .optional(),
      lastName: z
        .string()
        .trim()
        .optional(),
    })
  } catch (error) {
    // Schema por defecto si no se puede obtener configuración
    return defaultRegisterSchema()
  }
}

/**
 * Schema de registro por defecto
 */
export function defaultRegisterSchema() {
  return z.object({
    email: z
      .string({
        required_error: "El email es requerido",
      })
      .email("Email inválido")
      .toLowerCase()
      .trim(),
    password: z
      .string({
        required_error: "La contraseña es requerida",
      })
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "La contraseña debe contener al menos una mayúscula")
      .regex(/[a-z]/, "La contraseña debe contener al menos una minúscula")
      .regex(/[0-9]/, "La contraseña debe contener al menos un número"),
    firstName: z
      .string()
      .trim()
      .optional(),
    lastName: z
      .string()
      .trim()
      .optional(),
  })
}

// Exportar schema por defecto para uso inmediato
export const registerSchema = defaultRegisterSchema()

/**
 * Schema de validación para productos
 */
export const productSchema = z.object({
  name: z
    .string({
      required_error: "El nombre es requerido",
    })
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(200, "El nombre no puede exceder 200 caracteres")
    .trim(),
  description: z
    .string({
      required_error: "La descripción es requerida",
    })
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(1000, "La descripción no puede exceder 1000 caracteres")
    .trim(),
  price: z
    .number({
      required_error: "El precio es requerido",
      invalid_type_error: "El precio debe ser un número",
    })
    .positive("El precio debe ser mayor a 0")
    .max(999999, "El precio es demasiado alto"),
  originalPrice: z
    .number()
    .positive("El precio original debe ser mayor a 0")
    .max(999999, "El precio original es demasiado alto")
    .optional(),
  category: z
    .string({
      required_error: "La categoría es requerida",
    })
    .min(2, "La categoría debe tener al menos 2 caracteres")
    .trim(),
  image: z
    .string({
      required_error: "La imagen es requerida",
    })
    .url("La URL de la imagen no es válida")
    .or(z.string().startsWith("/", "La ruta de la imagen debe comenzar con /")),
  stock: z
    .number({
      required_error: "El stock es requerido",
      invalid_type_error: "El stock debe ser un número",
    })
    .int("El stock debe ser un número entero")
    .nonnegative("El stock no puede ser negativo"),
  brand: z
    .string()
    .min(2, "La marca debe tener al menos 2 caracteres")
    .max(100, "La marca no puede exceder 100 caracteres")
    .trim()
    .optional(),
})

/**
 * Schema de validación para actualización de productos (todos los campos opcionales)
 */
export const updateProductSchema = productSchema.partial()

/**
 * Tipos TypeScript inferidos de los schemas
 */
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ProductInput = z.infer<typeof productSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>

/**
 * Helper para validar datos con un schema de Zod
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Formatear errores de Zod de manera legible
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }))
      
      throw {
        type: "VALIDATION_ERROR",
        errors: formattedErrors,
        message: "Errores de validación",
      }
    }
    throw error
  }
}
