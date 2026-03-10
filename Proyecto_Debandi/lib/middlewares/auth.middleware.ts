import { NextRequest, NextResponse } from "next/server"

/**
 * Middleware para verificar autenticación
 * El token se valida en el backend Django, aquí solo extraemos y pasamos el token
 */
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, userId: number) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const token = extractToken(request)
    
    if (!token) {
      return NextResponse.json(
        { error: "No autenticado. Token no proporcionado." },
        { status: 401 }
      )
    }

    // El token será validado por el backend Django
    // Aquí solo lo pasamos en el handler
    return await handler(request, 0) // userId se obtiene del backend
  } catch (error) {
    return NextResponse.json(
      { error: "Error de autenticación" },
      { status: 500 }
    )
  }
}

/**
 * Middleware para verificar que el usuario sea administrador
 * La validación se hace en el backend Django
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: (request: NextRequest, userId: number) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const token = extractToken(request)
    
    if (!token) {
      return NextResponse.json(
        { error: "No autenticado. Token no proporcionado." },
        { status: 401 }
      )
    }

    // La validación de admin se realiza en el backend Django
    return await handler(request, 0) // userId se obtiene del backend
  } catch (error) {
    return NextResponse.json(
      { error: "Error de autenticación" },
      { status: 500 }
    )
  }
}

function extractToken(request: NextRequest): string | null {
  let token = request.cookies.get("auth-token")?.value

  if (!token) {
    const authHeader = request.headers.get("Authorization")
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7)
    }
  }

  return token || null
}

export function getCurrentUserFromRequest(request: NextRequest) {
  return {
    // @ts-ignore
    userId: request.userId as number,
    // @ts-ignore
    email: request.userEmail as string,
    // @ts-ignore
    isAdmin: request.isAdmin as boolean,
  }
}
